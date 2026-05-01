/**
 * All Anthropic calls now go through the backend at packages/api/.
 * The API key never touches the browser.
 *
 * Set VITE_API_BASE in .env.local for dev (default: http://localhost:3001).
 * In production, point it at your deployed API origin.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorRequest {
  messages: ChatMessage[];
  nativeLang: string;
  targetLang: string;
  level: string;
  lessonTitle: string;
}

export async function tutor(req: TutorRequest): Promise<string> {
  const res = await fetch(`${API_BASE}/api/tutor`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`tutor ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { reply: string };
  return data.reply;
}

export interface GenerateLessonRequest {
  pair: string;
  unit: number;
  lessonNum: number;
  level: string;
  nativeLang: string;
  targetLang: string;
}

export async function generateLessonViaApi<T>(req: GenerateLessonRequest): Promise<T> {
  const res = await fetch(`${API_BASE}/api/generate-lesson`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`generate-lesson ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
