# Confess — A RAG System That Knows When It Doesn't Know

The name matters. "Confess" because it admits uncertainty instead of hallucinating.

**What it does:** You upload documents. You ask questions. If the system can answer confidently from the documents, it does. If it can't, it tells you exactly why — what's missing, what context would help, and logs the gap so you can improve the knowledge base over time. There's a dashboard showing confidence trends, gap patterns, and retrieval quality over time.

---

## Phase 0 — Setup (Day 1)

### Repo structure

```
confess/
├── apps/
│   ├── api/          # TypeScript/Node backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # shared types
├── infra/            # Docker, deployment configs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/          # Playwright lives here
├── .github/
│   └── workflows/    # CI/CD
└── docker-compose.yml
```

Monorepo with pnpm workspaces.

### Tools to install

- pnpm
- TypeScript (strict mode)
- ESLint + Prettier (strictly configured)
- Husky + lint-staged
- Commitlint (conventional commits)

### Environments

- `.env.local`, `.env.staging`, `.env.production`
- Never committed. `.env.example` with dummy values in repo.

---

## Phase 1 — Core RAG Pipeline (Days 2–5)

The engine. Python first (FastAPI), wrapped with TypeScript API layer.

### Step 1: Document ingestion

- Accept PDF or text file
- Extract raw text (`pypdf`)
- Clean text (strip headers, footers, page numbers, whitespace)
- Chunk into overlapping segments (500 tokens, 50 token overlap)
- Generate embeddings (`sentence-transformers`, `all-MiniLM-L6-v2`)
- Store in ChromaDB with metadata (source file, page number, chunk index, timestamp)
- Async processing via BullMQ + Redis — return job ID immediately, frontend polls status

### Step 2: Retrieval with confidence scoring

- Embed query with same model
- Retrieve top 5 chunks from ChromaDB by cosine similarity
- Score retrieval quality with three signals:
  - `max_similarity` — highest cosine similarity score
  - `similarity_gap` — difference between top chunk and second chunk
  - `coverage_score` — how many query key terms appear in retrieved chunks
- Combine into `confidence_score` (0–1). Threshold starts at 0.65.
- If >= threshold → answer with GPT/Gemini, cite source chunks
- If < threshold → return why it failed, what info would help, log to gap store

### Step 3: Knowledge gap logger

- Every failed query stored in Postgres table `gap_logs`
  - id, question, confidence_score, retrieved_context_summary, suggested_missing_info, created_at, resolved_at
- Weekly cron job: cluster unresolved gaps with k-means on embeddings, surface top themes

---

## Phase 2 — The Critic Agent (Days 6–8)

Second agent audits answers before they reach the user.

- After main agent generates answer, pass to Critic Agent
- Checks: every claim supported by sources? numbers/dates/names in sources? answer stays on topic?
- Returns JSON: `{ verdict: "pass" | "fail" | "warn", unsupported_claims, confidence_adjustment, revised_answer }`
- If `fail` → return revised answer. If `warn` → return original with caveat. Log everything.
- Track audit results over time to identify problematic question types.

---

## Phase 3 — API Layer (Days 9–11)

Hono (TypeScript-first, lighter than Express).

### Endpoints

- `POST /documents/upload` → returns jobId
- `GET /documents/jobs/:id` → poll ingestion status
- `GET /documents` → list all docs
- `DELETE /documents/:id` → remove a document
- `POST /query` → main query endpoint
- `GET /query/history` → past queries with confidence scores
- `GET /gaps` → knowledge gap log
- `GET /gaps/clusters` → clustered gap themes
- `PATCH /gaps/:id/resolve` → mark gap resolved
- `GET /analytics/confidence` → confidence score trends
- `GET /analytics/audits` → critic agent audit results

### Every endpoint gets

- Request validation with Zod
- Auth middleware (Clerk)
- Rate limiting (`@hono/rate-limiter`)
- Request ID injection (UUID logged everywhere)

---

## Phase 4 — Observability (Days 12–13)

- **Structured logging with Pino:** JSON logs with timestamp, request ID, user ID, endpoint, latency, status code
- **Error tracking with Sentry:** Free tier, one-line setup
- **Metrics with Prometheus + Grafana:** Query latency, confidence score distribution, critic verdict breakdown, job queue depth
- **Uptime monitoring:** BetterUptime (free) on `/health` endpoint

---

## Phase 5 — Frontend (Days 14–17)

Next.js + Tailwind + shadcn/ui. Three pages:

1. **Upload page** — drag-and-drop, ingestion progress via polling, document list
2. **Query page** — chat-like interface, answer with source citations, confidence score visual (green/yellow/red), critic verdict, "why I can't answer" explanation
3. **Dashboard page** — confidence trends (recharts), gap clusters (card grid), audit breakdown (bar chart), document coverage stats

---

## Phase 6 — CI/CD (Days 18–19)

Four GitHub Actions workflows:

1. `ci.yml` — install, typecheck, lint, unit tests, integration tests, build check (every PR)
2. `e2e.yml` — full stack with Docker Compose, Playwright tests, upload artifacts on failure (every PR)
3. `deploy-staging.yml` — CI checks, deploy to Railway/Vercel staging, smoke test, notify (merge to main)
4. `deploy-prod.yml` — same as staging, deploy to production, create GitHub release (version tag)

---

## Phase 7 — Testing (woven throughout)

- **Unit tests (Vitest):** confidence scoring, chunk overlap, critic agent prompt builder, gap clustering
- **Integration tests:** full query pipeline with mock LLM, job queue, database operations
- **E2E tests (Playwright):** upload → ingest → query → verify answer; unanswerable question → verify "I don't know"; dashboard updates

---

## Phase 8 — Load Testing (Day 20)

k6 script: 50 concurrent users, 5 minutes, measure p50/p95/p99 latency. Find bottlenecks (embedding model, LLM call, database). Document findings and fixes.

---

## README

Structure:

- Problem: RAG systems hallucinate confidently
- Solution: confidence scoring + critic agent + gap logging
- Architecture diagram (Eraser.io / Excalidraw)
- Dashboard screenshot
- "I don't know" response screenshot
- Local setup (one command: `docker compose up`)
- Link to live demo
- Link to Grafana dashboard screenshot
- "What I learned" section

---

## Timeline

| Days  | What                                   |
| ----- | -------------------------------------- |
| 1     | Repo setup, tooling, environments      |
| 2–5   | Core RAG pipeline + confidence scoring |
| 6–8   | Critic agent                           |
| 9–11  | TypeScript API layer                   |
| 12–13 | Observability                          |
| 14–17 | Frontend                               |
| 18–19 | CI/CD                                  |
| 20    | Load testing                           |
| 21    | README, cleanup, deploy                |
