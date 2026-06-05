# Confess

A multi-tenant knowledge platform that helps teams find missing documentation by tracking questions their knowledge base cannot answer.

RAG systems hallucinate confidently. Confess solves that with:

- **Confidence-aware retrieval** — three signals combined into one score, answers refused below threshold
- **Critic audit agent** — a second LLM checks every answer before it reaches the user
- **Knowledge gap detection** — every unanswered question is logged, clustered by similarity, and surfaced as trends
- **Multi-tenant workspace architecture** — workspace-scoped retrieval, documents, and gap analytics

## Screenshots

|                                  |                 |
| -------------------------------- | --------------- |
| Query interface                  | _(placeholder)_ |
| Confidence scoring visualization | _(placeholder)_ |
| Knowledge gap dashboard          | _(placeholder)_ |
| Critic audit view                | _(placeholder)_ |

## Why Not Just Use ChatGPT?

ChatGPT answers from general knowledge. Confess answers only from company documents. When documentation is missing, Confess refuses to answer and surfaces the missing knowledge instead of hallucinating.

## Architecture

![Architecture diagram](https://via.placeholder.com/800x400?text=Architecture+Diagram+-+see+docs/arch.png)

```
User → Next.js frontend → Hono API → PostgreSQL (pgvector) + Redis
                                    ├── Auth (Clerk)
                                    ├── BullMQ job queue
                                    ├── Confidence scoring
                                    ├── Critic audit agent
                                    └── Knowledge gap logger + clustering
```

**Stack:** TypeScript (strict), Hono, Next.js, PostgreSQL + pgvector, BullMQ + Redis, OpenAI, Docker Compose, Prometheus + Grafana, Sentry, Playwright.

## Try It

Create a public workspace and seed it with fake company documents (employee handbook, engineering runbook, incident response guide). Try asking:

- How do deployments work?
- Who approves production changes?
- What is the on-call escalation process?
- What is the PTO policy?

## Quick Start

```bash
# Clone and start everything
git clone <repo>
cd confess
docker compose -f infra/docker-compose.yml up
```

One command. The API runs on `:3001`, the frontend on `:3000`.

## Local Dev

```bash
# Start the database services
docker compose -f infra/docker-compose.yml up postgres redis -d

# Start the API
pnpm --filter @confess/api run dev

# Start the frontend (in another terminal)
pnpm --filter @confess/web run dev
```

Copy `.env.example` to `.env.local` and fill in your OpenAI API key.

## How It Works

### Document Ingestion

Upload a PDF or text document. The system extracts text, chunks it (500 tokens, 50 token overlap), generates embeddings (OpenAI `text-embedding-3-small`), and stores everything in pgvector. Async via BullMQ.

### Query Pipeline

1. Embed the question
2. Retrieve top 5 chunks from pgvector by cosine similarity
3. Compute confidence score:
   - **Max similarity** — how close is the best match?
   - **Similarity gap** — is the top result clearly better than #2?
   - **Term coverage** — do the chunks contain the query's keywords?
4. Default weights: `0.5 × max_similarity + 0.3 × similarity_gap + 0.2 × coverage`. All configurable via environment variables.
5. If confidence ≥ 0.65: answer with GPT, cite sources, audit with critic
6. If confidence < 0.65: refuse, explain why, log the gap

### Critic Agent

After generating an answer, a second LLM call audits it:

- Pass → deliver as-is
- Warn → append a caveat
- Fail → return a corrected answer

All verdicts are logged. Track which question types cause the most hallucinations.

### Knowledge Gap Clustering

Every unanswered question is stored with its embedding. A weekly job groups similar gaps (cosine similarity > 0.82) and surfaces themes:

> "You've received 23 questions about deployment this week. Consider adding a deployment runbook."

## Multi-Tenant Architecture

- Workspace-scoped documents and chunks — data is isolated by workspace
- Workspace-scoped retrieval — queries only search within the requesting workspace
- Workspace-scoped gap analytics — gap clusters and trends are computed per workspace
- Membership verification on every operation — users must belong to a workspace to access its data

## Metrics

Every component is instrumented:

| Metric                          | Type      | Description                           |
| ------------------------------- | --------- | ------------------------------------- |
| `confess_query_latency_seconds` | Histogram | Query endpoint latency by status      |
| `confess_confidence_score`      | Histogram | Confidence score distribution         |
| `confess_critic_verdicts_total` | Counter   | Critic verdict count (pass/fail/warn) |
| BullMQ queue depth              | Gauge     | Document ingestion job queue depth    |
| Query cache hit rate            | Gauge     | Redis cache effectiveness             |

Exposed at `GET /metrics` for Prometheus scraping. Grafana dashboard available in `infra/grafana.json`.

## API Endpoints

| Method | Path                    | Description                |
| ------ | ----------------------- | -------------------------- |
| POST   | `/documents/upload`     | Upload a document          |
| GET    | `/documents`            | List documents             |
| DELETE | `/documents/:id`        | Remove a document          |
| POST   | `/query`                | Ask a question             |
| GET    | `/query/history`        | Past queries with verdicts |
| GET    | `/gaps`                 | Knowledge gap log          |
| GET    | `/gaps/clusters`        | Clustered gap themes       |
| PATCH  | `/gaps/:id/resolve`     | Mark gap resolved          |
| GET    | `/analytics/confidence` | Confidence trends          |
| GET    | `/analytics/audits`     | Critic verdict breakdown   |
| GET    | `/analytics/stats`      | Document/gap/query counts  |
| GET    | `/health`               | Health check               |
| GET    | `/metrics`              | Prometheus metrics         |

## Project Structure

```
confess/
├── apps/
│   ├── api/          # Hono API server
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared TypeScript types
├── infra/
│   └── docker-compose.yml
├── tests/
│   ├── unit/         # Vitest unit tests
│   ├── integration/  # Integration tests
│   └── e2e/          # Playwright E2E tests
└── .github/workflows/# CI/CD
```

## Configuration

Confidence scoring weights and thresholds are configurable through environment variables:

| Variable               | Default                                             | Description                  |
| ---------------------- | --------------------------------------------------- | ---------------------------- |
| `WEIGHT_SIMILARITY`    | 0.5                                                 | Max similarity weight        |
| `WEIGHT_GAP`           | 0.3                                                 | Similarity gap weight        |
| `WEIGHT_COVERAGE`      | 0.2                                                 | Term coverage weight         |
| `CONFIDENCE_THRESHOLD` | 0.65                                                | Minimum confidence to answer |
| `OPENAI_API_KEY`       | —                                                   | OpenAI API key               |
| `DATABASE_URL`         | postgresql://confess:confess@localhost:5432/confess | Postgres connection          |
| `REDIS_URL`            | redis://localhost:6379                              | Redis connection             |

## What I Learned

Building a RAG system that refuses to answer is harder than building one that always answers. The confidence scoring required careful balancing — too high a threshold and nothing gets answered, too low and you're back to hallucinating. The critic agent caught subtle hallucinations that looked reasonable but cited the wrong source. Gap clustering turned out to be the most useful feature in practice — it tells you exactly what documentation is missing without anyone having to guess.

## License

MIT
