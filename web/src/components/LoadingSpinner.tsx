export default function LoadingSpinner({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-3 border-knot-rose-light border-t-knot-rose rounded-full animate-spin" />
      <span className="text-knot-muted text-sm">{text}</span>
    </div>
  );
}
