import { pool } from "../db/schema";
import { embed } from "./embeddings";
import { computeConfidence, computeCoverage } from "./confidence";
import { config } from "../lib/config";
import { redis } from "../lib/redis";

export interface RetrievedChunk {
  content: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
}

export interface QueryResult {
  answered: boolean;
  answer: string | null;
  confidence: number;
  sources: RetrievedChunk[];
  reason: string | null;
  suggestion: string | null;
  criticVerdict: "pass" | "fail" | "warn" | null;
  gapLogged: boolean;
}

async function getMembership(workspaceId: string, userId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

const TOP_K = 5;

export async function queryKnowledgeBase(
  workspaceId: string,
  userId: string,
  question: string,
): Promise<QueryResult> {
  const isMember = await getMembership(workspaceId, userId);
  if (!isMember) {
    throw new Error("User is not a member of this workspace");
  }

  // Check cache
  const cacheKey = `query:${workspaceId}:${hash(question)}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as QueryResult;
  }

  const queryEmbedding = await embed(question);

  const res = await pool.query(
    `SELECT content, source_file, page_number, chunk_index,
            1 - (embedding <=> $1::vector) AS similarity
     FROM chunks
     WHERE workspace_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [toPgVector(queryEmbedding), workspaceId, TOP_K],
  );

  if (res.rows.length === 0) {
    return {
      answered: false,
      answer: null,
      confidence: 0,
      sources: [],
      reason: "No relevant documents found in this workspace.",
      suggestion: "Upload documents related to your question.",
      criticVerdict: null,
      gapLogged: true,
    };
  }

  const chunks: RetrievedChunk[] = res.rows.map((r: any) => ({
    content: r.content,
    sourceFile: r.source_file,
    pageNumber: r.page_number,
    chunkIndex: r.chunk_index,
    similarity: r.similarity,
  }));

  const similarities = chunks.map((c) => c.similarity);
  const maxSimilarity = Math.max(...similarities);
  const similarityGap = similarities.length > 1 ? similarities[0]! - similarities[1]! : 0.5;
  const coverageScore = computeCoverage(
    question,
    chunks.map((c) => c.content),
  );

  const confidence = computeConfidence({ maxSimilarity, similarityGap, coverageScore });

  const result: QueryResult = {
    answered: false,
    answer: null,
    confidence,
    sources: chunks,
    reason: null,
    suggestion: null,
    criticVerdict: null,
    gapLogged: false,
  };

  if (confidence >= config.confidence.threshold) {
    result.answered = true;
    result.gapLogged = false;
  } else {
    result.reason =
      "The retrieved context does not contain enough information to answer this question with confidence.";
    result.suggestion = "A document covering this specific topic would improve results.";
    result.gapLogged = true;
  }

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  return result;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function toPgVector(arr: number[]): string {
  return `[${arr.join(",")}]`;
}
