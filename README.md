# BitAstro

BitAstro is an MVP I built (read: prompted) by Gemini / Claude / ChatGPT to really grok the full lifecycle of a small language model: designing and training a **custom BitNet-style Transformer from scratch** (BPE tokenization, RoPE, SwiGLU, ternary-weight layers), iterating on dataset quality and overfitting (train/val splits, BPC, sampling behavior), **exporting the final PyTorch model to ONNX**, and then **running it fully client-side in the browser using ONNX Runtime Web with WebGPU acceleration**. Along the way I also wired up a JS BPE tokenizer, integrated a WASM ephemeris engine for on-device astro math, and shipped the whole thing as a privacy-first PWA where all inference and calculations happen locally on the user’s machine.

## Data source

Found this dataset on huggingface: https://huggingface.co/datasets/karthiksagarn/astro_horoscope


## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/bitastro.git
    cd bitastro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Download the AI Model:**
    - Place the quantized ONNX model (`bit_astro.onnx`) in the `public/models/` directory.
    - Ensure `tokenizer.json` is also present in `public/models/` or configured correctly in `src/lib/tokenizer.ts`.

4.  **Start the development server:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

5.  **Open your browser:**
    Navigate to `http://localhost:5173` to launch the application.

## 📂 Project Structure

```
/
├── frontend/              # Web Application (React/Vite)
│   ├── src/
│   ├── public/
│   └── ...
│
├── training/              # Model Development (Python/PyTorch)
│   ├── bit_astro/         # Model source code
│   ├── scripts/           # Helper scripts
│   └── bit_astro.onnx     # Quantized model
│
├── data/                  # Training datasets
└── README.md              # Project documentation
```

## 📊 Benchmarks, Tests & Sample Outputs, Iterations, Iterations, Iterations

### Benchmarks

#### Dataset

-   **Size**: 21,959 horoscopes (Hugging Face)
-   **Tokenization**: ~9 MB raw text → ~2.3M BPE tokens (vocab size 2,048)

#### Model Configuration

-   **Architecture**: BitNet-style Transformer (RoPE + SwiGLU + RMSNorm)
-   **Parameters**: `d_model = 256`, `n_layers = 4`, `n_heads = 8`
-   **Quantization**: Ternary weights (baked to float for ONNX / WebGPU)

#### Training Setup

-   **Framework**: PyTorch
-   **Hardware**: NVIDIA RTX 3060 Laptop GPU
-   **Precision**: AMP enabled (mixed precision)
-   **Context length**: 128 tokens

#### Validation Metrics (Phase 3 run, 10k steps)

| Step   | Val loss | Val BPC (bits / token) | Notes             |
| :----- | :------- | :--------------------- | :---------------- |
| 1,000  | 3.998    | 5.77                   | Early checkpoint  |
| 5,000  | 2.973    | 4.29                   | Steady improvement |
| 9,000  | 2.758    | 3.98                   | Best checkpoint   |
| 10,000 | 2.763    | 3.99                   | Slight overtrain  |

*The ONNX export + WebGPU build uses the 9,000-step checkpoint.*

### Tests & Sanity Checks

To maintain integrity during iteration, the following sanity checks were implemented:

-   **Tokenizer round-trip**: `decode(encode(text)) ≈ text` for random horoscope snippets to verify the JS BPE tokenizer matches the Python version.
-   **Shape & range checks**: `forward(idx)` returns logits shaped `(B, T, vocab)` with no NaNs / Infs across random batches.
-   **Train/val split sanity**: Fixed 90/10 train/val split with stable seeds; monitored that val BPC beats a uniform baseline over time.
-   **Deterministic sampling**: Fixed seed + fixed prompt produce identical output across runs in Python and in the browser (post-ONNX), to verify export parity.
-   **WebGPU vs WASM parity**: Compared short generations between WebGPU and the WASM fallback to ensure no obvious numerical or tokenizer drift.

### Sample Outputs

All samples below are generated from the 9k-step checkpoint using the WebGPU build, with a short prompt like "today for aries:" and mild temperature / top-p:

```
your heart continues today is learning emotional energy
your emotional desire is refined
you're unlearning self-refreshing
you are becoming more optimistic, you will feel a transpience in how you relate to your own needs
```

```
today invites you to soften control and listen to the quieter signals
your intuition is becoming less noisy and more precise
old patterns of reacting are being retired in favor of slower, deliberate choices
```

```
you’re stepping out of a loop of proving yourself
the next phase is about restoring trust in your timing
even small routines you commit to today will echo further than you expect
```

*These are unedited generations: the model is small, but already consistently stays in the “introspective / horoscope” lane with coherent English (sometimes).*


### Iterations, Iterations, Iterations

-   **Phase 0 · Initial character-level prototype**
    -   **Goal**: Verify end-to-end training and text generation with a minimal setup.
    -   Implemented a small Transformer language model operating at character level.
    -   Trained on a very small corpus (~6 KB of text).
    -   Used a simple architecture without RoPE, SwiGLU, or advanced normalization.
    -   **Confirmed**:
        -   Training loop worked (loss decreased),
        -   Sampling pipeline was functional,
        -   But outputs were low quality and mostly noisy due to limited data and char-level modeling.

