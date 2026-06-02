export type Document = {
  id: string;
  filename: string;
  page_count: number;
  size_bytes: number;
};

export type Citation = {
  page: number;
};

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  context_characters: number;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  usage?: TokenUsage;
  created_at?: string;
};

export type ChatSummary = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};
