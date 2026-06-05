import { config } from "../lib/config";

export interface ConfidenceInput {
  maxSimilarity: number;
  similarityGap: number;
  coverageScore: number;
}

export function computeConfidence(input: ConfidenceInput): number {
  const { weightSimilarity, weightGap, weightCoverage } = config.confidence;
  const raw =
    weightSimilarity * input.maxSimilarity +
    weightGap * input.similarityGap +
    weightCoverage * input.coverageScore;
  return Math.max(0, Math.min(1, raw));
}

export function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    "what",
    "is",
    "the",
    "how",
    "do",
    "i",
    "a",
    "an",
    "of",
    "in",
    "to",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "are",
    "can",
    "does",
    "will",
    "would",
    "could",
    "should",
    "has",
    "have",
  ]);
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

export function computeCoverage(query: string, docs: string[]): number {
  const terms = extractKeyTerms(query);
  if (terms.length === 0) return 0;
  let matched = 0;
  for (const term of terms) {
    if (docs.some((d) => d.toLowerCase().includes(term))) {
      matched++;
    }
  }
  return matched / terms.length;
}
