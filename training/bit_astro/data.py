import os
import torch
from torch.utils.data import Dataset
from typing import List, Tuple, Dict, Optional

class CharVocab:
    def __init__(self, text: str):
        chars = sorted(list(set(text)))
        self.stoi = {ch: i for i, ch in enumerate(chars)}
        self.itos = {i: ch for i, ch in enumerate(chars)}
        self.vocab_size = len(chars)

    def encode(self, s: str) -> List[int]:
        return [self.stoi[c] for c in s if c in self.stoi] # silently ignore unknown chars for now or could error

    def decode(self, ids: List[int]) -> str:
        return "".join([self.itos[i] for i in ids if i in self.itos])

    def __len__(self) -> int:
        return self.vocab_size

class CharLMIndexedDataset(Dataset):
    def __init__(self, tokens: torch.Tensor, block_size: int, packed: bool = False):
        self.tokens = tokens
        self.block_size = block_size
        self.packed = packed
        
        if packed:
            # Drop last tokens to make it divisible by block_size+1 if needed, 
            # or just ensure we can take chunks of block_size+1
            self.num_chunks = (len(tokens) - 1) // block_size
        else:
            self.num_chunks = len(tokens) - block_size

    def __len__(self) -> int:
        return self.num_chunks

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        if self.packed:
            start = idx * self.block_size
        else:
            start = idx
            
        chunk = self.tokens[start : start + self.block_size + 1]
        x = chunk[:-1]
        y = chunk[1:]
        return x, y

from .tokenizer import BPETokenizer

def load_corpus_and_vocab(path: str, block_size: int, tokenizer_type: str = "char", vocab_size: int = 2048):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    if tokenizer_type == "bpe":
        tokenizer_path = path + ".bpe"
        tokens_cache_path = path + ".bpe.tokens.pt"
        tokenizer = BPETokenizer()
        
        # Try to load existing tokenizer
        try:
            tokenizer.load(tokenizer_path)
            print(f"Loaded BPE tokenizer from {tokenizer_path}.merges")
        except FileNotFoundError:
            print(f"Training BPE tokenizer (vocab_size={vocab_size})...")
            tokenizer.train(text, vocab_size=vocab_size, verbose=True)
            tokenizer.save(tokenizer_path)
            print(f"Saved BPE tokenizer to {tokenizer_path}.merges")
            
        vocab = tokenizer
        
        # Try to load cached tokens
        if os.path.exists(tokens_cache_path):
            print(f"Loading cached tokens from {tokens_cache_path}...")
            tokens = torch.load(tokens_cache_path)
            print(f"Loaded {len(tokens)} tokens from cache")
        else:
            print(f"Encoding corpus (this may take a while for large files)...")
            # Encode in chunks with progress
            chunk_size = 100000  # characters per chunk
            all_ids = []
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                ids = tokenizer.encode(chunk)
                all_ids.extend(ids)
                if (i // chunk_size) % 10 == 0:
                    print(f"  Encoded {i + len(chunk):,} / {len(text):,} chars...")
            print(f"Encoding complete: {len(all_ids):,} tokens")
            tokens = torch.tensor(all_ids, dtype=torch.long)
            torch.save(tokens, tokens_cache_path)
            print(f"Saved tokens cache to {tokens_cache_path}")
    else:
        # Char level fallback
        vocab = CharVocab(text)
        ids = vocab.encode(text)
        tokens = torch.tensor(ids, dtype=torch.long)
    
    return vocab, tokens

