import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Onboarding } from "./Onboarding";
import { Home } from "./Home";
import { SettingsPage } from "./SettingsPage";
import { LessonRunner } from "./LessonRunner";
import { useSettingsStore } from "../store/settingsStore";

function GatedHome() {
  const settings = useSettingsStore((s) => s.settings);
  const loading = useSettingsStore((s) => s.loading);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!settings && pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    }
  }, [loading, settings, pathname, navigate]);

  if (loading) return <FullScreenLoader />;
  if (!settings) return null;
  return <Home />;
}

function GatedSettings() {
  const settings = useSettingsStore((s) => s.settings);
  if (!settings) return <Navigate to="/onboarding" replace />;
  return <SettingsPage />;
}

function GatedLesson() {
  const settings = useSettingsStore((s) => s.settings);
  const loading = useSettingsStore((s) => s.loading);
  if (loading) return <FullScreenLoader />;
  if (!settings) return <Navigate to="/onboarding" replace />;
  return <LessonRunner />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<GatedHome />} />
      <Route path="/settings" element={<GatedSettings />} />
      <Route path="/lesson/:unit/:lessonNum" element={<GatedLesson />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"
        aria-label="Loading"
      />
    </div>
  );
}
