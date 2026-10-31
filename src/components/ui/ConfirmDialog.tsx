import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} description={description} onClose={onCancel}>
      <div className="modal-actions">
        <Button onClick={onCancel}>Keep it</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}