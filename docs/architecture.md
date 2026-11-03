# Architecture

## Runtime shape

```text
Next.js 16 Web Client (Port 3000)
  └─ HTTPS / REST API calls
      └─ FastAPI routes (/api/v1) → Application Services
                                       ├─ Multimodal Receipt Pipeline (Gemini 2.0 Flash Vision OCR → Review → Confirm)
                                       ├─ RAG Vector Sync (text-embedding-004 → Qdrant Vector DB)
                                       ├─ LangGraph MCP Agent (SQL facts via query_db + semantic memory via search_memory)
                                       └─ Relational Persistence (PostgreSQL / SQLite via SQLAlchemy Async)
```

Financial totals must be computed by deterministic SQL/Python aggregations, never generated or estimated by the language model.

## Backend boundaries

- `api/`: HTTP contracts, authentication dependencies (`Principal`, `require_principal`), routing, and status codes.
- `services/`: Business logic, receipt parsing & confirmation, AI chat orchestration, vector embeddings, and statistical summaries.
- `repositories/`: Database queries and atomic persistence operations.
- `models/` and `schemas/`: SQLAlchemy database entities and Pydantic public DTOs.
- `ai/`: Gemini client, LangGraph StateGraph agent, and MCP tools (`query_db`, `search_memory`).
- `core/`: Settings, database sessions, Qdrant client, authentication, and logging.

Every transaction query is scoped to the authenticated principal (`user_id`). The starter uses development API key authentication mapped to a principal; in production, integrate verified OAuth/JWT authentication (e.g., Firebase Auth, Supabase, or Auth0).

## Web boundaries

Next.js 16 App Router owns UI navigation and state:
- `web/src/app/`: Page routes (`/` Dashboard, `/receipt` Receipt Scanner, `/chat` AI Assistant).
- `web/src/components/`: Modular UI components (`dashboard/`, `receipt/`, `layout/`).
- `web/src/lib/`: Typed API client (`api.ts`), domain types (`types.ts`), and utilities (`utils.ts`).
- `web/src/i18n/`: Dual-language support (English and Vietnamese) via typed JSON dictionaries.
- `web/src/app/globals.css`: Design system with CSS variables, light/dark modes, and micro-interactions.

## Data lifecycle

Receipt images are processed transiently for extraction and not permanently stored in raw form by default. Persist only the extracted structured fields needed for the user's records. Do not log sensitive user tokens or raw financial credentials.
