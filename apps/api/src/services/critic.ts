import OpenAI from "openai";
import { config } from "../lib/config";
import { logger } from "../lib/logger";

const openai = new OpenAI({ apiKey: config.openaiKey });

export interface CriticResult {
  verdict: "pass" | "fail" | "warn";
  unsupportedClaims: string[];
  revisedAnswer: string | null;
  confidenceAdjustment: number;
}

export async function auditAnswer(
  question: string,
  answer: string,
  sourceChunks: string[],
): Promise<CriticResult> {
  const prompt = `You are a fact-checker for a company knowledge base.

Question: ${question}
Answer: ${answer}
Source chunks:
${sourceChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n")}

Check:
1. Is every claim in the answer supported by the source chunks?
2. Are there any numbers, dates, or names that don't appear in the sources?
3. Does the answer stay within the scope of the question?

Respond in JSON only:
{
  "verdict": "pass" | "fail" | "warn",
  "unsupported_claims": string[],
  "revised_answer": string | null
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      verdict: "pass" | "fail" | "warn";
      unsupported_claims: string[];
      revised_answer: string | null;
    };

    const adjMap = { pass: 0.05, warn: -0.05, fail: -0.1 };
    const confidenceAdjustment = adjMap[parsed.verdict] ?? 0;

    return {
      verdict: parsed.verdict,
      unsupportedClaims: parsed.unsupported_claims ?? [],
      revisedAnswer: parsed.revised_answer ?? null,
      confidenceAdjustment,
    };
  } catch (err) {
    logger.error({ err, question }, "Critic agent failed");
    return {
      verdict: "pass",
      unsupportedClaims: [],
      revisedAnswer: null,
      confidenceAdjustment: 0,
    };
  }
}
