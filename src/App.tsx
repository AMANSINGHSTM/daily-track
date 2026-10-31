import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useAppData } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingScreen } from "@/components/ui/Feedback";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { ActivitiesPage } from "@/pages/Activities/ActivitiesPage";
import { DailyTrackerPage } from "@/pages/DailyTracker/DailyTrackerPage";
import { ChallengesPage } from "@/pages/Challenges/ChallengesPage";
import { JournalPage } from "@/pages/Journal/JournalPage";
import { AnalyticsPage } from "@/pages/Analytics/AnalyticsPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";

function ApplicationRoutes() {
  const { loading } = useAppData();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="tracker" element={<DailyTrackerPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ApplicationRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}