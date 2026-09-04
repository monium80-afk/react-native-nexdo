export type ChatRole = "ai" | "user";

export type ChatAttachment = {
  kind: "photo" | "voice" | "document";
  label: string;
  uri: string;
  mimeType?: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string; // ISO 8601
  attachment?: ChatAttachment;
};
