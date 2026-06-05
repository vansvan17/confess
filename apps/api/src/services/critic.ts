import { config } from "../lib/config";
import { logger } from "../lib/logger";

export interface CriticResult {
  verdict: "pass" | "fail" | "warn";
  unsupportedClaims: string[];
  revisedAnswer: string | null;
  confidenceAdjustment: number;
}

const HF_CHAT_URL = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta";

export async function auditAnswer(
  question: string,
  answer: string,
  sourceChunks: string[],
): Promise<CriticResult> {
  if (!config.huggingfaceKey) {
    logger.info("No HUGGINGFACE_API_KEY set, skipping critic audit");
    return {
      verdict: "pass",
      unsupportedClaims: [],
      revisedAnswer: null,
      confidenceAdjustment: 0,
    };
  }

  const prompt = `<|system|>
You are a fact-checker for a company knowledge base. Check if the answer is supported by the source chunks. Respond in JSON only.</s>
<|user|>
Question: ${question}
Answer: ${answer}
Source chunks:
${sourceChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n")}

Check:
1. Is every claim in the answer supported by the source chunks?
2. Are there any numbers, dates, or names that don't appear in the sources?

Respond in JSON only:
{
  "verdict": "pass" | "fail" | "warn",
  "unsupported_claims": [],
  "revised_answer": null
}</s>
<|assistant|>
`;

  try {
    const res = await fetch(HF_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingfaceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 500 },
      }),
    });

    if (!res.ok) {
      throw new Error(`HuggingFace chat failed: ${res.status}`);
    }

    const result = (await res.json()) as Record<string, unknown> | Array<Record<string, unknown>>;
    const text = Array.isArray(result)
      ? ((result[0]?.generated_text as string) ?? "")
      : ((result.generated_text as string) ?? "");

    // Extract JSON from response
    const jsonMatch = text.match(/\{.*\}/s);
    const parsed = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { verdict: "pass", unsupported_claims: [] };

    const adjMap: Record<string, number> = { pass: 0.05, warn: -0.05, fail: -0.1 };

    return {
      verdict: parsed.verdict ?? "pass",
      unsupportedClaims: parsed.unsupported_claims ?? [],
      revisedAnswer: parsed.revised_answer ?? null,
      confidenceAdjustment: adjMap[parsed.verdict] ?? 0,
    };
  } catch (err) {
    logger.error({ err, question }, "Critic agent failed, defaulting to pass");
    return {
      verdict: "pass",
      unsupportedClaims: [],
      revisedAnswer: null,
      confidenceAdjustment: 0,
    };
  }
}
