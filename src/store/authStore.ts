import { create } from "zustand";
import {
  type AuthedUser,
  clearToken,
  fetchMe,
  getToken,
  loginWithEmail,
  registerUser,
} from "../lib/auth";

interface AuthState {
  user: AuthedUser | null;
  token: string | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => void;

  /**
   * On app boot. If a token exists, calls /api/auth/me to restore the user.
   * On 401 / failure, the token is cleared and `user` stays null.
   */
  loadFromToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  loading: true,

  async login(email, password) {
    const { token, user } = await loginWithEmail(email, password);
    set({ token, user, loading: false });
  },

  async register(email, password, fullName, phone) {
    const { token, user } = await registerUser(email, password, fullName, phone);
    set({ token, user, loading: false });
  },

  logout() {
    clearToken();
    set({ token: null, user: null, loading: false });
    // Hard navigation so any in-memory state from the previous session is dropped.
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  async loadFromToken() {
    const token = getToken();
    if (!token) {
      set({ user: null, token: null, loading: false });
      return;
    }
    try {
      const user = await fetchMe();
      set({ user, token, loading: false });
    } catch (err) {
      // 401 / expired / network — drop the token and continue unauthenticated.
      console.warn("[auth] loadFromToken failed", err);
      clearToken();
      set({ user: null, token: null, loading: false });
    }
  },
}));
