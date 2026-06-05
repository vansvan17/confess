export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  filename: string;
  status: "processing" | "ready" | "error";
  chunkCount: number;
  createdAt: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  workspaceId: string;
  content: string;
  embedding: number[];
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  createdAt: string;
}

export interface RetrievedChunk {
  content: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
}

export interface ConfidenceConfig {
  weightSimilarity: number;
  weightGap: number;
  weightCoverage: number;
  threshold: number;
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

export interface GapLog {
  id: string;
  workspaceId: string;
  question: string;
  confidenceScore: number;
  retrievedContextSummary: string;
  suggestedMissingInfo: string;
  clusterId: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  question: string;
  answer: string;
  verdict: "pass" | "fail" | "warn";
  unsupportedClaims: string[];
  confidenceAdj: number;
  createdAt: string;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "done" | "error";
}

export type ConfidenceWeights = Pick<
  ConfidenceConfig,
  "weightSimilarity" | "weightGap" | "weightCoverage"
>;
