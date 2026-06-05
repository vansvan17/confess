import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { pool } from "../db/schema";
import { embedBatch } from "../services/embeddings";
import { logger } from "../lib/logger";

const docRoutes = new Hono();

// POST /documents/upload
docRoutes.post(
  "/documents/upload",
  zValidator(
    "json",
    z.object({
      workspaceId: z.string().uuid(),
      filename: z.string(),
      content: z.string(),
    }),
  ),
  async (c) => {
    const { workspaceId, filename, content } = c.req.valid("json");

    // Insert document record
    const doc = await pool.query(
      `INSERT INTO documents (workspace_id, filename, status)
       VALUES ($1, $2, 'processing')
       RETURNING id`,
      [workspaceId, filename],
    );
    const docId = doc.rows[0]!.id;

    // In a real system this would be a BullMQ job. For now, inline.
    try {
      // Simple chunking: 500 word chunks with 50 word overlap
      const words = content.split(/\s+/);
      const chunks: string[] = [];
      const overlap = 50;
      const chunkSize = 500;
      let start = 0;
      while (start < words.length) {
        chunks.push(words.slice(start, start + chunkSize).join(" "));
        start += chunkSize - overlap;
      }

      const embeddings = await embedBatch(chunks);

      const values: string[] = [];
      const params: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const idx = params.length + 1;
        values.push(
          `(gen_random_uuid(), $${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}::vector, $${idx + 4}, $${idx + 5}, $${idx + 6})`,
        );
        params.push(docId, workspaceId, chunks[i], toPgVector(embeddings[i]!), filename, 1, i);
      }

      await pool.query(
        `INSERT INTO chunks (id, document_id, workspace_id, content, embedding, source_file, page_number, chunk_index)
         VALUES ${values.join(", ")}`,
        params,
      );

      await pool.query(`UPDATE documents SET status = 'ready', chunk_count = $1 WHERE id = $2`, [
        chunks.length,
        docId,
      ]);

      logger.info({ docId, chunkCount: chunks.length }, "Document ingested");
    } catch (err) {
      await pool.query(`UPDATE documents SET status = 'error' WHERE id = $1`, [docId]);
      logger.error({ err, docId }, "Document ingestion failed");
    }

    return c.json({ jobId: docId, status: "done" });
  },
);

// GET /documents
docRoutes.get("/documents", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);

  const res = await pool.query(
    `SELECT id, filename, status, chunk_count, created_at
     FROM documents WHERE workspace_id = $1
     ORDER BY created_at DESC`,
    [workspaceId],
  );

  return c.json({ documents: res.rows });
});

// DELETE /documents/:id
docRoutes.delete("/documents/:id", async (c) => {
  const id = c.req.param("id");
  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
  return c.json({ deleted: true });
});

export { docRoutes };

function toPgVector(arr: number[]): string {
  return `[${arr.join(",")}]`;
}
