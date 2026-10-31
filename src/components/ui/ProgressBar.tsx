export function ProgressBar({
  value,
  label,
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`progress-track ${className}`}
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="progress-fill" style={{ width: `${safeValue}%` }} />
    </div>
  );
}