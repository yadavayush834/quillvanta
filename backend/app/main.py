from pathlib import Path
import re
import shutil
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from io import BytesIO

from .chunker import chunk_pages
from .chat_history import append_exchange, create_chat, delete_history, get_chat, list_chats, list_messages
from .config import FRONTEND_ORIGIN, MAX_UPLOAD_BYTES, UPLOAD_DIR
from .groq_client import answer_question
from .models import ChatMessage, ChatRequest, ChatResponse, ChatSummary, Citation, Document
from .pdf_parser import extract_pages
from .pdf_export import export_chat_pdf
from .vector_store import add_document, delete_document, list_documents, search_document


app = FastAPI(title="Quillvanta API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
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
    delete_history(document_id)
    (UPLOAD_DIR / f"{document_id}.pdf").unlink(missing_ok=True)


@app.get("/api/chats", response_model=list[ChatSummary])
def chats() -> list[ChatSummary]:
    return list_chats()


@app.post("/api/documents/{document_id}/chats", response_model=ChatSummary)
def new_chat(document_id: str) -> ChatSummary:
    return create_chat(document_id)


@app.get("/api/chats/{chat_id}/messages", response_model=list[ChatMessage])
def chat_messages(chat_id: str) -> list[ChatMessage]:
    return list_messages(chat_id)


@app.get("/api/chats/{chat_id}/export.pdf")
def export_chat(chat_id: str) -> StreamingResponse:
    session = get_chat(chat_id)
    if session is None or not session.messages:
        raise HTTPException(status_code=404, detail="Chat not found or empty.")

    document = next((item for item in list_documents() if item.id == session.document_id), None)
    if document is None:
        raise HTTPException(status_code=404, detail="Source document not found.")

    filename = re.sub(r"[^a-zA-Z0-9_-]+", "-", session.title).strip("-")[:60] or "quillvanta-chat"
    return StreamingResponse(
        BytesIO(export_chat_pdf(session, document)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    passages = search_document(request.document_id, request.question)
    if not passages:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        answer, usage = await answer_question(request.question, passages)
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail="Groq could not answer the request.") from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    pages = sorted({passage["page"] for passage in passages})
    summary = append_exchange(request.document_id, request.chat_id, request.question, answer, [Citation(page=page) for page in pages], usage)
    return ChatResponse(
        chat_id=summary.id,
        answer=answer,
        citations=[Citation(page=page) for page in pages],
        usage=usage,
    )
