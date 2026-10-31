import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "medium" | "large";
}

export function Modal({ open, title, description, onClose, children, size = "medium" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton aria-label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}