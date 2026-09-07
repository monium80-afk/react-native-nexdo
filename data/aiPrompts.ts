export const INBOX_WELCOME_MESSAGE =
  "Welcome to your Nexdo Inbox. Dump your thoughts, tasks, voice notes, or photos. You can also command your entire system here — tell me your situation ('I only have 30 minutes', 'I can't finish the project this weekend', or 'The dentist appointment is more important') and I will adapt your plan.";

export type SuggestionPrompt = {
  id: string;
  emoji: string;
  label: string;
};

// Grounded in the actual mock task list (data/tasks.ts) rather than generic
// placeholders, so tapping one demonstrates a real capability of the app.
// Tapping a chip sends its label as real text through the intent pipeline —
// see lib/ai/classifyIntent.ts — rather than echoing a canned reply.
export const INBOX_STARTER_SUGGESTIONS: SuggestionPrompt[] = [
  { id: "capacity-20", emoji: "⚡", label: "I only have 20 minutes right now" },
  { id: "whats-next", emoji: "🔥", label: "What should I do next?" },
  { id: "reschedule-overdue", emoji: "📮", label: "Reschedule everything overdue" },
  { id: "brain-dump", emoji: "🎙️", label: "I need to finish my history essay by Friday and call the dentist tomorrow" },
];

export const INBOX_QUICK_ACTIONS: SuggestionPrompt[] = [
  { id: "whats-next", emoji: "⚡", label: "What next?" },
  { id: "breakdown-top", emoji: "📋", label: "Break down my top task" },
  { id: "quick-win", emoji: "⏱️", label: "I only have 10 minutes" },
  { id: "overdue-catchup", emoji: "🚨", label: "Catch me up on overdue" },
];

// Real parsing (transcription/OCR) happens server-side per AGENTS.md — these are the
// honest placeholder replies until that backend wiring lands.
export const ATTACHMENT_REPLIES: Record<"photo" | "voice" | "document", string> = {
  photo: "Got your photo — I'll scan it for tasks once vision processing is wired up on the backend.",
  voice: "Got your voice note — I'll transcribe it into tasks once voice processing is wired up on the backend.",
  document: "Got your file — I'll pull tasks out of it once document parsing is wired up on the backend.",
};
