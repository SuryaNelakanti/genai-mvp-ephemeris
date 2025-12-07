from trainer.bit_astro.tokenizer import BPETokenizer

tokenizer = BPETokenizer()
tokenizer.load("data/corpus.txt.bpe")
print(f"Vocab size: {len(tokenizer)}")

text = "you are becoming your emotions"
ids = tokenizer.encode(text)
print(f"'{text}' -> {ids}")
decoded = tokenizer.decode(ids)
print(f"Decoded: '{decoded}'")

print("Sample tokens:")
for i in range(256, 300):
    print(f"{i}: {tokenizer.vocab[i]}")
