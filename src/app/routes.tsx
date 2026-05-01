import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Onboarding } from "./Onboarding";
import { Home } from "./Home";
import { SettingsPage } from "./SettingsPage";
import { LessonRunner } from "./LessonRunner";
import { LoginPage } from "./LoginPage";
import { PricingPage } from "./PricingPage";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminLogin } from "./admin/AdminLogin";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";

function GatedHome() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const settings = useSettingsStore((s) => s.settings);
  const settingsLoading = useSettingsStore((s) => s.loading);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (authLoading || settingsLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!settings && pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    }
  }, [authLoading, settingsLoading, user, settings, pathname, navigate]);

  if (authLoading || settingsLoading) return <FullScreenLoader />;
  if (!user) return null;
  if (!settings) return null;
  return <Home />;
}

function GatedSettings() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const settings = useSettingsStore((s) => s.settings);
  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!settings) return <Navigate to="/onboarding" replace />;
  return <SettingsPage />;
}

function GatedLesson() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const settings = useSettingsStore((s) => s.settings);
  const settingsLoading = useSettingsStore((s) => s.loading);
  if (authLoading || settingsLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!settings) return <Navigate to="/onboarding" replace />;
  return <LessonRunner />;
}

function GatedOnboarding() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Onboarding />;
}

function GatedPricing() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <PricingPage />;
}

function GatedAdmin() {
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
  return <AdminDashboard />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/onboarding" element={<GatedOnboarding />} />
      <Route path="/" element={<GatedHome />} />
      <Route path="/settings" element={<GatedSettings />} />
      <Route path="/lesson/:unit/:lessonNum" element={<GatedLesson />} />
      <Route path="/pricing" element={<GatedPricing />} />
      <Route path="/admin" element={<GatedAdmin />} />
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