-   **Phase 1 · BitNet-style ternary architecture**
    -   **Goal**: Explore low-precision “bit” modeling and stabilize the architecture.
    -   Introduced a BitNet b1.58–style core with:
        -   Custom TernaryLinear layers (ternary weights {−1, 0, +1} with scaling),
        -   Straight-Through Estimator (STE) for training quantized weights.
    -   Switched normalization to RMSNorm to improve stability with low-precision weights.
    -   Maintained a small Transformer depth/width to keep experiments fast.
    -   **Outcome**: Training became more stable, but text quality was still limited by the tiny dataset and character-level tokenization.

-   **Phase 2 · Training hygiene and evaluation discipline**
    -   **Goal**: Make model quality measurable and comparable across runs.
    -   Introduced a proper train/validation split (e.g., 90/10) with fixed random seeds.
    -   Standardized metrics:
        -   Cross-entropy loss,
        -   Bits-per-token (BPC) as a primary quality metric.
    -   Added deterministic sampling:
        -   Fixed prompt and fixed sampling parameters so checkpoints could be compared directly via generated text.
    -   **Result**:
        -   Clear visibility into overfitting behavior,
        -   Ability to identify “best” checkpoints based on validation BPC rather than just training loss.

-   **Phase 3 · BPE tokenization and real horoscope corpus**
    -   **Goal**: Move from toy data to a realistic, domain-specific language model.
    -   Replaced character-level tokenization with BPE:
        -   Vocab size: 2,048.
        -   Trained BPE merges on the full horoscope corpus.
    -   Expanded dataset to a realistic domain corpus:
        -   ~21,959 horoscopes from Hugging Face,
        -   ~9 MB raw text,
        -   ~2.3M BPE tokens.
    -   Upgraded the architecture:
        -   RoPE (rotary positional embeddings) for better position handling and length generalization,
        -   SwiGLU activation in the MLP blocks.
    -   Training setup:
        -   `d_model = 256`, `n_layers = 4`, `n_heads = 8`, context length 128,
        -   Trained on an RTX 3060 with AMP (mixed precision).
    -   **Outcome**:
        -   Validation BPC improved to ~3.98 at the best checkpoint (~9,000 steps),
        -   Generated text became coherent, grammatical, and consistently aligned with horoscope-style content.

-   **Phase 4 · Deployment via ONNX and WebGPU**
    -   **Goal**: Run the model entirely in the browser with no backend dependency.
    -   For inference, baked ternary weights into standard floating-point matrices:
        -   Generated a “float-equivalent” model by freezing the ternary-transformed weights into `nn.Linear` layers.
    -   Exported the trained model to ONNX using the `BitAstroGPT.forward(idx)` → `logits` interface.
    -   Implemented a JS/TS BPE tokenizer that reproduces the Python tokenizer behavior.
    -   Integrated ONNX Runtime Web in the frontend:
        -   WebGPU execution provider for accelerated inference where available,
        -   WASM fallback for environments without WebGPU.
    -   Combined this with a WASM ephemeris engine in the frontend to keep all chart calculations and text generation fully client-side.
    -   **Result**: A self-contained, browser-only system where ephemeris computation and LLM inference both run locally, with no Python backend required.

# Following is AI slop: 

## ✨ Key Features

- **On-Device AI Oracle**: Uses a custom quantized Small Language Model (SLM) running entirely in the browser via ONNX Runtime Web. No data leaves your device.
- **Real-Time Ephemeris**: Powered by `astronomy-engine`, providing accurate positions for the Sun, Moon, and planets based on the current time.
- **Cinematic UI**: A "futuristic, gritty, high art" design system featuring:
  - Custom Bezier motion curves for fluid transitions.
  - Atmospheric particle effects (rain/light streaks).
  - Glassmorphism and dynamic lighting.
- **The Void**: A digital journal for daily reflections, enhanced by AI analysis.
- **Privacy First**: All personal data and journal entries are stored locally in the browser.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Animation**: Motion (formerly Framer Motion)
- **AI/ML**: ONNX Runtime Web (`onnxruntime-web`), Transformers.js (Tokenizer)
- **Astronomy**: `astronomy-engine`
- **State Management**: React Context API

## 🧠 Architecture Highlights

### Client-Side AI (`AstroEngine.ts`)
BitAstro bypasses traditional backend API calls for horoscope generation. Instead, it loads a compressed ONNX model directly into the browser's WebAssembly memory. This ensures zero-latency inference after the initial load and complete user privacy.

### Ephemeris Engine (`ephemeris.ts`)
We calculate planetary positions (Right Ascension, Declination) in real-time using `astronomy-engine`. These coordinates are mapped to Zodiac signs and used to render the interactive `PlanetarySystem` visualization.

## 🎨 Design System

- **Typography**: `Cormorant Garamond` (Headings) & `Space Mono` (Data/Technical).
- **Colors**: Deep blacks, transparent whites, and specific planetary gradients.
- **Motion**: Standardized easing `[0.4, 0, 0.2, 1]` for a consistent "heavy" but smooth feel.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
