import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";

interface PhotoViewerProps {
  src: string;
  onClose: () => void;
  onDelete?: () => void;
  bottomBar?: React.ReactNode;
}

export default function PhotoViewer({ src, onClose, onDelete, bottomBar }: PhotoViewerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 dark:bg-slate-800/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/20 dark:bg-slate-800/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <img
        src={src}
        alt="preview"
        className="max-w-[92vw] max-h-[85vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {bottomBar && (
        <div
          className="absolute bottom-0 left-0 right-0 p-4 flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black/50 backdrop-blur rounded-full px-4 py-2">
            {bottomBar}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
