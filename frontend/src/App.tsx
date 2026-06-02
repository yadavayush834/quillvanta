import { useEffect, useRef, useState } from "react";
import { askQuestion, deleteDocument, fetchDocuments, uploadDocument } from "./api";
import { BookIcon, FileIcon, SendIcon, SparkleIcon, TrashIcon, UploadIcon } from "./icons";
import { MarkdownAnswer } from "./MarkdownAnswer";
import type { Document, Message } from "./types";

const createId = () => crypto.randomUUID();

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = documents.find((document) => document.id === selectedId);
  const activeMessages = selected ? messages[selected.id] ?? [] : [];
  const storageUsed = documents.reduce((total, document) => total + document.size_bytes, 0);

  useEffect(() => {
    fetchDocuments()
      .then((items) => {
        setDocuments(items);
        setSelectedId(items[0]?.id ?? "");
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(file?: File) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const document = await uploadDocument(file);
      setDocuments((items) => [...items, document]);
      setSelectedId(document.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload this PDF.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setError("");
    try {
      await deleteDocument(selected.id);
      setDocuments((items) => items.filter((item) => item.id !== selected.id));
      setMessages((items) => {
        const next = { ...items };
        delete next[selected.id];
        return next;
      });
      setSelectedId(documents.find((item) => item.id !== selected.id)?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this PDF.");
    }
  }

  async function handleAsk() {
    const trimmed = question.trim();
    if (!selected || trimmed.length < 2 || answering) return;

    const userMessage: Message = { id: createId(), role: "user", content: trimmed };
    setQuestion("");
    setError("");
    setAnswering(true);
    setMessages((items) => ({
      ...items,
      [selected.id]: [...(items[selected.id] ?? []), userMessage],
    }));

    try {
      const response = await askQuestion(selected.id, trimmed);
      setMessages((items) => ({
        ...items,
        [selected.id]: [
          ...(items[selected.id] ?? []),
          { id: createId(), role: "assistant", content: response.answer, citations: response.citations },
        ],
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not answer that question.");
    } finally {
      setAnswering(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>Papertrail</h1>
            <p>Ask your PDFs</p>
          </div>
          <div className="brand-mark"><BookIcon size={17} /></div>
        </div>

        <input ref={fileInput} className="visually-hidden" type="file" accept="application/pdf" onChange={(event) => handleUpload(event.target.files?.[0])} />
        <button className="upload-button" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <UploadIcon />
          {uploading ? "Indexing PDF..." : "Upload PDF"}
        </button>

        <h2>Documents</h2>
        <div className="document-list">
          {loading && <p className="muted-list">Loading documents...</p>}
          {!loading && documents.length === 0 && <p className="muted-list">Upload your first PDF to begin.</p>}
          {documents.map((document) => (
            <button
              className={`document-row ${document.id === selectedId ? "selected" : ""}`}
              key={document.id}
              onClick={() => setSelectedId(document.id)}
            >
              <FileIcon />
              <span>
                <strong>{document.filename}</strong>
                <small>{document.page_count} pages</small>
              </span>
            </button>
          ))}
        </div>

        <div className="storage-note">
          <span>Local storage</span>
          <strong>{formatBytes(storageUsed)} used</strong>
          <small>{documents.length} {documents.length === 1 ? "PDF" : "PDFs"} stored on this device</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <strong>{selected?.filename ?? "No document selected"}</strong>
            {selected && <span>{selected.page_count} pages</span>}
          </div>
          {selected && <button className="icon-button" title="Delete PDF" onClick={handleDelete}><TrashIcon /></button>}
        </header>

        <section className="conversation">
          <div className="conversation-inner">
            {selected ? (
              <>
                <div className="hint">
                  <SparkleIcon />
                  <span>Ask a question about {selected.filename} to get started.</span>
                </div>
                <div className="messages">
                  {activeMessages.length === 0 && (
                    <div className="empty-state">
                      <FileIcon size={30} />
                      <h2>Start with a question</h2>
                      <p>Ask for a summary, a key fact, or an explanation from your PDF.</p>
                    </div>
                  )}
                  {activeMessages.map((message) => (
                    <article className={`message ${message.role}`} key={message.id}>
                      <div className="avatar">{message.role === "user" ? "You" : <SparkleIcon size={18} />}</div>
                      <div className="message-body">
                        {message.role === "assistant" ? <MarkdownAnswer content={message.content} /> : <p>{message.content}</p>}
                        {message.citations && message.citations.length > 0 && (
                          <div className="citations">
                            <BookIcon />
                            Sources: pages {message.citations.map((citation) => citation.page).join(", ")}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {answering && (
                    <article className="message assistant">
                      <div className="avatar"><SparkleIcon size={18} /></div>
                      <div className="message-body typing">Reading retrieved passages...</div>
                    </article>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state no-document">
                <FileIcon size={34} />
                <h2>Upload a PDF to begin</h2>
                <p>Papertrail will index the text locally so you can ask focused questions.</p>
                <button className="secondary-button" onClick={() => fileInput.current?.click()}>Choose PDF</button>
              </div>
            )}
          </div>

          <div className="composer-wrap">
            {error && <p className="error-message">{error}</p>}
            <div className="composer">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAsk()}
                placeholder={selected ? "Ask another question" : "Upload a PDF before asking a question"}
                disabled={!selected || answering}
              />
              <button aria-label="Send question" onClick={handleAsk} disabled={!selected || question.trim().length < 2 || answering}><SendIcon /></button>
            </div>
            <p className="disclaimer">Answers are generated from retrieved passages. Verify important details in the source PDF.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
