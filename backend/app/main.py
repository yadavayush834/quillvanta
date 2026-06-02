from pathlib import Path
import shutil
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import httpx

from .chunker import chunk_pages
from .config import FRONTEND_ORIGIN, MAX_UPLOAD_BYTES, UPLOAD_DIR
from .groq_client import answer_question
from .models import ChatRequest, ChatResponse, Citation, Document
from .pdf_parser import extract_pages
from .vector_store import add_document, delete_document, list_documents, search_document


app = FastAPI(title="Papertrail API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/documents", response_model=list[Document])
def documents() -> list[Document]:
    return list_documents()


@app.post("/api/documents/upload", response_model=Document)
def upload_document(file: UploadFile = File(...)) -> Document:
    if file.content_type != "application/pdf" or not file.filename:
        raise HTTPException(status_code=400, detail="Upload a PDF file.")

    document_id = uuid4().hex
    target = UPLOAD_DIR / f"{document_id}.pdf"

    try:
        with target.open("wb") as output:
            shutil.copyfileobj(file.file, output)
        if target.stat().st_size > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="PDF exceeds the upload limit.")

        pages = extract_pages(target)
        document = Document(
            id=document_id,
            filename=Path(file.filename).name,
            page_count=max(page.page for page in pages),
            size_bytes=target.stat().st_size,
        )
        add_document(document, chunk_pages(pages))
        return document
    except HTTPException:
        target.unlink(missing_ok=True)
        raise
    except ValueError as error:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not index this PDF.") from error


@app.delete("/api/documents/{document_id}", status_code=204)
def remove_document(document_id: str) -> None:
    delete_document(document_id)
    (UPLOAD_DIR / f"{document_id}.pdf").unlink(missing_ok=True)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    passages = search_document(request.document_id, request.question)
    if not passages:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        answer = await answer_question(request.question, passages)
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail="Groq could not answer the request.") from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    pages = sorted({passage["page"] for passage in passages})
    return ChatResponse(
        answer=answer,
        citations=[Citation(page=page) for page in pages],
    )
