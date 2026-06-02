from datetime import datetime, timezone
import json
from pathlib import Path
from threading import RLock
from uuid import uuid4

from .config import CHAT_HISTORY_DIR
from .models import ChatMessage, ChatSession, ChatSummary, Citation


history_lock = RLock()


def _history_path(document_id: str) -> Path:
    return CHAT_HISTORY_DIR / f"{document_id}.json"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _title_from_question(question: str) -> str:
    cleaned = " ".join(question.split())
    return cleaned[:52] + ("..." if len(cleaned) > 52 else "")


def _summary(session: ChatSession) -> ChatSummary:
    return ChatSummary(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(session.messages),
    )


def _read_sessions(document_id: str) -> list[ChatSession]:
    path = _history_path(document_id)
    if not path.exists():
        return []

    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        # Preserve the original flat-history format as one migrated session.
        messages = [ChatMessage.model_validate(item) for item in payload]
        if not messages:
            return []
        created_at = messages[0].created_at
        updated_at = messages[-1].created_at
        first_question = next(
            (message.content for message in messages if message.role == "user"),
            "Previous conversation",
        )
        migrated_sessions = [
            ChatSession(
                id=uuid4().hex,
                document_id=document_id,
                title=_title_from_question(first_question),
                created_at=created_at,
                updated_at=updated_at,
                messages=messages,
            )
        ]
        _write_sessions(document_id, migrated_sessions)
        return migrated_sessions

    return [ChatSession.model_validate(item) for item in payload.get("chats", [])]


def _write_sessions(document_id: str, sessions: list[ChatSession]) -> None:
    path = _history_path(document_id)
    temporary_path = path.with_suffix(".tmp")
    serialized = json.dumps(
        {"chats": [session.model_dump(mode="json") for session in sessions]},
        ensure_ascii=False,
        indent=2,
    )
    temporary_path.write_text(serialized, encoding="utf-8")
    temporary_path.replace(path)


def list_chats() -> list[ChatSummary]:
    with history_lock:
        sessions = [
            session
            for path in CHAT_HISTORY_DIR.glob("*.json")
            for session in _read_sessions(path.stem)
        ]
    return sorted((_summary(session) for session in sessions), key=lambda item: item.updated_at, reverse=True)


def create_chat(document_id: str) -> ChatSummary:
    with history_lock:
        sessions = _read_sessions(document_id)
        now = _now()
        session = ChatSession(
            id=uuid4().hex,
            document_id=document_id,
            title="New conversation",
            created_at=now,
            updated_at=now,
        )
        sessions.append(session)
        _write_sessions(document_id, sessions)
    return _summary(session)


def list_messages(chat_id: str) -> list[ChatMessage]:
    with history_lock:
        for path in CHAT_HISTORY_DIR.glob("*.json"):
            for session in _read_sessions(path.stem):
                if session.id == chat_id:
                    return session.messages
    return []


def get_chat(chat_id: str) -> ChatSession | None:
    with history_lock:
        for path in CHAT_HISTORY_DIR.glob("*.json"):
            for session in _read_sessions(path.stem):
                if session.id == chat_id:
                    return session
    return None


def append_exchange(
    document_id: str,
    chat_id: str | None,
    question: str,
    answer: str,
    citations: list[Citation],
) -> ChatSummary:
    with history_lock:
        sessions = _read_sessions(document_id)
        session = next((item for item in sessions if item.id == chat_id), None)
        now = _now()
        if session is None:
            session = ChatSession(
                id=uuid4().hex,
                document_id=document_id,
                title=_title_from_question(question),
                created_at=now,
                updated_at=now,
            )
            sessions.append(session)
        elif not session.messages:
            session.title = _title_from_question(question)

        session.messages.extend(
            [
                ChatMessage(id=uuid4().hex, role="user", content=question, created_at=now),
                ChatMessage(
                    id=uuid4().hex,
                    role="assistant",
                    content=answer,
                    citations=citations,
                    created_at=now,
                ),
            ]
        )
        session.updated_at = now
        _write_sessions(document_id, sessions)
    return _summary(session)


def delete_history(document_id: str) -> None:
    with history_lock:
        _history_path(document_id).unlink(missing_ok=True)
