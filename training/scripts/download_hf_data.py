import pandas as pd
import os

# Download the horoscope dataset from HuggingFace
print("Downloading horoscope dataset from HuggingFace...")
df = pd.read_csv("hf://datasets/karthiksagarn/astro_horoscope/horoscope.csv")

print(f"Dataset shape: {df.shape}")

# Extract the horoscope text
horoscope_texts = df['horoscope'].dropna().tolist()
print(f"Total horoscope entries: {len(horoscope_texts)}")

# Format for training - one horoscope per line
# Add some context by including the sign
formatted_texts = []
for idx, row in df.iterrows():
    sign = row['sign'].capitalize() if pd.notna(row['sign']) else ""
    horoscope = row['horoscope'] if pd.notna(row['horoscope']) else ""
    
    if horoscope:
        # Format: "sign: horoscope" or just horoscope
        formatted_texts.append(horoscope.strip())

# Write to file
output_path = "data/hf_corpus.txt"
with open(output_path, 'w', encoding='utf-8') as f:
    for text in formatted_texts:
        f.write(text + "\n")

# Check size
file_size = os.path.getsize(output_path)
print(f"Saved to {output_path}")
print(f"File size: {file_size / 1024:.2f} KB ({file_size / (1024*1024):.2f} MB)")

# Also append to main corpus
main_corpus = "data/corpus.txt"
with open(main_corpus, 'r', encoding='utf-8') as f:
    existing = f.read()

with open(main_corpus, 'w', encoding='utf-8') as f:
    f.write(existing)
    f.write("\n\n# --- HuggingFace Horoscope Dataset ---\n\n")
    for text in formatted_texts:
        f.write(text + "\n")

final_size = os.path.getsize(main_corpus)
print(f"Updated {main_corpus}")
print(f"Total corpus size: {final_size / 1024:.2f} KB ({final_size / (1024*1024):.2f} MB)")
