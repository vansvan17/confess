import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://confess:confess@localhost:5432/confess",
});

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
        PRIMARY KEY (workspace_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
        chunk_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536),
        source_file TEXT NOT NULL,
        page_number INT NOT NULL,
        chunk_index INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // pgvector index for cosine similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding
      ON chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gap_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        confidence_score FLOAT NOT NULL,
        retrieved_context_summary TEXT,
        suggested_missing_info TEXT,
        embedding vector(1536),
        cluster_id INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'warn')),
        unsupported_claims JSONB DEFAULT '[]',
        confidence_adj FLOAT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Migration complete");
  } finally {
    client.release();
  }
}
