import { apiFetch } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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

// ─── Stats ─────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  avgStreakDays: number;
  avgXp: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await apiFetch(`${API_BASE}/api/admin/stats`);
  return asJson<AdminStats>(res);
}

// ─── Users list ────────────────────────────────────────────────────────────
export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  streakDays: number;
  totalXp: number;
  nativeLang: string;
  targetLang: string;
  cefrLevel: string;
  lastActiveAt: string;
  createdAt: string;
}
export interface AdminUserListResponse {
  users: AdminUserRow[];
  page: number;
  limit: number;
  total: number;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function fetchAdminUsers(q: UsersQuery = {}): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (q.page) params.set("page", String(q.page));
  if (q.limit) params.set("limit", String(q.limit));
  if (q.search) params.set("search", q.search);
  if (q.plan) params.set("plan", q.plan);
  if (q.sort) params.set("sort", q.sort);
  if (q.order) params.set("order", q.order);
  const res = await apiFetch(`${API_BASE}/api/admin/users?${params.toString()}`);
  return asJson<AdminUserListResponse>(res);
}

// ─── Single user ───────────────────────────────────────────────────────────
export interface AdminUserDetail extends AdminUserRow {
  avatarUrl: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  dailyMinutes: number;
  updatedAt: string;
}

export interface AdminUserSubscription {
  id: string;
  plan: string;
  status: string;
  amountCents: number;
  currency: string;
  startedAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AdminUserReview {
  id: string;
  pair: string;
  src: string;
  tgt: string;
  translit: string | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string | null;
  lastReviewedAt: string | null;
}

export interface AdminUserDetailResponse {
  user: AdminUserDetail;
  subscriptions: AdminUserSubscription[];
  recentReviews: AdminUserReview[];
}

export async function fetchAdminUser(id: string): Promise<AdminUserDetailResponse> {
  const res = await apiFetch(`${API_BASE}/api/admin/users/${id}`);
  return asJson<AdminUserDetailResponse>(res);
}

export async function patchAdminUser(
  id: string,
  data: Partial<{ role: string; subscriptionPlan: string; subscriptionStatus: string }>,
): Promise<AdminUserDetail> {
  const res = await apiFetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return asJson<AdminUserDetail>(res);
}

export async function deleteAdminUser(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
  });
  await asJson<{ ok: true }>(res);
}

// ─── Subscriptions ─────────────────────────────────────────────────────────
export interface AdminSubscription {
  id: string;
  plan: string;
  status: string;
  amountCents: number;
  currency: string;
  startedAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null };
}
export interface AdminSubscriptionsResponse {
  subscriptions: AdminSubscription[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchAdminSubscriptions(opts: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<AdminSubscriptionsResponse> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.status) params.set("status", opts.status);
  const res = await apiFetch(
    `${API_BASE}/api/admin/subscriptions?${params.toString()}`,
  );
  return asJson<AdminSubscriptionsResponse>(res);
}

// ─── Revenue ───────────────────────────────────────────────────────────────
export interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  free: number;
  pro: number;
  premium: number;
  total: number;
}
export async function fetchAdminRevenue(): Promise<{ months: MonthlyRevenue[] }> {
  const res = await apiFetch(`${API_BASE}/api/admin/revenue`);
  return asJson<{ months: MonthlyRevenue[] }>(res);
}
