import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { Onboarding } from "./Onboarding";
import { Home } from "./Home";
import { SettingsPage } from "./SettingsPage";
import { LessonRunner } from "./LessonRunner";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { PricingPage } from "./PricingPage";
import { ReviewSession } from "./ReviewSession";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminLogin } from "./admin/AdminLogin";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";

// ─── Guards ───────────────────────────────────────────────────────────────

/** Redirect logged-in users away from public auth pages. */
function PublicOnly({ children }: { children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return <FullScreenLoader />;
  if (user) return <Navigate to="/home" replace />;
  return children;
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Auth + onboarding required. */
function RequireOnboarded({ children }: { children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const settings = useSettingsStore((s) => s.settings);
  const settingsLoading = useSettingsStore((s) => s.loading);
  if (authLoading || settingsLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!settings) return <Navigate to="/onboarding" replace />;
  return children;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin")
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-ink">
        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-soft border border-surface-2">
          <p className="font-display text-lg font-semibold">Admins only</p>
          <p className="mt-1 text-sm font-light text-ink-3">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  return children;
}

// ─── Routes ───────────────────────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Auth pages — bounce logged-in users to /home */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Authenticated */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireOnboarded>
            <Home />
          </RequireOnboarded>
        }
      />
      <Route
        path="/lesson/:unit/:lessonNum"
        element={
          <RequireOnboarded>
            <LessonRunner />
          </RequireOnboarded>
        }
      />
      <Route
        path="/review"
        element={
          <RequireOnboarded>
            <ReviewSession />
          </RequireOnboarded>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireOnboarded>
            <SettingsPage />
          </RequireOnboarded>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />

      {/* Wildcard → marketing landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-surface-2 border-t-gold"
        aria-label="Loading"
      />
    </div>
  );
}
