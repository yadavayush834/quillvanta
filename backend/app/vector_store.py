from collections.abc import Iterable

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

from .chunker import Chunk
from .config import CHROMA_DIR, EMBEDDING_CACHE_DIR, UPLOAD_DIR
from .models import Document


client = chromadb.PersistentClient(path=str(CHROMA_DIR))
embedding_function = ONNXMiniLM_L6_V2()
embedding_function.DOWNLOAD_PATH = EMBEDDING_CACHE_DIR
collection = client.get_or_create_collection(
    name="papertrail_documents_v1",
    metadata={"hnsw:space": "cosine"},
    embedding_function=embedding_function,
)


def add_document(document: Document, chunks: Iterable[Chunk]) -> None:
    chunk_list = list(chunks)
    collection.add(
        ids=[f"{document.id}:{chunk.index}" for chunk in chunk_list],
        documents=[chunk.text for chunk in chunk_list],
        metadatas=[
            {
                "document_id": document.id,
                "filename": document.filename,
                "page": chunk.page,
                "page_count": document.page_count,
                "size_bytes": document.size_bytes,
            }
            for chunk in chunk_list
        ],
    )


def list_documents() -> list[Document]:
    results = collection.get(include=["metadatas"])
    documents: dict[str, Document] = {}
    for metadata in results["metadatas"] or []:
        document_id = str(metadata["document_id"])
        documents[document_id] = Document(
            id=document_id,
            filename=str(metadata["filename"]),
            page_count=int(metadata["page_count"]),
            size_bytes=(UPLOAD_DIR / f"{document_id}.pdf").stat().st_size
            if (UPLOAD_DIR / f"{document_id}.pdf").exists()
            else int(metadata.get("size_bytes", 0)),
        )
    return sorted(documents.values(), key=lambda item: item.filename.lower())


def search_document(document_id: str, question: str, limit: int = 5) -> list[dict]:
    results = collection.query(
        query_texts=[question],
        n_results=limit,
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )
    return [
        {"text": text, "page": int(metadata["page"])}
        for text, metadata in zip(
            results["documents"][0],
            results["metadatas"][0],
            strict=True,
        )
    ]


def delete_document(document_id: str) -> None:
    collection.delete(where={"document_id": document_id})
