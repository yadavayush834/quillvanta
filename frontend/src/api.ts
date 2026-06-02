import type { ChatSummary, Document, Message, TokenUsage } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Something went wrong. Please try again.");
  }
  return response.json() as Promise<T>;
}

export async function fetchDocuments(): Promise<Document[]> {
  const response = await fetch(`${API_URL}/api/documents`);
  return parseResponse<Document[]>(response);
}

export async function uploadDocument(file: File): Promise<Document> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_URL}/api/documents/upload`, {
    method: "POST",
    body,
  });
  return parseResponse<Document>(response);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Could not delete this document.");
  }
}

export async function fetchChats(): Promise<ChatSummary[]> {
  const response = await fetch(`${API_URL}/api/chats`);
  return parseResponse<ChatSummary[]>(response);
}

export async function createChat(documentId: string): Promise<ChatSummary> {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/chats`, { method: "POST" });
  return parseResponse<ChatSummary>(response);
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`);
  return parseResponse<Message[]>(response);
}

export async function downloadChatPdf(chatId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/chats/${chatId}/export.pdf`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Could not export this chat.");
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "quillvanta-chat.pdf";
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function askQuestion(documentId: string, chatId: string, question: string) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, chat_id: chatId, question }),
  });
  return parseResponse<{ chat_id: string; answer: string; citations: { page: number }[]; usage: TokenUsage }>(response);
}
