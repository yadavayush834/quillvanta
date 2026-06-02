import type { Document } from "./types";

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

export async function askQuestion(documentId: string, question: string) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, question }),
  });
  return parseResponse<{ answer: string; citations: { page: number }[] }>(response);
}

