import { useEffect, useCallback } from "react";
import { X, Trash2 } from "lucide-react";
import { getImageUrl } from "../api/client";

interface PhotoViewerProps {
  src: string;
  onClose: () => void;
  onDelete?: () => void;
}

export default function PhotoViewer({ src, onClose, onDelete }: PhotoViewerProps) {
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <img
        src={src}
        alt="preview"
        className="max-w-full max-h-full object-contain p-4"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
