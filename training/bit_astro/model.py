# trainer/bit_astro/model.py

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from .ternary import TernaryLinear

# -----------------------------
# Config
# -----------------------------

@dataclass
class BitAstroConfig:
    vocab_size: int
    block_size: int = 128      # max context length
    d_model: int = 128         # embedding / hidden dim
    n_layers: int = 2          # transformer blocks
    n_heads: int = 4           # attention heads
    d_mlp: int = 256           # MLP inner dim
    dropout: float = 0.15
    binarize_activations: bool = False  # start with False; enable later if you want
    use_ternary: bool = True
    tokenizer: str = "char"  # "char" | "bpe"


# -----------------------------
# Binarization utilities
# -----------------------------


def activation_quant(x: torch.Tensor) -> torch.Tensor:
    """
    BitNet b1.58 activation quantization:
    - Scale to [-127, 127] range (8-bit) or keep simple for now.
    - Original paper suggests 8-bit activations for b1.58.
    - Here we'll stick to simple sign() or identity for now as per original request,
      but the weights will be ternary.
    """
    return x

class BitNetWeightSTE(torch.autograd.Function):
    @staticmethod
    def forward(ctx, w: torch.Tensor) -> torch.Tensor:
        # 1. Compute gamma (mean absolute value)
        gamma = w.abs().mean().clamp(min=1e-5)
        
        # 2. Scale weights
        w_scaled = w / gamma
        
        # 3. Round to nearest integer {-1, 0, 1}
        w_quant = w_scaled.round().clamp(-1, 1)
        
        # 4. Rescale
        w_final = w_quant * gamma
        return w_final

    @staticmethod
    def backward(ctx, grad_output: torch.Tensor) -> torch.Tensor:
        # STE: pass gradient through
        return grad_output

def bitnet_weight_quant(w: torch.Tensor) -> torch.Tensor:
    return BitNetWeightSTE.apply(w)


# -----------------------------
# Rotary Positional Embeddings (RoPE)
# -----------------------------

class RotaryEmbedding(nn.Module):
    def __init__(self, dim, max_seq_len=2048):
        super().__init__()
        inv_freq = 1.0 / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        self.register_buffer("inv_freq", inv_freq)
        self.max_seq_len = max_seq_len
        self.cached_cos = None
        self.cached_sin = None

    def forward(self, x, seq_len=None):
        # x: [batch, seq_len, head_dim]
        if seq_len is None:
            seq_len = x.shape[1]
            
        if self.cached_cos is None or self.cached_cos.shape[0] < seq_len:
            t = torch.arange(seq_len, device=x.device, dtype=self.inv_freq.dtype)
            freqs = torch.einsum("i,j->ij", t, self.inv_freq)
            emb = torch.cat((freqs, freqs), dim=-1)
            self.cached_cos = emb.cos()[None, :, :]
            self.cached_sin = emb.sin()[None, :, :]
            
        return self.cached_cos[:, :seq_len, :], self.cached_sin[:, :seq_len, :]

