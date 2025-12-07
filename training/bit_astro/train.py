import argparse
import os
import time
import math
import random
import torch
import torch.optim as optim
import torch.nn.utils as utils
from torch.utils.data import DataLoader

from .model import BitAstroGPT, BitAstroConfig
from .config import default_config
from .data import load_corpus_and_vocab, CharLMIndexedDataset

def set_seed(seed: int):
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def main():
    parser = argparse.ArgumentParser(description="Train BitAstroGPT")
    parser.add_argument("--data-path", type=str, default="../data/corpus.txt", help="Path to corpus file")
    parser.add_argument("--block-size", type=int, default=256, help="Block size (context length)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--max-steps", type=int, default=1000, help="Maximum training steps")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--warmup-steps", type=int, default=100, help="Warmup steps")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay")
    parser.add_argument("--grad-clip", type=float, default=1.0, help="Gradient clipping norm")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device to use")
    parser.add_argument("--checkpoint-dir", type=str, default="checkpoints", help="Directory to save checkpoints")
    parser.add_argument("--eval-interval", type=int, default=100, help="Steps between evaluations")
    parser.add_argument("--eval-iters", type=int, default=20, help="Batches to use for evaluation")
    parser.add_argument("--seed", type=int, default=1337, help="Random seed")
    parser.add_argument("--use-ternary", type=str, default="true", help="Use ternary weights (true/false)")
    parser.add_argument("--amp", type=str, default="true", help="Use mixed precision (true/false)")
    parser.add_argument("--tokenizer", type=str, default="char", choices=["char", "bpe"], help="Tokenizer type")

    args = parser.parse_args()
    
    # Parse booleans
    args.use_ternary = args.use_ternary.lower() == "true"
    args.amp = args.amp.lower() == "true"

    set_seed(args.seed)
    print(f"Using device: {args.device} | AMP: {args.amp} | Ternary: {args.use_ternary}")

    # 1. Load Data
    print(f"Loading data from {args.data_path}...")
    vocab, tokens = load_corpus_and_vocab(args.data_path, args.block_size, tokenizer_type=args.tokenizer)
    print(f"Vocab size: {len(vocab)}")
    print(f"Total tokens: {len(tokens)}")

    # 2. Split Data (90/10)
    n = len(tokens)
    train_data = tokens[:int(n*0.9)]
    val_data = tokens[int(n*0.9):]
    
    # Use packed dataset for training
    train_dataset = CharLMIndexedDataset(train_data, args.block_size, packed=True)
    val_dataset = CharLMIndexedDataset(val_data, args.block_size, packed=True)
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, pin_memory=True)

    # 3. Setup Model
    config = default_config(vocab_size=len(vocab), block_size=args.block_size)
    config.use_ternary = args.use_ternary
    config.tokenizer = args.tokenizer
    
    model = BitAstroGPT(config)
    model.to(args.device)
    
    # Optional: Compile if available and working (disabled for stability on Windows)
    # if hasattr(torch, "compile"):
    #     print("Compiling model...")
    #     model = torch.compile(model)

    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    
    # Cosine scheduler with warmup
    def get_lr(it):
        if it < args.warmup_steps:
            return args.lr * (it + 1) / (args.warmup_steps + 1)
        if it > args.max_steps:
            return args.lr * 0.1
        decay_ratio = (it - args.warmup_steps) / (args.max_steps - args.warmup_steps)
        coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
        return args.lr * 0.1 + coeff * (args.lr - 0.1 * args.lr)

    # 4. Training Loop
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    best_val_bpc = float('inf')
    
    train_iter = iter(train_loader)
    scaler = torch.cuda.amp.GradScaler(enabled=args.amp)
    
    model.train()
    t0 = time.time()
    
    for step in range(args.max_steps):
        # Update LR
        lr = get_lr(step)
        for param_group in optimizer.param_groups:
            param_group['lr'] = lr
            
        try:
            x, y = next(train_iter)
        except StopIteration:
            train_iter = iter(train_loader)
            x, y = next(train_iter)
            
        x, y = x.to(args.device), y.to(args.device)
        
        # Forward backward with AMP
        with torch.amp.autocast(device_type="cuda" if "cuda" in args.device else "cpu", enabled=args.amp):
            logits, loss = model(x, targets=y)
        
        scaler.scale(loss).backward()
        
        # Gradient clipping
        scaler.unscale_(optimizer)
        grad_norm = utils.clip_grad_norm_(model.parameters(), args.grad_clip)
        
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad()

        # Logging
        if step % 50 == 0:
            t1 = time.time()
            dt = t1 - t0
            t0 = t1
            tokens_per_sec = (args.batch_size * args.block_size * 50) / dt if dt > 0 else 0
            bpc = loss.item() / math.log(2)
            print(f"Step {step}: loss {loss.item():.4f} | BPC {bpc:.4f} | lr {lr:.2e} | norm {grad_norm:.2f} | tok/s {tokens_per_sec:.0f}")

        # Evaluation
        if (step > 0 and step % args.eval_interval == 0) or step == args.max_steps - 1:
            model.eval()
            val_losses = []
            with torch.no_grad():
                for i, (xv, yv) in enumerate(val_loader):
                    if i >= args.eval_iters: break
                    xv, yv = xv.to(args.device), yv.to(args.device)
                    with torch.amp.autocast(device_type="cuda" if "cuda" in args.device else "cpu", enabled=args.amp):
                        _, v_loss = model(xv, targets=yv)
                    val_losses.append(v_loss.item())
            
            avg_val_loss = sum(val_losses) / len(val_losses) if val_losses else 0.0
            val_bpc = avg_val_loss / math.log(2)
            print(f"Step {step}: val loss {avg_val_loss:.4f} | val BPC {val_bpc:.4f}")
            
            if val_bpc < best_val_bpc:
                best_val_bpc = val_bpc
                checkpoint_path = os.path.join(args.checkpoint_dir, "bit_astro_best.pt")
                print(f"Saving best checkpoint to {checkpoint_path}")
                torch.save({
                    'model_state_dict': model.state_dict(),
                    'config': config.__dict__,
                    'vocab_stoi': getattr(vocab, 'stoi', None),
                    'vocab_itos': getattr(vocab, 'itos', None),
                    'vocab_merges': getattr(vocab, 'merges', None),
                    'step': step,
                    'val_loss': avg_val_loss,
                    'val_bpc': val_bpc,
                    'args': vars(args)
                }, checkpoint_path)
            
            model.train()

if __name__ == "__main__":
    main()
