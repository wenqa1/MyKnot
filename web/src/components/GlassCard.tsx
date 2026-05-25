export default function GlassCard({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`glass-card rounded-3xl p-5 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
