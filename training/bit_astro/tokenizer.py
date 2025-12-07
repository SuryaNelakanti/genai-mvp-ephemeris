import os
import json
import re
from typing import List, Dict, Tuple

# Minimal BPE implementation
# Inspired by minbpe / karpathy

class BPETokenizer:
    def __init__(self):
        self.merges = {} # (int, int) -> int
        self.vocab = {}  # int -> bytes
        self.special_tokens = {} # str -> int
        # Simplified pattern for standard re
        self.pattern = re.compile(r"""\s+|[a-zA-Z]+|[0-9]+|[^a-zA-Z0-9\s]+""")

    def train(self, text: str, vocab_size: int, verbose: bool = False):
        assert vocab_size >= 256
        num_merges = vocab_size - 256
        
        # Input text preprocessing
        text_bytes = text.encode("utf-8")
        ids = list(text_bytes) # list of integers in range 0..255

        # Iteratively merge the most common pair
        merges = {} # (idx1, idx2) -> idx_new
        vocab = {idx: bytes([idx]) for idx in range(256)} # int -> bytes
        
        for i in range(num_merges):
            stats = self._get_stats(ids)
            if not stats:
                break
            pair = max(stats, key=stats.get)
            idx = 256 + i
            ids = self._merge(ids, pair, idx)
            merges[pair] = idx
            vocab[idx] = vocab[pair[0]] + vocab[pair[1]]
            if verbose:
                print(f"merge {i+1}/{num_merges}: {pair} -> {idx} ({vocab[idx]})")

        self.merges = merges
        self.vocab = vocab
        self.vocab_size = 256 + len(merges)

    def encode(self, text: str) -> List[int]:
        text_bytes = text.encode("utf-8")
        ids = list(text_bytes)
        while len(ids) >= 2:
            stats = self._get_stats(ids)
            pair = min(stats, key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges:
                break # no more merges available
            idx = self.merges[pair]
            ids = self._merge(ids, pair, idx)
        return ids

    def decode(self, ids: List[int]) -> str:
        tokens = b"".join(self.vocab[idx] for idx in ids if idx in self.vocab)
        text = tokens.decode("utf-8", errors="replace")
        return text

    def save(self, path_prefix: str):
        # save merges
        with open(path_prefix + ".merges", 'w', encoding='utf-8') as f:
            for (p0, p1), idx in self.merges.items():
                f.write(f"{p0} {p1} {idx}\n")
        # save vocab (optional, for debugging mostly, merges is enough to reconstruct)
        # but let's just save the merges for now as that's the core model file
    
    def load(self, path_prefix: str):
        merges_file = path_prefix + ".merges"
        if not os.path.exists(merges_file):
            raise FileNotFoundError(f"Could not find {merges_file}")
            
        self.merges = {}
        self.vocab = {idx: bytes([idx]) for idx in range(256)}
        
        with open(merges_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.split()
                if len(parts) != 3: continue
                p0, p1, idx = int(parts[0]), int(parts[1]), int(parts[2])
                self.merges[(p0, p1)] = idx
                self.vocab[idx] = self.vocab[p0] + self.vocab[p1]
        
        self.vocab_size = 256 + len(self.merges)

    def load_state_dict(self, merges: Dict[Tuple[int, int], int]):
        self.merges = merges
        self.vocab = {idx: bytes([idx]) for idx in range(256)}
        for (p0, p1), idx in self.merges.items():
            self.vocab[idx] = self.vocab[p0] + self.vocab[p1]
        self.vocab_size = 256 + len(self.merges)

    def __len__(self):
        return self.vocab_size

    def _get_stats(self, ids):
        counts = {}
        for pair in zip(ids, ids[1:]):
            counts[pair] = counts.get(pair, 0) + 1
        return counts

    def _merge(self, ids, pair, idx):
        newids = []
        i = 0
        while i < len(ids):
            if i < len(ids) - 1 and ids[i] == pair[0] and ids[i+1] == pair[1]:
                newids.append(idx)
                i += 2
            else:
                newids.append(ids[i])
                i += 1
        return newids