def rotate_half(x):
    x1, x2 = x[..., :x.shape[-1]//2], x[..., x.shape[-1]//2:]
    return torch.cat((-x2, x1), dim=-1)

def apply_rotary_pos_emb(q, k, cos, sin):
    # q, k: [batch, seq_len, head_dim]
    return (q * cos) + (rotate_half(q) * sin), (k * cos) + (rotate_half(k) * sin)


# -----------------------------
# RMSNorm
# -----------------------------

class RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def _norm(self, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)

    def forward(self, x):
        output = self._norm(x.float()).type_as(x)
        return output * self.weight


# -----------------------------
# Binary Linear layer (Legacy / Fallback)
# -----------------------------

class BinaryLinear(nn.Module):
    """
    Linear layer with ternary weights {-1, 0, 1} (BitNet b1.58).
    
    Forward:
    W_quant = round(W / gamma).clamp(-1, 1) * gamma
    where gamma = mean(|W|)
    """

    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features

        self.weight = nn.Parameter(torch.empty(out_features, in_features))
        nn.init.kaiming_uniform_(self.weight, a=math.sqrt(5))

        if bias:
            self.bias = nn.Parameter(torch.zeros(out_features))
        else:
            self.bias = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Quantize weights to ternary {-1, 0, 1} * scale
        w_quant = bitnet_weight_quant(self.weight)
        return F.linear(x, w_quant, self.bias)


# -----------------------------
# Multi-head self-attention
# -----------------------------

class BinarySelfAttention(nn.Module):
    def __init__(self, config: BitAstroConfig):
        super().__init__()
        assert config.d_model % config.n_heads == 0, "d_model must be divisible by n_heads"

        self.d_model = config.d_model
        self.n_heads = config.n_heads
        self.head_dim = config.d_model // config.n_heads
        self.dropout = config.dropout

        self.dropout = config.dropout

        # Projections
        Linear = TernaryLinear if config.use_ternary else nn.Linear
        # Note: Original code used BinaryLinear, but we are moving to Ternary or standard Linear
        # If use_ternary is False, we default to nn.Linear for stability unless BinaryLinear is explicitly desired.
        # For now, let's assume use_ternary=True means TernaryLinear, else nn.Linear (float).
        
        self.q_proj = Linear(config.d_model, config.d_model, bias=False)
        self.k_proj = Linear(config.d_model, config.d_model, bias=False)
        self.v_proj = Linear(config.d_model, config.d_model, bias=False)
        self.o_proj = Linear(config.d_model, config.d_model, bias=False)

        self.attn_drop = nn.Dropout(config.dropout)
        self.resid_drop = nn.Dropout(config.dropout)
        
        self.rotary = RotaryEmbedding(self.head_dim)

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        B, T, C = x.size()

        # q, k, v projections
        q = self.q_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2) # (B, nh, T, hs)
        k = self.k_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2) # (B, nh, T, hs)
        v = self.v_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2) # (B, nh, T, hs)

        # Apply RoPE
        cos, sin = self.rotary(v, seq_len=T) # cos, sin: (1, T, hs)
        
        # Adjust dims for broadcasting: (1, 1, T, hs)
        cos = cos.unsqueeze(1)
        sin = sin.unsqueeze(1)
        
        q, k = apply_rotary_pos_emb(q, k, cos, sin)

        # Scaled dot-product attention
        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)  # (B, n_heads, T, T)

        if mask is not None:
            att = att.masked_fill(mask == 0, float("-inf"))

        att = F.softmax(att, dim=-1)
        att = self.attn_drop(att)

        y = att @ v  # (B, n_heads, T, head_dim)
        y = y.transpose(1, 2).contiguous().view(B, T, C)  # (B, T, C)
        y = self.o_proj(y)
        y = self.resid_drop(y)
        return y


# -----------------------------
# MLP block
# -----------------------------

class BinaryMLP(nn.Module):
    def __init__(self, config: BitAstroConfig):
        super().__init__()
        Linear = TernaryLinear if config.use_ternary else nn.Linear
        
        # SwiGLU needs 3 projections: gate, value, and output
        # Hidden dim is usually 4*d_model, or 8/3*d_model for SwiGLU efficiency
        hidden_dim = int(2 * config.d_model * 4 / 3) # standard Llama scaling
        hidden_dim = 256 if hidden_dim < 256 else hidden_dim # ensure minimum size
        
        self.w1 = Linear(config.d_model, hidden_dim, bias=False) # gate
        self.w3 = Linear(config.d_model, hidden_dim, bias=False) # value
        self.w2 = Linear(hidden_dim, config.d_model, bias=False) # output
        
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # SwiGLU: w2(F.silu(w1(x)) * w3(x))
        return self.w2(F.silu(self.w1(x)) * self.w3(x))


# -----------------------------
# Transformer block
# -----------------------------

