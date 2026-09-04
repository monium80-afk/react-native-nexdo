export const INBOX_WELCOME_MESSAGE =
  "Welcome to your Nexdo Inbox. Dump your thoughts, tasks, voice notes, or photos. You can also command your entire system here — tell me your situation ('I only have 30 minutes', 'I can't finish the project this weekend', or 'The dentist appointment is more important') and I will adapt your plan.";

export type SuggestionPrompt = {
  id: string;
  emoji: string;
  label: string;
  reply: string;
};

// Grounded in the actual mock task list (data/tasks.ts) rather than generic
// placeholders, so tapping one demonstrates a real capability of the app.
export const INBOX_STARTER_SUGGESTIONS: SuggestionPrompt[] = [
  {
    id: "capacity-20",
    emoji: "⚡",
    label: "I only have 20 minutes right now",
    reply: "Got it — I'm narrowing your queue to tasks that fit in 20 minutes or less. Check Now for the pick.",
  },
  {
    id: "boost-report",
    emoji: "🔥",
    label: "Move quarterly report to top priority",
    reply: 'Done. "Finish quarterly report" is now your top priority and will surface first in Now.',
  },
  {
    id: "reschedule-overdue",
    emoji: "📮",
    label: "Reschedule everything overdue",
    reply: "I've pushed your overdue tasks to the next open slot in your schedule. Review them anytime in Tasks.",
  },
  {
    id: "brain-dump",
    emoji: "🎙️",
    label: "Brain dump my week",
    reply: "I'm listening — keep typing or tap the mic. I'll split everything into individual tasks for you.",
  },
];

export const INBOX_QUICK_ACTIONS: SuggestionPrompt[] = [
  {
    id: "whats-next",
    emoji: "⚡",
    label: "What next?",
    reply: 'Your best next move is "Finish quarterly report" — due today and scores highest right now.',
  },
  {
    id: "breakdown-top",
    emoji: "📋",
    label: "Break down top task",
    reply: 'Breaking "Finish quarterly report" into steps: outline sections, draft the numbers, then a final review pass.',
  },
  {
    id: "quick-win",
    emoji: "⏱️",
    label: "Got 20 minutes?",
    reply: '"Email professor about extension" only takes about 10 minutes — an easy win right now.',
  },
  {
    id: "overdue-catchup",
    emoji: "🚨",
    label: "Catch me up on overdue",
    reply: 'You have 2 tasks overdue: "Submit tax documents" and "Renew car insurance." Want me to reschedule them?',
  },
];

// Real parsing (transcription/OCR) happens server-side per AGENTS.md — these are the
// honest placeholder replies until that backend wiring lands.
export const ATTACHMENT_REPLIES: Record<"photo" | "voice" | "document", string> = {
  photo: "Got your photo — I'll scan it for tasks once vision processing is wired up on the backend.",
  voice: "Got your voice note — I'll transcribe it into tasks once voice processing is wired up on the backend.",
  document: "Got your file — I'll pull tasks out of it once document parsing is wired up on the backend.",
};
