# Spendly

Full-stack personal expense assistant powered by AI: Next.js 16 Web application, FastAPI service, PostgreSQL, Gemini 2.0 Flash (Multimodal OCR & reasoning), and Qdrant vector database (RAG).

## Repository layout

```text
backend/                 FastAPI, SQLAlchemy, PostgreSQL, Qdrant, LangGraph agent, service boundaries
web/                     Next.js 16 (App Router), Vanilla CSS, responsive dashboard, receipt scanner, AI chat
docs/                    Architecture, getting-started, and release documentation
compose.yaml             Full-stack Docker Compose configuration (Web, API, DB, Qdrant)
```

## Quick Start (Docker)

Run the entire product stack with a single command:

```powershell
docker compose up --build
```

- **Web Application**: http://localhost:3000
- **API & Docs**: http://localhost:8000/docs
- **Qdrant Vector DB**: http://localhost:6333/dashboard

## Run locally (Development)

Follow [docs/getting-started.md](docs/getting-started.md) for step-by-step setup of the FastAPI backend and Next.js web application.

## Key Features

1. **Multimodal Receipt Scanner**: Powered by Gemini Flash Vision to extract items, store, date, prices, and categories from images with draft review.
2. **Voice-to-Expense & Natural Language Entry**: Web Speech API (`vi-VN` / `en-US`) and Gemini NLP parsing slang (e.g. "450k", "5 củ", "2 xị", "hôm qua"), auto-detecting Income vs Expense with 1-click confirmation.
3. **Multi-Wallet Management**: Manage cash, bank accounts, credit cards, and e-wallets (Momo), with deterministic live balances and inter-wallet money transfers.
4. **Proactive AI Financial Insights & Forecast**: Real-time daily burn rate calculation, projected month-end spending, financial health score (0-100), and automated category optimization advice.
5. **Monthly Budgeting & Limits**: Visual spending progress bar with dynamic threshold alerts (Green / Amber / Red) and safe-to-spend per day guidance.
6. **Income vs Expense & Net Cashflow**: Separate tracking of earnings and expenses with real-time Net Cashflow and Savings Rate calculation.
7. **Deterministic Financial Calculation**: Financial summaries, monthly totals, and category breakdowns are computed strictly in SQL/Python to eliminate math hallucinations.
8. **LangGraph AI Assistant**: Conversational assistant equipped with deterministic tools (`query_db` for SQL metrics & wallet balances, `search_memory` for semantic transaction search).
9. **Qdrant Vector RAG**: Automatic vector indexing upon transaction confirmation for natural language semantic retrieval.

