export type Document = {
  id: string;
  filename: string;
  page_count: number;
  size_bytes: number;
};

export type Citation = {
  page: number;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};
