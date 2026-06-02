from pydantic import BaseModel, Field


class Document(BaseModel):
    id: str
    filename: str
    page_count: int
    size_bytes: int = 0


class ChatRequest(BaseModel):
    document_id: str
    question: str = Field(min_length=2, max_length=1200)


class Citation(BaseModel):
    page: int


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
