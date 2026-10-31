import { Outlet } from "react-router-dom";
import { useAppData } from "@/context/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBanner } from "@/components/ui/Feedback";

export function AppShell() {
  const { error, clearError } = useAppData();
  return (
    <div className="app-shell min-h-screen">
      <Sidebar />
      <main className="main-content">
        <div className="content-width">
          <ErrorBanner message={error} onDismiss={clearError} />
          <Outlet />
        </div>
        <footer className="app-footer">
          <span>MY GROWTH DASHBOARD</span>
          <span>Small steps. Steady progress.</span>
        </footer>
      </main>
    </div>
  );
}