import * as ort from 'onnxruntime-web';
import { BPETokenizer } from '../lib/tokenizer';

// Configure ONNX Runtime to use CDN for WASM files
// IMPORTANT: Version must match the installed onnxruntime-web package (1.23.2)
const ORT_WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
ort.env.wasm.wasmPaths = ORT_WASM_CDN;
ort.env.wasm.numThreads = 1;

export interface GenerationOptions {
    maxTokens?: number;
    temperature?: number;
    topK?: number;
}

/**
 * Core AI Engine for BitAstro.
 * Handles client-side inference using ONNX Runtime Web and a custom small language model.
 * 
 * This engine manages the lifecycle of the ONNX session, tokenization, and generation sampling.
 * It is designed to run entirely in the browser using WebAssembly (WASM).
 */
export class AstroEngine {
    private session: ort.InferenceSession | null = null;
    private tokenizer: BPETokenizer;
    private isInitialized: boolean = false;
    private modelPath: string = '/models/bit_astro.onnx';
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.tokenizer = new BPETokenizer();
    }

    private generationMutex: Promise<void> = Promise.resolve();

    /**
     * Initializes the inference engine.
     * Loads the tokenizer and the ONNX model from the public directory.
     * Uses a singleton promise pattern to prevent multiple initialization calls.
     * 
     * @returns Promise that resolves when initialization is complete.
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._init().catch(err => {
            this.initPromise = null; // Reset promise on failure to allow retry
            throw err;
        });
        return this.initPromise;
    }

    private async _init(): Promise<void> {
        console.log("Initializing AstroEngine...");

        try {
            // Load Tokenizer
            await this.tokenizer.load();

            // Load Model with WASM backend
            const options: ort.InferenceSession.SessionOptions = {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all',
            };

            console.log("Loading ONNX model...");
            this.session = await ort.InferenceSession.create(this.modelPath, options);

            this.isInitialized = true;
            console.log("AstroEngine initialized successfully");
            console.log("  Input names:", this.session.inputNames);
            console.log("  Output names:", this.session.outputNames);
        } catch (e) {
            console.error("Failed to initialize AstroEngine:", e);
            throw e;
        }
    }

    /**
     * Checks if the engine is initialized and ready for generation.
     */
    get ready(): boolean {
        return this.isInitialized;
    }

    /**
     * Generates text based on a given prompt.
     * Uses greedy sampling or top-k sampling based on options.
     * Serializes requests to prevent "Session already started" errors.
     * 
     * @param prompt - The input text to continue.
     * @param options - Configuration for generation (maxTokens, temperature, topK).
     * @returns The generated text completion.
     */
    async generate(
        prompt: string,
        options: GenerationOptions = {}
    ): Promise<string> {
        // Wait for any pending generation to complete
        const release = await this.acquireMutex();

        try {
            return await this._generate(prompt, options);
        } finally {
            release();
        }
    }

    private acquireMutex(): Promise<() => void> {
        let release: () => void;
        const next = new Promise<void>(resolve => {
            release = resolve;
        });

        const current = this.generationMutex;
        this.generationMutex = this.generationMutex.then(() => next);

        return current.then(() => release);
    }

    private async _generate(
        prompt: string,
        options: GenerationOptions
    ): Promise<string> {
        const { maxTokens = 100, temperature = 0.8, topK = 40 } = options;

        if (!this.session || !this.isInitialized) {
            throw new Error("Engine not initialized. Call init() first.");
        }

        let tokens = this.tokenizer.encode(prompt);
        const generatedTokens: number[] = [];

        console.log(`Generating with prompt (${tokens.length} tokens)...`);

        for (let i = 0; i < maxTokens; i++) {
            // Prepare input tensor - Shape: [1, seq_len]
            const inputData = BigInt64Array.from(tokens.map((t) => BigInt(t)));
            const tensor = new ort.Tensor('int64', inputData, [1, tokens.length]);

            // Run inference
            const feeds: Record<string, ort.Tensor> = { input_ids: tensor };
            const results = await this.session.run(feeds);

            // Get logits - Shape [1, seq_len, vocab_size]
            const logits = results.logits;
            const vocabSize = logits.dims[2] as number;
            const seqLen = logits.dims[1] as number;

            // Get logits for the last token position
            const startIdx = (seqLen - 1) * vocabSize;
            const lastTokenLogits = (logits.data as Float32Array).slice(
                startIdx,
                startIdx + vocabSize
            );

            // Sample next token
            const nextToken = this.sample(lastTokenLogits, temperature, topK);

            generatedTokens.push(nextToken);
            tokens.push(nextToken);
        }

        return this.tokenizer.decode(generatedTokens);
    }

    /**
     * Samples the next token from the logits distribution.
     * Applies temperature scaling and Top-K filtering.
     * 
     * @param logits - Raw output scores from the model.
     * @param temperature - Controls randomness (higher = more random).
     * @param topK - Limits sampling to the top K most likely tokens.
     * @returns The index of the selected token.
     */
    private sample(
        logits: Float32Array,
        temperature: number,
        topK: number
    ): number {
        // Apply temperature scaling
        const scaledLogits = new Float32Array(logits.length);
        for (let i = 0; i < logits.length; i++) {
            scaledLogits[i] = logits[i] / Math.max(temperature, 1e-8);
        }

        // Top-K filtering
        if (topK > 0 && topK < logits.length) {
            const indices = Array.from({ length: logits.length }, (_, i) => i);
            indices.sort((a, b) => scaledLogits[b] - scaledLogits[a]);

            for (let i = topK; i < indices.length; i++) {
                scaledLogits[indices[i]] = -Infinity;
            }
        }

        // Find max for numerical stability in softmax
        let maxLogit = -Infinity;
        for (let i = 0; i < scaledLogits.length; i++) {
            if (scaledLogits[i] > maxLogit) maxLogit = scaledLogits[i];
        }

        // Softmax
        let sumExp = 0;
        const probs = new Float32Array(scaledLogits.length);
        for (let i = 0; i < scaledLogits.length; i++) {
            if (scaledLogits[i] === -Infinity) {
                probs[i] = 0;
            } else {
                probs[i] = Math.exp(scaledLogits[i] - maxLogit);
                sumExp += probs[i];
            }
        }

        // Multinomial sampling
        const r = Math.random() * sumExp;
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r < cumulative) return i;
        }

        return probs.length - 1;
    }
}

// Singleton instance
export const astroEngine = new AstroEngine();
