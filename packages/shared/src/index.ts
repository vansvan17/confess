export type ConfidenceScore = number;

export interface RetrievedChunk {
  content: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
}

export interface QueryResult {
  answer: string | null;
  confidenceScore: ConfidenceScore;
  sources: RetrievedChunk[];
  criticVerdict?: "pass" | "fail" | "warn";
  failureReason?: string;
  suggestedInfo?: string;
}

export interface GapLog {
  id: string;
  question: string;
  confidenceScore: number;
  retrievedContextSummary: string;
  suggestedMissingInfo: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  status: "processing" | "ready" | "error";
  chunkCount: number;
  createdAt: string;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "done" | "error";
}
