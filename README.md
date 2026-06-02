# Quillvanta

Quillvanta is a local-first PDF question-answering app. PDF extraction, chunking,
embeddings, and the vector database run on your laptop. GroqCloud is used only
to generate answers from the retrieved passages.

## Why Quillvanta is different

Many simple PDF chatbots send the entire PDF to an LLM every time the user asks
a question. That becomes slow and wasteful as documents grow.

Quillvanta uses a local retrieval-augmented generation (RAG) pipeline:

1. PyMuPDF4LLM extracts page-aware text from the uploaded PDF.
2. The backend splits each page into overlapping chunks.
3. ChromaDB creates MiniLM embeddings locally on your CPU and stores them on
   your device.
4. For each question, Quillvanta retrieves only the five most relevant chunks.
5. Only those passages are sent to GroqCloud for answer generation.

This approach gives Quillvanta a few practical advantages:

- **Lower cloud token usage:** unrelated pages are not repeatedly sent to the
  LLM.
- **Page citations:** answers include the PDF page numbers used during
  retrieval.
- **Local-first privacy:** uploaded PDFs, extracted text, embeddings, and the
  vector database stay on your device.
- **CPU-friendly setup:** the laptop runs document processing and compact
  MiniLM embeddings locally; GroqCloud handles the expensive answer generation.
- **Readable answers:** the model is instructed to return structured Markdown
  with headings, lists, inline code, and fenced code blocks.
- **Developer-friendly code blocks:** fenced examples receive local syntax
  highlighting for keywords, types, strings, comments, and numbers.
- **Dark mode:** the interface includes a light/dark theme toggle and remembers
  the selected theme on the device.
- **Visible local storage:** the sidebar reports how much disk space the
  uploaded PDFs consume.
- **Persistent chat history:** successful question-and-answer exchanges are
  stored locally and restored when you reopen a PDF.
- **Separate conversations:** create and revisit multiple saved chat sessions
  for the same document.
- **Knowledge graph:** open the graph page to inspect which saved chats are
  connected to each uploaded PDF.
- **PDF chat exports:** download an active conversation as a polished PDF with
  headings, citations, spacing, and syntax-colored code examples.

## Estimated token savings

Token savings depend on the document and the question, so there is no single
guaranteed percentage.

The current implementation retrieves at most **five chunks**, with up to
**800 words per chunk**. Therefore, one answer sends at most about **
retrieved words** of PDF context to GroqCloud. Using the common rough estimate
of `1 token ~= 0.75 words`, that is approximately **5,300 PDF-context tokens**
before adding the system prompt and the user's question.

You can estimate the PDF-context savings with:

```text
savings percentage = (1 - retrieved context tokens / full PDF tokens) * 100
```

Example estimates:

| PDF size | Sending the entire PDF | Quillvanta retrieved context | Approximate PDF-context savings |
| --- | ---: | ---: | ---: |
| 10,000 words | ~13,300 tokens | up to ~5,300 tokens | up to ~60% |
| 30,000 words | ~40,000 tokens | up to ~5,300 tokens | up to ~87% |
| 100,000 words | ~133,300 tokens | up to ~5,300 tokens | up to ~96% |

These are upper-bound context estimates based on the current chunking settings.
Actual requests may use fewer words because retrieved chunks can be shorter than
800 words. The estimates compare PDF context only; they do not include the
question, system instructions, or generated answer tokens.

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
- Chat history is stored locally under `backend/data/chat_history/` and is
  removed when its PDF is deleted.
- Groq free-tier rate limits apply.
- Token savings vary by PDF length and retrieval quality.
