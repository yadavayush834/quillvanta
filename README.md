# Papertrail

Papertrail is a local-first PDF question-answering app. PDF extraction, chunking,
embeddings, and the vector database run on your laptop. GroqCloud is used only
to generate answers from the retrieved passages.

## Architecture

```text
React + Vite
    -> FastAPI
        -> PyMuPDF4LLM for page-aware PDF extraction
        -> ChromaDB for local MiniLM embeddings and storage
        -> Groq API for answer generation
```

## Prerequisites

- Node.js 20+
- Corepack (`corepack pnpm --version`)
- Python 3.11 or 3.12
- A free Groq API key from https://console.groq.com/keys

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Add your Groq API key to `backend/.env`, then run:

```powershell
uvicorn app.main:app --reload --port 8000
```

The first uploaded PDF downloads ChromaDB's local MiniLM embedding model
(about 80 MB) into `backend/data/cache/`.

## Frontend setup

```powershell
cd frontend
corepack pnpm install
corepack pnpm run dev
```

Open http://localhost:5173.

## V1 limits

- Text-based PDFs only. Scanned PDFs may produce little or no extracted text.
- Uploaded documents and vectors are stored locally under `backend/data/`.
- Groq free-tier rate limits apply.
