import { pool } from "../db/schema";
import { embed } from "./embeddings";

export async function logGap(
  workspaceId: string,
  question: string,
  confidenceScore: number,
  summary: string,
  suggestion: string,
): Promise<void> {
  const embedding = await embed(question);
  await pool.query(
    `INSERT INTO gap_logs (workspace_id, question, confidence_score, retrieved_context_summary, suggested_missing_info, embedding)
     VALUES ($1, $2, $3, $4, $5, $6::vector)`,
    [workspaceId, question, confidenceScore, summary, suggestion, toPgVector(embedding)],
  );
}

export async function getUnresolvedGaps(workspaceId: string): Promise<any[]> {
  const res = await pool.query(
    `SELECT * FROM gap_logs
     WHERE workspace_id = $1 AND resolved_at IS NULL
     ORDER BY created_at DESC`,
    [workspaceId],
  );
  return res.rows;
}

export async function resolveGap(gapId: string): Promise<void> {
  await pool.query(`UPDATE gap_logs SET resolved_at = NOW() WHERE id = $1`, [gapId]);
}

export async function groupSimilarGaps(
  workspaceId: string,
): Promise<{ label: string; count: number }[]> {
  const gaps = await getUnresolvedGaps(workspaceId);
  if (gaps.length === 0) return [];

  const groups: { label: string; count: number; ids: string[] }[] = [];
  const assigned = new Set<string>();

  for (const gap of gaps) {
    if (assigned.has(gap.id)) continue;

    const gapEmb = gap.embedding as number[] | undefined;
    if (!gapEmb) continue;

    const similar = gaps.filter((other: any) => {
      if (assigned.has(other.id)) return false;
      const otherEmb = other.embedding as number[] | undefined;
      return otherEmb && cosineSimilarity(gapEmb, otherEmb) > 0.82;
    });

    for (const s of similar) {
      assigned.add(s.id);
    }

    const questionTexts = similar.map((s: any) => s.question).join("; ");
    groups.push({
      label: questionTexts.length > 100 ? questionTexts.slice(0, 100) + "..." : questionTexts,
      count: similar.length,
      ids: similar.map((s: any) => s.id),
    });
  }

  // Assign cluster IDs
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!;
    await pool.query(`UPDATE gap_logs SET cluster_id = $1 WHERE id = ANY($2::uuid[])`, [
      i + 1,
      g.ids,
    ]);
  }

  return groups.map((g) => ({ label: g.label, count: g.count }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function toPgVector(arr: number[]): string {
  return `[${arr.join(",")}]`;
}
