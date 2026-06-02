import { ChatIcon, FileIcon, GraphIcon } from "./icons";
import type { ChatSummary, Document } from "./types";

type GraphViewProps = {
  chats: ChatSummary[];
  documents: Document[];
  onSelectChat: (chat: ChatSummary) => void;
};

export function GraphView({ chats, documents, onSelectChat }: GraphViewProps) {
  const width = 920;
  const rowHeight = 104;
  const height = Math.max(420, Math.max(documents.length, chats.length) * rowHeight + 80);
  const documentY = new Map(documents.map((document, index) => [document.id, 70 + index * rowHeight]));

  return (
    <section className="graph-page">
      <div className="graph-heading">
        <div>
          <h2>Knowledge graph</h2>
          <p>Explore how your saved conversations connect to uploaded documents.</p>
        </div>
        <div className="graph-legend"><span className="document-dot" /> Documents <span className="chat-dot" /> Chats</div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state graph-empty"><GraphIcon size={34} /><h2>No connections yet</h2><p>Upload a PDF and start a chat to build your graph.</p></div>
      ) : (
        <div className="graph-canvas">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Document and chat relationship graph">
            {chats.map((chat, index) => {
              const startY = documentY.get(chat.document_id) ?? 70;
              const endY = 70 + index * rowHeight;
              return <path className="graph-edge" d={`M 245 ${startY} C 390 ${startY}, 500 ${endY}, 645 ${endY}`} key={chat.id} />;
            })}
          </svg>
          <div className="graph-column document-column">
            <h3>Documents</h3>
            {documents.map((document, index) => (
              <div className="graph-node document-node" key={document.id} style={{ top: 48 + index * rowHeight }}>
                <FileIcon /><span><strong>{document.filename}</strong><small>{document.page_count} pages</small></span>
              </div>
            ))}
          </div>
          <div className="graph-column chat-column">
            <h3>Saved chats</h3>
            {chats.map((chat, index) => (
              <button className="graph-node chat-node" key={chat.id} style={{ top: 48 + index * rowHeight }} onClick={() => onSelectChat(chat)}>
                <ChatIcon /><span><strong>{chat.title}</strong><small>{chat.message_count} messages</small></span>
              </button>
            ))}
            {chats.length === 0 && <p className="graph-placeholder">Start a chat to create the first connection.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
