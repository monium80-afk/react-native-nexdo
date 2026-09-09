import * as FileSystem from "expo-file-system/legacy";

import type { ChatAttachment } from "@/types/chat";

// The legacy string-based API (readAsStringAsync) is far simpler than the
// new File/Directory class API for this one-shot "give me base64" need —
// still officially supported, see expo-file-system's "/legacy" export.
export async function readFileAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

const DEFAULT_MIME_TYPE: Record<ChatAttachment["kind"], string> = {
  photo: "image/jpeg",
  voice: "audio/m4a",
  document: "application/pdf",
};

export function resolveMimeType(attachment: ChatAttachment): string {
  return attachment.mimeType ?? DEFAULT_MIME_TYPE[attachment.kind];
}
