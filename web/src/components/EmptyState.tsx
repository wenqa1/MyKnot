import { Heart } from "lucide-react";

export default function EmptyState({
  icon,
  message = "暂无内容",
  action,
  actionLabel,
}: {
  icon?: React.ReactNode;
  message?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-knot-muted">
        {icon || <Heart className="w-12 h-12" strokeWidth={1.5} />}
      </div>
      <span className="text-knot-muted text-sm">{message}</span>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-2 px-6 py-2 bg-knot-rose text-white rounded-full text-sm font-medium hover:bg-rose-500 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
