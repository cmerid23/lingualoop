/**
 * Frontend auth client — talks to packages/api auth routes.
 * Token is held in localStorage under "ll_token".
 */

// Empty default = relative URLs. Same-origin in prod, Vite proxies in dev.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "ll_token";

export interface AuthedUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  subscriptionPlan: string;
  nativeLang?: string;
  targetLang?: string;
  cefrLevel?: string;
  streakDays?: number;
  totalXp?: number;
}

export interface AuthResponse {
  token: string;
  user: AuthedUser;
}

// ── Token storage ──────────────────────────────────────────────────────────
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* noop */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
};

// ── Headers helper ─────────────────────────────────────────────────────────
export const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken() ?? ""}`,
});

// ── API calls ──────────────────────────────────────────────────────────────
async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* fallthrough */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await asJson<AuthResponse>(res);
  setToken(data.token);
  return data;
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName, phone }),
  });
  const data = await asJson<AuthResponse>(res);
  setToken(data.token);
  return data;
}

export async function fetchMe(): Promise<AuthedUser> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  return asJson<AuthedUser>(res);
}

export async function updateProfile(
  data: Partial<{
    fullName: string;
    phone: string;
    nativeLang: string;
    targetLang: string;
    dailyMinutes: number;
    cefrLevel: string;
  }>,
): Promise<AuthedUser> {
  const res = await fetch(`${API_BASE}/api/auth/profile`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return asJson<AuthedUser>(res);
}

export async function sendOtp(
  identifier: string,
  type: "email" | "phone",
): Promise<{ success: true; code: string }> {
  const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, type }),
  });
  return asJson<{ success: true; code: string }>(res);
}

export async function verifyOtp(
  identifier: string,
  code: string,
): Promise<{ verified: true }> {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, code }),
  });
  return asJson<{ verified: true }>(res);
}

export function logout() {
  clearToken();
}
