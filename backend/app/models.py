from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Document(BaseModel):
    id: str
    filename: str
    page_count: int
    size_bytes: int = 0


class ChatRequest(BaseModel):
    document_id: str
    chat_id: str | None = None
    question: str = Field(min_length=2, max_length=1200)


class Citation(BaseModel):
    page: int


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0
    context_characters: int = 0


class ChatResponse(BaseModel):
    chat_id: str
    answer: str
    citations: list[Citation]
    usage: TokenUsage


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: list[Citation] = Field(default_factory=list)
    usage: TokenUsage | None = None
    created_at: datetime


class ChatSession(BaseModel):
    id: str
    document_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatSummary(BaseModel):
    id: str
    document_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
