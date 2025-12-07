import torch
import torch.nn as nn
import torch.nn.functional as F

class TernaryQuant(nn.Module):
    def __init__(self, out_features, learn_thresh=True, init_t=0.05):
        super().__init__()
        self.learn_thresh = learn_thresh
        # per-output-channel thresholds and scales
        self.t = nn.Parameter(torch.full((out_features, 1), init_t)) if learn_thresh else None

    @staticmethod
    def _ste_sign(x):
        # straight-through estimator for sign
        return (x >= 0).float() * 2 - 1

    def forward(self, W_full):  # W_full: [out, in]
        with torch.no_grad():
            if self.t is None:
                thr = 0.7 * W_full.abs().mean(dim=1, keepdim=True)  # TWN-ish default
            else:
                thr = self.t.abs()
        # ternarize
        Wq = torch.zeros_like(W_full)
        pos = W_full > thr
        neg = W_full < -thr
        Wq[pos] = 1.0
        Wq[neg] = -1.0
        # per-channel scale on nonzeros
        nz = (Wq != 0).float()
        denom = nz.sum(dim=1, keepdim=True).clamp_min(1.0)
        alpha = (W_full.abs() * nz).sum(dim=1, keepdim=True) / denom
        W_tern = alpha * Wq
        # STE backward
        if self.training:
            W_tern = W_full + (W_tern - W_full).detach()
        return W_tern

class TernaryLinear(nn.Module):
    def __init__(self, in_features, out_features, bias=False):
        super().__init__()
        self.weight = nn.Parameter(torch.empty(out_features, in_features))
        self.bias = nn.Parameter(torch.zeros(out_features)) if bias else None
        nn.init.kaiming_uniform_(self.weight, a=5**0.5)
        self.quant = TernaryQuant(out_features, learn_thresh=True)

    def forward(self, x):
        Wq = self.quant(self.weight)
        return F.linear(x, Wq, self.bias)
