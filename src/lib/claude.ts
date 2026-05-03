/**
 * All Anthropic calls go through the backend at packages/api/.
 * The API key never touches the browser.
 *
 * The two AI routes (/api/tutor and /api/generate-lesson) require auth and
 * are gated by per-plan daily quotas, so we send the bearer token and
 * surface 429 responses with their structured body so callers can react.
 */
import { apiFetch } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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

export interface GenerateLessonRequest {
  pair: string;
  unit: number;
  lessonNum: number;
  level: string;
  nativeLang: string;
  targetLang: string;
}

/** Error class that carries the HTTP status + parsed body so callers can
 * react to 429 (limit reached) without string-sniffing. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await apiFetch(`${API_BASE}${path}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* fallthrough */
    }
    const message =
      (body as { error?: string; message?: string } | null)?.message
      ?? (body as { error?: string } | null)?.error
      ?? `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, body);
  }
  return (await res.json()) as T;
}

export async function tutor(req: TutorRequest): Promise<string> {
  const data = await postJson<{ reply: string }>("/api/tutor", req);
  return data.reply;
}

export async function generateLessonViaApi<T>(
  req: GenerateLessonRequest,
): Promise<T> {
  return postJson<T>("/api/generate-lesson", req);
}
