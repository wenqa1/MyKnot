import { Frown } from "lucide-react";

export default function ErrorState({
  message = "加载失败",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Frown className="w-10 h-10 text-knot-muted" strokeWidth={1.5} />
      <span className="text-knot-muted text-sm">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-knot-rose text-white rounded-full text-sm font-medium hover:bg-rose-500 transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
}
