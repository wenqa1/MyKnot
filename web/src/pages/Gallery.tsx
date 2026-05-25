import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGallery,
  uploadImage,
  deleteImage,
  getImageUrl,
  type GalleryImage,
} from "../api/client";
import { Camera, Loader2, Images } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import PhotoViewer from "../components/PhotoViewer";

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    // Skip compression for GIF and SVG
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const maxSize = 1600;
      let { width, height } = img;

      if (width <= maxSize && height <= maxSize) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.78
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGallery();
      setImages(data);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const uploadFile = new File([compressed], file.name, {
        type: compressed.type,
      });
      await uploadImage(uploadFile);
      await load();
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteImage(id);
      setViewerSrc(null);
      setViewerId(null);
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch {
      // silently fail
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-black text-knot-dark"
          style={{ fontFamily: "var(--font-display)" }}
        >
          画廊
        </h1>
        <span className="text-xs text-knot-muted">{images.length} 张照片</span>
      </div>

      {/* Upload button */}
      <label className="block">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <div className={`w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer ${
          uploading
            ? "border-knot-rose/30 bg-knot-rose/5"
            : "border-stone-200 hover:border-knot-rose/30 hover:bg-knot-rose/5"
        }`}>
          {uploading ? (
            <Loader2 className="w-5 h-5 text-knot-rose animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-knot-muted" />
          )}
          <span className="text-sm text-knot-muted font-medium">
            {uploading ? "上传中..." : "点击上传照片"}
          </span>
        </div>
      </label>

      {images.length === 0 ? (
        <EmptyState
          icon={<Images className="w-12 h-12" strokeWidth={1.5} />}
          message="还没有照片，上传第一张吧"
        />
      ) : (
        /* Masonry grid */
        <div className="columns-2 gap-3 space-y-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="break-inside-avoid rounded-2xl overflow-hidden bg-white/60 backdrop-blur shadow-sm animate-fade-in-up cursor-pointer hover:scale-[1.02] transition-transform"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => {
                setViewerSrc(getImageUrl(img.filename));
                setViewerId(img.id);
              }}
            >
              <img
                src={getImageUrl(img.filename)}
                alt={img.originalName}
                loading="lazy"
                className="w-full object-cover"
                style={{ aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : "auto" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Photo viewer */}
      {viewerSrc && (
        <PhotoViewer
          src={viewerSrc}
          onClose={() => {
            setViewerSrc(null);
            setViewerId(null);
          }}
          onDelete={viewerId ? () => handleDelete(viewerId) : undefined}
        />
      )}
    </div>
  );
}