class BinaryTransformerBlock(nn.Module):
    def __init__(self, config: BitAstroConfig):
        super().__init__()
        self.ln1 = RMSNorm(config.d_model)
        self.ln2 = RMSNorm(config.d_model)
        self.attn = BinarySelfAttention(config)
        self.mlp = BinaryMLP(config)

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        # Pre-norm: x = x + attn(ln(x))
        x = x + self.attn(self.ln1(x), mask=mask)
        x = x + self.mlp(self.ln2(x))
        return x


# -----------------------------
# BitAstroGPT model
# -----------------------------

class BitAstroGPT(nn.Module):
    """
    Tiny GPT-style model using binarized linear layers.

    This is a standard decoder-only Transformer language model:
    - Token + positional embeddings
    - N binary-attention blocks
    - Final LN + output head

    Forward returns (logits, loss) if targets is provided.
    """

    def __init__(self, config: BitAstroConfig):
        super().__init__()
        self.config = config

        self.token_emb = nn.Embedding(config.vocab_size, config.d_model)
        # self.pos_emb = nn.Embedding(config.block_size, config.d_model) # Removed for RoPE

        self.blocks = nn.ModuleList(
            [BinaryTransformerBlock(config) for _ in range(config.n_layers)]
        )
        self.ln_f = RMSNorm(config.d_model)

        # You can make this BinaryLinear as well, but keeping it float helps a bit in practice.
        self.lm_head = nn.Linear(config.d_model, config.vocab_size, bias=False)

        self.dropout = nn.Dropout(config.dropout)

        self.apply(self._init_weights)

    # -------------------------
    # Initialization
    # -------------------------

    def _init_weights(self, module: nn.Module) -> None:
        if isinstance(module, (nn.Linear, BinaryLinear)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if getattr(module, "bias", None) is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    # -------------------------
    # Forward
    # -------------------------

    def forward(
        self,
        idx: torch.Tensor,
        targets: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
        """
        idx: (B, T) token indices
        targets: (B, T) token indices (next token), optional
        """

        B, T = idx.shape
        assert T <= self.config.block_size, "Sequence length exceeds block_size"

        device = idx.device

        # Token + positional embeddings
        # pos = torch.arange(0, T, device=device).unsqueeze(0)  # (1, T)
        x = self.token_emb(idx) # + self.pos_emb(pos)           # (B, T, C)
        x = self.dropout(x)

        # Causal mask for self-attention (1, 1, T, T)
        mask = torch.tril(torch.ones(T, T, device=device, dtype=torch.bool))
        mask = mask.view(1, 1, T, T)

        # Transformer blocks
        for block in self.blocks:
            x = block(x, mask=mask)

        x = self.ln_f(x)
        logits = self.lm_head(x)  # (B, T, vocab_size)

        loss: Optional[torch.Tensor] = None
        if targets is not None:
            loss = F.cross_entropy(
                logits.view(-1, self.config.vocab_size),
                targets.view(-1),
            )

        return logits, loss

    # -------------------------
    # Sampling helper
    # -------------------------

    @torch.no_grad()
    def generate(
        self,
        idx: torch.Tensor,
        max_new_tokens: int,
        temperature: float = 1.0,
        top_k: Optional[int] = None,
    ) -> torch.Tensor:
        """
        Autoregressive sampling.
        idx: (B, T_start) initial context
        returns: (B, T_start + max_new_tokens)
        """

        self.eval()
        B, T_start = idx.shape

        for _ in range(max_new_tokens):
            # Crop to block_size if needed
            idx_cond = idx[:, -self.config.block_size :]

            logits, _ = self(idx_cond)  # (B, T_cond, vocab_size)
            logits = logits[:, -1, :] / max(temperature, 1e-6)  # (B, vocab_size)

            if top_k is not None and top_k > 0:
                v, _ = torch.topk(logits, top_k)
                thresh = v[:, -1].unsqueeze(-1)
                logits = torch.where(logits < thresh, torch.full_like(logits, -float("inf")), logits)

            probs = F.softmax(logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)  # (B, 1)

            idx = torch.cat([idx, next_token], dim=1)

        return idx
