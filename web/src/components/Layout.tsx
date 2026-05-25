import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const BG_KEY = "knot_bg_image";

export function getBgImage(): string | null {
  try {
    return localStorage.getItem(BG_KEY);
  } catch {
    return null;
  }
}

export function setBgImage(url: string | null) {
  if (url) {
    localStorage.setItem(BG_KEY, url);
  } else {
    localStorage.removeItem(BG_KEY);
  }
}

export default function Layout() {
  const bgImage = useMemo(() => getBgImage(), []);

  return (
    <div className="relative min-h-dvh">
      {/* Background decoration */}
      <div className="bg-blobs">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* Custom background image */}
      {bgImage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-25"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}

      {/* Main content */}
      <main className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-safe">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
