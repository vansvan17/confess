# Confess — A RAG System That Knows When It Doesn't Know

**One runtime. Pure TypeScript. Company Knowledge Base Mode.**

---

## Architecture

```
User → Next.js → Hono API → PostgreSQL (pgvector) + Redis
                              ├── Auth (Clerk)
                              ├── BullMQ job queue
                              ├── Confidence scoring
                              ├── Critic audit agent
                              └── Knowledge gap logger + clustering
```

## Stack

- **Runtime:** TypeScript (strict) — single coherent stack
- **API:** Hono + @hono/node-server
- **Frontend:** Next.js + Tailwind + shadcn/ui
- **Database:** PostgreSQL + pgvector (embeddings as a column type)
- **Queue:** BullMQ + Redis
- **Auth:** Clerk
- **AI:** OpenAI (text-embedding-3-small, gpt-4o-mini)
- **Logging:** Pino
- **Errors:** Sentry
- **Metrics:** Prometheus + Grafana (via prom-client)
- **CI/CD:** GitHub Actions (4 workflows)
- **Testing:** Vitest, Playwright E2E, k6 load testing
- **Orchestration:** Docker Compose

---

## Key Design Decisions

### pgvector instead of ChromaDB

Embeddings live in the same Postgres instance — one less service, one less thing to maintain. The IVFFlat index makes cosine similarity search efficient.

### Confidence-aware retrieval

Three signals combined into one score:

- `max_similarity` (weight 0.5) — highest cosine similarity
- `similarity_gap` (weight 0.3) — difference between top 1 and top 2
- `coverage_score` (weight 0.2) — query term coverage in retrieved chunks

Below threshold (default 0.65) → refuse to answer, log the gap.

### Similarity threshold clustering (not K-Means)

Phase 1 uses cosine similarity > 0.82 to group similar gap questions. Simple, interpretable, and produces clear dashboard output. HDBSCAN is the planned upgrade path.

### Multi-tenant from day one

Every table has `workspace_id`. The service layer verifies membership on every operation. No retrofitting needed.

### Critic agent as safety net

A second LLM call audits every answer before it reaches the user. Verdicts (pass/fail/warn) are logged and tracked over time.

### Configurable confidence weights

All weights and thresholds are environment variables — different document types perform better with different values.

---

## File Structure

```
confess/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/     # documents, query, gaps, analytics
│   │   │   ├── services/   # embeddings, retrieval, confidence, critic, gaps
│   │   │   ├── jobs/       # ingest, cluster-gaps
│   │   │   ├── db/         # schema + migrations
│   │   │   ├── lib/        # logger, redis, metrics, config
│   │   │   └── index.ts
│   └── web/                # Next.js (coming in Phase 5)
├── packages/
│   └── shared/             # shared types
├── infra/
│   └── docker-compose.yml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── .github/workflows/
```

---

## Timeline

| Day   | Phase                                                 |
| ----- | ----------------------------------------------------- |
| 1     | Repo setup, tooling, Docker Compose                   |
| 2–5   | Core RAG pipeline + confidence scoring + critic agent |
| 6–8   | API routes, gap logging, analytics                    |
| 9–11  | Frontend (Next.js)                                    |
| 12–13 | Observability (logging, metrics, Sentry)              |
| 14–15 | CI/CD (4 workflows)                                   |
| 16    | Load testing + README + deploy                        |
