import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Heart, Images, CalendarDays, LayoutGrid, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavTab {
  id: string;
  path: string;
  icon: string;
  label: string;
}

export const ALL_TABS: NavTab[] = [
  { id: "home", path: "/", icon: "Heart", label: "主页" },
  { id: "gallery", path: "/gallery", icon: "Images", label: "画廊" },
  { id: "calendar", path: "/calendar", icon: "CalendarDays", label: "日子" },
  { id: "schedule", path: "/schedule", icon: "LayoutGrid", label: "日程" },
  { id: "settings", path: "/settings", icon: "User", label: "我的" },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Images, CalendarDays, LayoutGrid, User,
};

export function getNavIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Heart;
}

const STORAGE_KEY = "knot_nav_tabs";

function loadTabs(): NavTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const ids = JSON.parse(raw) as string[];
      const tabs = ids
        .map((id) => ALL_TABS.find((t) => t.id === id))
        .filter(Boolean) as NavTab[];
      if (tabs.length >= 1 && tabs.length <= 5) return tabs;
    }
  } catch { /* ignore */ }
  return [...ALL_TABS];
}

function saveTabs(tabs: NavTab[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.map((t) => t.id)));
}

interface NavCtx {
  tabs: NavTab[];
  setTabs: (tabs: NavTab[]) => void;
  allTabs: NavTab[];
}

const NavContext = createContext<NavCtx>({ tabs: [], setTabs: () => {}, allTabs: [] });

export function NavProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabsState] = useState<NavTab[]>(loadTabs);

  const setTabs = useCallback((newTabs: NavTab[]) => {
    if (newTabs.length < 1 || newTabs.length > 5) return;
    setTabsState(newTabs);
    saveTabs(newTabs);
  }, []);

  // re-load on mount in case localStorage changed
  useEffect(() => {
    setTabsState(loadTabs());
  }, []);

  return (
    <NavContext.Provider value={{ tabs, setTabs, allTabs: ALL_TABS }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
