import { config } from "../lib/config";
import { logger } from "../lib/logger";

const HF_EMBED_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

export async function embed(text: string): Promise<number[]> {
  if (!config.huggingfaceKey) {
    // Return a zero vector as fallback (dim=384 for all-MiniLM-L6-v2)
    logger.warn("No HUGGINGFACE_API_KEY set, returning zero embedding");
    return new Array(384).fill(0);
  }

  const res = await fetch(HF_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.huggingfaceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, "HuggingFace embedding failed");
    throw new Error(`Embedding failed: ${res.status} ${err}`);
  }

  const result = await res.json();

  // HF returns [[float, float, ...]] for a single input
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[];
  }

  throw new Error("Unexpected embedding response format");
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embed));
}
