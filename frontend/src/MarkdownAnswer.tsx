import { Fragment, type ReactNode } from "react";

type Block =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "separator" }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; content: string };

const CODE_KEYWORDS = new Set([
  "abstract", "async", "await", "boolean", "break", "byte", "case", "catch",
  "char", "class", "const", "continue", "def", "default", "do", "double",
  "else", "enum", "export", "extends", "false", "final", "finally", "float",
  "for", "from", "function", "if", "implements", "import", "in", "instanceof",
  "int", "interface", "let", "long", "new", "null", "package", "private",
  "protected", "public", "return", "short", "static", "super", "switch",
  "this", "throw", "throws", "true", "try", "typeof", "var", "void", "while",
]);

const CODE_TYPES = new Set([
  "Array", "ArrayList", "Boolean", "Double", "Error", "Exception", "Float",
  "Integer", "List", "Map", "Object", "RuntimeException", "String", "System",
  "Throwable",
]);

function inlineMarkup(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function highlightCode(content: string): ReactNode[] {
  const tokens = content.split(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g);
  return tokens.filter(Boolean).map((token, index) => {
    let className = "";
    if (/^(\/\/|\/\*)/.test(token)) className = "token-comment";
    else if (/^["']/.test(token)) className = "token-string";
    else if (/^\d/.test(token)) className = "token-number";
    else if (CODE_KEYWORDS.has(token)) className = "token-keyword";
    else if (CODE_TYPES.has(token) || /^[A-Z][A-Za-z0-9_$]*$/.test(token)) className = "token-type";
    else if (/^[A-Za-z_$][\w$]*$/.test(token)) className = "token-identifier";
    return className ? <span className={className} key={index}>{token}</span> : <Fragment key={index}>{token}</Fragment>;
  });
}

function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimEnd().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", language, content: code.join("\n") });
      index += 1;
      continue;
    }

    if (/^\s*[-=_]{3,}\s*$/.test(line)) {
      blocks.push({ type: "separator" });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, content: heading[2] });
      index += 1;
      continue;
    }

    const boldHeading = line.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeading) {
      blocks.push({ type: "heading", level: 2, content: boldHeading[1] });
      index += 1;
      continue;
    }

    const listItem = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listItem) {
      const ordered = /\d+\./.test(listItem[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trimEnd().match(/^([-*]|\d+\.)\s+(.+)$/);
        if (!match || /\d+\./.test(match[1]) !== ordered) break;
        items.push(match[2]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index].trimEnd();
      if (next.startsWith("```") || /^\s*[-=_]{3,}\s*$/.test(next) || /^(#{1,3})\s+/.test(next) || /^\*\*([^*]+)\*\*$/.test(next) || /^([-*]|\d+\.)\s+/.test(next)) break;
      paragraph.push(next.trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraph.join(" ") });
  }

  return blocks;
}

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="markdown-answer">
      {parseMarkdown(content).map((block, index) => {
        if (block.type === "code") {
          return <pre key={index}><code data-language={block.language}>{highlightCode(block.content)}</code></pre>;
        }
        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return <Tag key={index}>{inlineMarkup(block.content)}</Tag>;
        }
        if (block.type === "separator") {
          return <hr key={index} />;
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return <Tag key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkup(item)}</li>)}</Tag>;
        }
        return <p key={index}>{inlineMarkup(block.content)}</p>;
      })}
    </div>
  );
}
