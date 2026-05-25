import { useLocation, useNavigate } from "react-router-dom";
import { Heart, Images, CalendarDays, HeartPulse, LayoutGrid } from "lucide-react";

const TABS = [
  { path: "/", icon: Heart, label: "主页" },
  { path: "/gallery", icon: Images, label: "画廊" },
  { path: "/calendar", icon: CalendarDays, label: "日子" },
  { path: "/period", icon: HeartPulse, label: "关怀" },
  { path: "/schedule", icon: LayoutGrid, label: "日程" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-3 pt-1">
      <div className="glass rounded-2xl flex items-center gap-0 px-1 shadow-lg">
        {TABS.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);

          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-[68px] py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-knot-rose/10 text-knot-rose scale-105"
                  : "text-knot-muted hover:text-knot-dark"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span
                className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
