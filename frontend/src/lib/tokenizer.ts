
export class BPETokenizer {
    merges: Map<string, number>;
    vocab: Map<number, Uint8Array>;
    vocabSize: number;
    cache: Map<string, number[]>;

    constructor() {
        this.merges = new Map();
        this.vocab = new Map();
        this.vocabSize = 256;
        this.cache = new Map();

        // Initialize basic vocab (bytes)
        for (let i = 0; i < 256; i++) {
            this.vocab.set(i, new Uint8Array([i]));
        }
    }

    async load(url: string = '/models/tokenizer.merges') {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load merges from ${url}`);
            const text = await response.text();

            const lines = text.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const parts = line.split(' ');
                if (parts.length !== 3) continue;

                const p0 = parseInt(parts[0]);
                const p1 = parseInt(parts[1]);
                const idx = parseInt(parts[2]);

                this.merges.set(`${p0},${p1}`, idx);

                // Update vocab
                const v0 = this.vocab.get(p0);
                const v1 = this.vocab.get(p1);
                if (v0 && v1) {
                    const merged = new Uint8Array(v0.length + v1.length);
                    merged.set(v0);
                    merged.set(v1, v0.length);
                    this.vocab.set(idx, merged);
                }
            }

            this.vocabSize = 256 + this.merges.size;
            console.log(`Tokenizer loaded. Vocab size: ${this.vocabSize}`);
        } catch (e) {
            console.error("Error loading tokenizer:", e);
        }
    }

    encode(text: string): number[] {
        if (this.cache.has(text)) return this.cache.get(text)!;

        // Encode string to UTF-8 bytes
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        let ids = Array.from(bytes);

        while (ids.length >= 2) {
            const stats = this.getStats(ids);
            let bestPair: [number, number] | null = null;
            let minIdx = Infinity;

            // Find the pair with the lowest merge index (highest priority)
            for (const [pairKey, count] of stats) {
                if (this.merges.has(pairKey)) {
                    const idx = this.merges.get(pairKey)!;
                    // In python implementation we just pick min pair based on some criteria, 
                    // usually it's the one with smallest index in merges if we iterate in order,
                    // but here we have a map. The python loop `for i in range(num_merges)` implies
                    // we merge in order of creation.
                    // However, for inference, we just need to find the pair that exists in merges
                    // and has the lowest index value (since lower index = earlier merge).
                    if (idx < minIdx) {
                        minIdx = idx;
                        const parts = pairKey.split(',').map(Number);
                        bestPair = [parts[0], parts[1]];
                    }
                }
            }

            if (!bestPair) break; // No more merges possible

            ids = this.merge(ids, bestPair, minIdx);
        }

        this.cache.set(text, ids);
        return ids;
    }

    decode(ids: number[]): string {
        // Concatenate all bytes
        let totalLength = 0;
        const byteArrays: Uint8Array[] = [];

        for (const id of ids) {
            const bytes = this.vocab.get(id);
            if (bytes) {
                byteArrays.push(bytes);
                totalLength += bytes.length;
            }
        }

        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of byteArrays) {
            result.set(arr, offset);
            offset += arr.length;
        }

        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(result);
    }

    private getStats(ids: number[]): Map<string, number> {
        const counts = new Map<string, number>();
        for (let i = 0; i < ids.length - 1; i++) {
            const key = `${ids[i]},${ids[i + 1]}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        return counts;
    }

    private merge(ids: number[], pair: [number, number], idx: number): number[] {
        const newIds: number[] = [];
        let i = 0;
        while (i < ids.length) {
            if (i < ids.length - 1 && ids[i] === pair[0] && ids[i + 1] === pair[1]) {
                newIds.push(idx);
                i += 2;
            } else {
                newIds.push(ids[i]);
                i += 1;
            }
        }
        return newIds;
    }
}
