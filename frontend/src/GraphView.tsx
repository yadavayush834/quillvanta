import { ChatIcon, FileIcon, GraphIcon } from "./icons";
import type { ChatSummary, Document } from "./types";

type GraphViewProps = {
  chats: ChatSummary[];
  documents: Document[];
  onSelectChat: (chat: ChatSummary) => void;
};

export function GraphView({ chats, documents, onSelectChat }: GraphViewProps) {
  const slotWidth = 170;
  const horizontalPadding = 100;
  const rootY = 92;
  const chatY = 292;
  const documentLayouts = documents.map((document) => ({
    document,
    chats: chats.filter((chat) => chat.document_id === document.id),
  }));
  const slotCount = documentLayouts.reduce((total, item) => total + Math.max(item.chats.length, 1), 0);
  const width = Math.max(1000, horizontalPadding * 2 + (slotCount - 1) * slotWidth);
  const height = 450;
  let nextSlot = 0;
  const treeLayouts = documentLayouts.map((item) => {
    const slots = Math.max(item.chats.length, 1);
    const childX = item.chats.map((_, index) => horizontalPadding + (nextSlot + index) * slotWidth);
    const rootX = childX.length > 0
      ? (childX[0] + childX[childX.length - 1]) / 2
      : horizontalPadding + nextSlot * slotWidth;
    nextSlot += slots;
    return { ...item, childX, rootX };
  });

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
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Document and chat relationship tree">
            {treeLayouts.flatMap(({ chats: documentChats, childX, rootX }) =>
              documentChats.map((chat, index) => (
                <path className="graph-edge" d={`M ${rootX} ${rootY + 94} L ${childX[index]} ${chatY}`} key={chat.id} />
              )),
            )}
          </svg>
          {treeLayouts.map(({ document, chats: documentChats, childX, rootX }) => (
            <div className="graph-tree" key={document.id}>
              <div className="graph-node document-node" style={{ left: rootX, top: rootY }}>
                <span className="graph-node-circle"><FileIcon /></span>
                <span className="graph-node-label"><strong title={document.filename}>{document.filename}</strong><small>{document.page_count} pages</small></span>
              </div>
              {documentChats.map((chat, index) => (
                <button className="graph-node chat-node" key={chat.id} style={{ left: childX[index], top: chatY }} onClick={() => onSelectChat(chat)}>
                  <span className="graph-node-circle"><ChatIcon /></span>
                  <span className="graph-node-label"><strong title={chat.title}>{chat.title}</strong><small>{chat.message_count} messages</small></span>
                </button>
              ))}
            </div>
          ))}
          {chats.length === 0 && <p className="graph-placeholder">Start a chat to create the first connection.</p>}
        </div>
      )}
    </section>
  );
}
