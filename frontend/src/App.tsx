import { useEffect, useRef, useState } from "react";
import { askQuestion, createChat, deleteDocument, downloadChatPdf, fetchChats, fetchDocuments, fetchMessages, uploadDocument } from "./api";
import { GraphView } from "./GraphView";
import { BookIcon, ChatIcon, DownloadIcon, FileIcon, GraphIcon, MoonIcon, PlusIcon, SendIcon, SparkleIcon, SunIcon, TrashIcon, UploadIcon } from "./icons";
import { MarkdownAnswer } from "./MarkdownAnswer";
import type { ChatSummary, Document, Message } from "./types";

const createId = () => crypto.randomUUID();
type Theme = "light" | "dark";
type SidebarView = "documents" | "chats";
type WorkspaceView = "chat" | "graph";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [sidebarView, setSidebarView] = useState<SidebarView>("documents");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("chat");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("quillvanta-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = documents.find((document) => document.id === selectedId);
  const activeMessages = selectedChatId ? messages[selectedChatId] ?? [] : [];
  const storageUsed = documents.reduce((total, document) => total + document.size_bytes, 0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("quillvanta-theme", theme);
  }, [theme]);

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchChats()])
      .then(([documentItems, chatItems]) => {
        setDocuments(documentItems);
        setChats(chatItems);
        setSelectedId(chatItems[0]?.document_id ?? documentItems[0]?.id ?? "");
        setSelectedChatId(chatItems[0]?.id ?? "");
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChatId) return;

    setLoadingHistory(true);
    fetchMessages(selectedChatId)
      .then((items) => setMessages((messagesByChat) => ({ ...messagesByChat, [selectedChatId]: items })))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoadingHistory(false));
  }, [selectedChatId]);

  function selectDocument(document: Document) {
    setSelectedId(document.id);
    setSelectedChatId(chats.find((chat) => chat.document_id === document.id)?.id ?? "");
    setWorkspaceView("chat");
  }

  function selectChat(chat: ChatSummary) {
    setSelectedId(chat.document_id);
    setSelectedChatId(chat.id);
    setSidebarView("chats");
    setWorkspaceView("chat");
  }

  async function handleNewChat() {
    if (!selected) return;
    setError("");
    try {
      const chat = await createChat(selected.id);
      setChats((items) => [chat, ...items]);
      setMessages((items) => ({ ...items, [chat.id]: [] }));
      setSelectedChatId(chat.id);
      setSidebarView("chats");
      setWorkspaceView("chat");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create a new chat.");
    }
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const document = await uploadDocument(file);
      setDocuments((items) => [...items, document]);
      setSelectedId(document.id);
      setSelectedChatId("");
      setWorkspaceView("chat");
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
      const remainingDocuments = documents.filter((item) => item.id !== selected.id);
      setDocuments(remainingDocuments);
      setChats((items) => items.filter((chat) => chat.document_id !== selected.id));
      setMessages((items) => {
        const next = { ...items };
        chats.filter((chat) => chat.document_id === selected.id).forEach((chat) => delete next[chat.id]);
        return next;
      });
      setSelectedId(remainingDocuments[0]?.id ?? "");
      setSelectedChatId(chats.find((chat) => chat.document_id === remainingDocuments[0]?.id)?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this PDF.");
    }
  }

  async function handleExportPdf() {
    if (!selectedChatId || activeMessages.length === 0) return;
    setError("");
    try {
      await downloadChatPdf(selectedChatId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not export this chat.");
    }
  }

  async function handleAsk() {
    const trimmed = question.trim();
    if (!selected || trimmed.length < 2 || answering || loadingHistory) return;

    let chatId = selectedChatId;
    if (!chatId) {
      try {
        const chat = await createChat(selected.id);
        chatId = chat.id;
        setChats((items) => [chat, ...items]);
        setSelectedChatId(chat.id);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not create a new chat.");
        return;
      }
    }

    const userMessage: Message = { id: createId(), role: "user", content: trimmed };
    setQuestion("");
    setError("");
    setAnswering(true);
    setMessages((items) => ({ ...items, [chatId]: [...(items[chatId] ?? []), userMessage] }));

    try {
      const response = await askQuestion(selected.id, chatId, trimmed);
      setMessages((items) => ({
        ...items,
        [response.chat_id]: [
          ...(items[response.chat_id] ?? []),
          { id: createId(), role: "assistant", content: response.answer, citations: response.citations },
        ],
      }));
      setChats(await fetchChats());
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
          <div><h1>Quillvanta</h1><p>Ask your PDFs</p></div>
          <div className="brand-mark"><BookIcon size={17} /></div>
        </div>

        <input ref={fileInput} className="visually-hidden" type="file" accept="application/pdf" onChange={(event) => handleUpload(event.target.files?.[0])} />
        <button className="upload-button" onClick={() => fileInput.current?.click()} disabled={uploading}><UploadIcon />{uploading ? "Indexing PDF..." : "Upload PDF"}</button>

        <div className="sidebar-switch" role="tablist" aria-label="Sidebar content">
          <button className={sidebarView === "documents" ? "active" : ""} role="tab" aria-selected={sidebarView === "documents"} onClick={() => setSidebarView("documents")}><FileIcon size={16} /> Documents</button>
          <button className={sidebarView === "chats" ? "active" : ""} role="tab" aria-selected={sidebarView === "chats"} onClick={() => setSidebarView("chats")}><ChatIcon size={16} /> Chats</button>
        </div>

        {sidebarView === "documents" ? (
          <div className="sidebar-collection">
            {loading && <p className="muted-list">Loading documents...</p>}
            {!loading && documents.length === 0 && <p className="muted-list">Upload your first PDF to begin.</p>}
            {documents.map((document) => (
              <button className={`document-row ${document.id === selectedId ? "selected" : ""}`} key={document.id} onClick={() => selectDocument(document)}>
                <FileIcon /><span><strong>{document.filename}</strong><small>{document.page_count} pages</small></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="sidebar-collection">
            <button className="new-chat-button" onClick={handleNewChat} disabled={!selected}><PlusIcon /> New chat</button>
            {chats.length === 0 && <p className="muted-list">Start a conversation to save it here.</p>}
            {chats.map((chat) => (
              <button className={`chat-row ${chat.id === selectedChatId ? "selected" : ""}`} key={chat.id} onClick={() => selectChat(chat)}>
                <ChatIcon /><span><strong>{chat.title}</strong><small>{documents.find((document) => document.id === chat.document_id)?.filename ?? "Deleted document"} · {chat.message_count} messages</small></span>
              </button>
            ))}
          </div>
        )}

        <button className={`graph-nav-button ${workspaceView === "graph" ? "active" : ""}`} onClick={() => setWorkspaceView("graph")}><GraphIcon /> Knowledge graph</button>
        <div className="storage-note"><span>Local storage</span><strong>{formatBytes(storageUsed)} used</strong><small>{documents.length} {documents.length === 1 ? "PDF" : "PDFs"} stored on this device</small></div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><strong>{workspaceView === "graph" ? "Knowledge graph" : selected?.filename ?? "No document selected"}</strong>{workspaceView === "chat" && selected && <span>{selected.page_count} pages</span>}</div>
          <div className="topbar-actions">
            <button className="icon-button" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? <SunIcon /> : <MoonIcon />}</button>
            {workspaceView === "chat" && selected && <button className="export-button" title="Save chat as PDF" aria-label="Save chat as PDF" onClick={handleExportPdf} disabled={!selectedChatId || activeMessages.length === 0}><DownloadIcon /><span>Save as PDF</span></button>}
            {workspaceView === "chat" && selected && <button className="icon-button" title="Delete PDF" aria-label="Delete PDF" onClick={handleDelete}><TrashIcon /></button>}
          </div>
        </header>

        {workspaceView === "graph" ? <GraphView chats={chats} documents={documents} onSelectChat={selectChat} /> : (
          <section className="conversation">
            <div className="conversation-inner">
              {selected ? (
                <>
                  <div className="hint"><SparkleIcon /><span>{selectedChatId ? "Continue this saved conversation" : `Ask a question about ${selected.filename} to get started.`}</span></div>
                  <div className="messages">
                    {activeMessages.length === 0 && <div className="empty-state"><ChatIcon size={30} /><h2>{loadingHistory ? "Loading chat history..." : "Start with a question"}</h2><p>{loadingHistory ? "Restoring your saved conversation." : "Ask for a summary, a key fact, or an explanation from your PDF."}</p></div>}
                    {activeMessages.map((message) => (
                      <article className={`message ${message.role}`} key={message.id}>
                        <div className="avatar">{message.role === "user" ? "You" : <SparkleIcon size={18} />}</div>
                        <div className="message-body">
                          {message.role === "assistant" ? <MarkdownAnswer content={message.content} /> : <p>{message.content}</p>}
                          {message.citations && message.citations.length > 0 && <div className="citations"><BookIcon />Sources: pages {message.citations.map((citation) => citation.page).join(", ")}</div>}
                        </div>
                      </article>
                    ))}
                    {answering && <article className="message assistant"><div className="avatar"><SparkleIcon size={18} /></div><div className="message-body typing">Reading retrieved passages...</div></article>}
                  </div>
                </>
              ) : <div className="empty-state no-document"><FileIcon size={34} /><h2>Upload a PDF to begin</h2><p>Quillvanta will index the text locally so you can ask focused questions.</p><button className="secondary-button" onClick={() => fileInput.current?.click()}>Choose PDF</button></div>}
            </div>
            <div className="composer-wrap">
              {error && <p className="error-message">{error}</p>}
              <div className="composer"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleAsk()} placeholder={selected ? "Ask another question" : "Upload a PDF before asking a question"} disabled={!selected || answering || loadingHistory} /><button aria-label="Send question" onClick={handleAsk} disabled={!selected || question.trim().length < 2 || answering || loadingHistory}><SendIcon /></button></div>
              <p className="disclaimer">Answers are generated from retrieved passages. Verify important details in the source PDF.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
