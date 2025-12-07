import argparse
import torch
import torch.nn.functional as F
import os
import math
import random
from .model import BitAstroGPT, BitAstroConfig
from .data import CharVocab

def set_seed(seed: int):
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def nucleus_sampling(logits, top_p=0.9, temperature=1.0):
    logits = logits / max(temperature, 1e-6)
    probs = F.softmax(logits, dim=-1)
    
    if top_p < 1.0:
        sorted_probs, sorted_idx = torch.sort(probs, descending=True)
        cdf = torch.cumsum(sorted_probs, dim=-1)
        
        # Remove tokens with cumulative probability above the threshold
        sorted_indices_to_remove = cdf > top_p
        # Shift the indices to the right to keep also the first token above the threshold
        sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
        sorted_indices_to_remove[..., 0] = 0
        
        indices_to_remove = sorted_indices_to_remove.scatter(1, sorted_idx, sorted_indices_to_remove)
        probs = probs.masked_fill(indices_to_remove, 0.0)
        probs = probs / probs.sum(dim=-1, keepdim=True)
        
    return probs

def main():
    parser = argparse.ArgumentParser(description="Sample from BitAstroGPT")
    parser.add_argument("--checkpoint", type=str, required=True, help="Path to checkpoint file")
    parser.add_argument("--max-new-tokens", type=int, default=200, help="Number of tokens to generate")
    parser.add_argument("--start-text", type=str, default="\n", help="Start text for generation")
    parser.add_argument("--temperature", type=float, default=1.0, help="Sampling temperature")
    parser.add_argument("--top-p", type=float, default=0.9, help="Nucleus sampling top-p")
    parser.add_argument("--top-k", type=int, default=None, help="Top-k sampling (optional)")
    parser.add_argument("--seed", type=int, default=1337, help="Random seed for deterministic sampling")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device to use")

    args = parser.parse_args()
    
    set_seed(args.seed)

    if not os.path.exists(args.checkpoint):
        raise FileNotFoundError(f"Checkpoint not found at {args.checkpoint}")

    print(f"Loading checkpoint from {args.checkpoint}...")
    checkpoint = torch.load(args.checkpoint, map_location=args.device)
    
    # Reconstruct config
    config_dict = checkpoint['config']
    config = BitAstroConfig(**config_dict)
    
    # Reconstruct vocab
    # Reconstruct vocab
    from .tokenizer import BPETokenizer
    
    if config.tokenizer == "bpe":
        if 'vocab_merges' in checkpoint:
            vocab = BPETokenizer()
            vocab.load_state_dict(checkpoint['vocab_merges'])
        else:
             # Fallback if merges not in checkpoint (shouldn't happen with new train.py)
             # Try to load from file if exists? Or error.
             raise ValueError("Checkpoint is BPE but missing 'vocab_merges'.")
    elif 'vocab_stoi' in checkpoint and 'vocab_itos' in checkpoint:
        vocab = CharVocab("") # Dummy init
        vocab.stoi = checkpoint['vocab_stoi']
        vocab.itos = checkpoint['vocab_itos']
        vocab.vocab_size = len(vocab.stoi)
    else:
        raise ValueError("Checkpoint does not contain vocab info. Cannot decode.")

    # Setup model
    model = BitAstroGPT(config)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(args.device)
    model.eval()
    
    # Report metrics if available
    if 'val_loss' in checkpoint:
        print(f"Checkpoint Val Loss: {checkpoint['val_loss']:.4f}")
    if 'val_bpc' in checkpoint:
        print(f"Checkpoint Val BPC: {checkpoint['val_bpc']:.4f}")
        print(f"Checkpoint Perplexity: {math.exp(checkpoint['val_loss']):.4f}")

    # Encode start text
    start_ids = vocab.encode(args.start_text)
    if not start_ids:
        print("Warning: start-text empty or contains unknown chars. Starting with random token.")
        start_ids = [torch.randint(0, config.vocab_size, (1,)).item()]
    
    x = torch.tensor(start_ids, dtype=torch.long, device=args.device).unsqueeze(0) # (1, T)

    print(f"Generating {args.max_new_tokens} tokens (T={args.temperature}, p={args.top_p})...")
    
    # Custom generation loop for top-p
    y = x
    with torch.no_grad():
        for _ in range(args.max_new_tokens):
            idx_cond = y[:, -config.block_size:]
            logits, _ = model(idx_cond)
            logits = logits[:, -1, :]
            
            probs = nucleus_sampling(logits, top_p=args.top_p, temperature=args.temperature)
            
            next_token = torch.multinomial(probs, num_samples=1)
            y = torch.cat([y, next_token], dim=1)
    
    output_text = vocab.decode(y[0].tolist())
    print("-" * 50)
    print(output_text)
    print("-" * 50)

if __name__ == "__main__":
    main()
