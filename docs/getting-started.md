# Run Spendly locally (Windows)

## Prerequisites

- Node.js 22.13 or later and npm.
- Python 3.12+ (or Docker Desktop with Linux containers enabled).
- Google Gemini API Key (for Vision OCR & Chat assistant).

---

## Method 1: Run with Docker Compose (Recommended)

1. Ensure `backend/.env` exists with your Gemini API key:
   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```
   Add your `GEMINI_API_KEY` to `backend/.env`.

2. From the project root, start all services:
   ```powershell
   docker compose up --build
   ```

3. Open:
   - **Web Application**: http://localhost:3000
   - **Backend API & Swagger**: http://localhost:8000/docs
   - **Qdrant Vector Dashboard**: http://localhost:6333/dashboard

---

## Method 2: Run Backend and Web locally (Development Mode)

### 1. Configure and run Backend

In a PowerShell window:

```powershell
Set-Location backend
Copy-Item .env.example .env
# Edit .env and set GEMINI_API_KEY
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Verify backend is healthy:
```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

### 2. Configure and run Web Application

In a second PowerShell window:

```powershell
Set-Location web
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Verifying Features

1. **Dashboard**: Navigate to `/` to view monthly totals, category breakdowns, and recent transactions.
2. **Receipt Scanner**: Go to `/receipt`, upload a receipt image (JPEG/PNG/WebP), review the Gemini Vision extracted items, and click **"Xác nhận & Lưu vào sổ chi tiêu"** to persist to DB and sync to Qdrant vector memory.
3. **AI Chat**: Go to `/chat` and use quick suggestion chips to query your financial data deterministically (`query_db`) or search past purchases semantically (`search_memory`).
