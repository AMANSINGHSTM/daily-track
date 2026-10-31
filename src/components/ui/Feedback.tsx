import { AlertCircle, Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      <IconButton aria-label="Dismiss error" onClick={onDismiss}><X size={15} /></IconButton>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading your dashboard">
      <span className="loading-mark"><Check size={17} /></span>
      <span>Opening your workspace</span>
    </div>
  );
}