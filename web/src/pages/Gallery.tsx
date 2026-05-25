import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGallery,
  uploadImage,
  deleteImage,
  moveImageToAlbum,
  getImageUrl,
  getAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  type GalleryImage,
  type GalleryAlbum,
} from "../api/client";
import {
  Camera,
  Loader2,
  Images,
  Plus,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import PhotoViewer from "../components/PhotoViewer";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
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
        0.78,
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<number | null>(null);

  // Album management states
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [editingAlbumId, setEditingAlbumId] = useState<number | null>(null);
  const [editingAlbumName, setEditingAlbumName] = useState("");
  const [albumMenuId, setAlbumMenuId] = useState<number | null>(null);

  // Move-to-album states
  const [moveImageId, setMoveImageId] = useState<number | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGallery(activeAlbumId ?? undefined);
      setImages(data);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeAlbumId]);

  const loadAlbums = useCallback(async () => {
    try {
      const data = await getAlbums();
      setAlbums(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadImages();
    loadAlbums();
  }, [loadImages, loadAlbums]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const uploadFile = new File([compressed], file.name, { type: compressed.type });
      await uploadImage(uploadFile, activeAlbumId ?? undefined);
      await loadImages();
      await loadAlbums();
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await deleteImage(id);
      setViewerSrc(null);
      setViewerId(null);
      setImages((prev) => prev.filter((img) => img.id !== id));
      await loadAlbums();
      toast("success", "照片已删除");
    } catch {
      toast("error", "删除失败");
    }
  }

  async function handleAddAlbum() {
    if (!newAlbumName.trim()) return;
    try {
      await createAlbum(newAlbumName.trim());
      setNewAlbumName("");
      setShowAddAlbum(false);
      await loadAlbums();
    } catch {
      // ignore
    }
  }

  async function handleUpdateAlbum(id: number) {
    if (!editingAlbumName.trim()) return;
    try {
      await updateAlbum(id, editingAlbumName.trim());
      setEditingAlbumId(null);
      setEditingAlbumName("");
      await loadAlbums();
    } catch {
      // ignore
    }
  }

  async function handleDeleteAlbum(id: number) {
    try {
      await deleteAlbum(id);
      if (activeAlbumId === id) setActiveAlbumId(null);
      setAlbumMenuId(null);
      await loadAlbums();
      await loadImages();
    } catch {
      // ignore
    }
  }

  async function handleMoveToAlbum(imageId: number, albumId: number | null) {
    try {
      await moveImageToAlbum(imageId, albumId);
      setMoveImageId(null);
      await loadImages();
      await loadAlbums();
    } catch {
      // ignore
    }
  }

  if (loading && images.length === 0) return <LoadingSpinner />;
  if (error && images.length === 0) return <ErrorState message={error} onRetry={loadImages} />;

  return (
    <div className="page-enter space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-knot-dark" style={{ fontFamily: "var(--font-display)" }}>
          画廊
        </h1>
        <span className="text-xs text-knot-muted">{images.length} 张照片</span>
      </div>

      {/* Album tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {/* All photos tab */}
        <button
          onClick={() => setActiveAlbumId(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeAlbumId === null
              ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/30"
              : "bg-white/70 text-stone-600 hover:text-knot-rose"
          }`}
        >
          全部
        </button>

        {/* Album tabs */}
        {albums.map((a) => (
          <div key={a.id} className="relative flex-shrink-0">
            {editingAlbumId === a.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateAlbum(a.id);
                }}
                className="flex items-center"
              >
                <input
                  type="text"
                  value={editingAlbumName}
                  onChange={(e) => setEditingAlbumName(e.target.value)}
                  onBlur={() => {
                    handleUpdateAlbum(a.id);
                  }}
                  autoFocus
                  className="w-28 px-3 py-2 rounded-full text-sm bg-white/70 border border-knot-rose/30 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              </form>
            ) : (
              <button
                onClick={() => setActiveAlbumId(a.id)}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeAlbumId === a.id
                    ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/30"
                    : "bg-white/70 text-stone-600 hover:text-knot-rose"
                }`}
              >
                {a.name}
                {a._count ? <span className="text-[11px] opacity-70">{a._count.images}</span> : null}
              </button>
            )}

            {/* Album menu trigger */}
            {activeAlbumId === a.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumMenuId(albumMenuId === a.id ? null : a.id);
                }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-stone-400 hover:text-knot-rose transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Album menu dropdown */}
            {albumMenuId === a.id && (
              <div
                className="absolute top-full right-0 mt-1 z-40 bg-white rounded-xl shadow-lg border border-stone-100 py-1 min-w-[100px] animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setAlbumMenuId(null);
                    setEditingAlbumId(a.id);
                    setEditingAlbumName(a.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> 重命名
                </button>
                <button
                  onClick={() => handleDeleteAlbum(a.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add album button or inline input */}
        {showAddAlbum ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddAlbum();
            }}
            className="flex-shrink-0 flex items-center"
          >
            <input
              type="text"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onBlur={handleAddAlbum}
              autoFocus
              placeholder="相册名称"
              className="w-28 px-3 py-2 rounded-full text-sm bg-white/70 border border-knot-rose/30 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
            />
          </form>
        ) : (
          <button
            onClick={() => setShowAddAlbum(true)}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white/70 flex items-center justify-center text-stone-400 hover:text-knot-rose hover:bg-knot-rose-light/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload area */}
      <label className="block">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <div
          className={`w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            uploading
              ? "border-knot-rose/30 bg-knot-rose/5"
              : "border-stone-200 hover:border-knot-rose/30 hover:bg-knot-rose/5"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-knot-rose animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-knot-muted" />
          )}
          <span className="text-sm text-knot-muted font-medium">
            {uploading
              ? "上传中..."
              : activeAlbumId
                ? "上传到此相册"
                : "点击上传照片"}
          </span>
        </div>
      </label>

      {/* Image grid */}
      {images.length === 0 ? (
        <EmptyState
          icon={<Images className="w-12 h-12" strokeWidth={1.5} />}
          message={activeAlbumId ? "此相册还没有照片" : "还没有照片，上传第一张吧"}
        />
      ) : (
        <div className="columns-2 gap-3 space-y-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="break-inside-avoid rounded-2xl overflow-hidden bg-white/60 backdrop-blur shadow-sm animate-fade-in-up cursor-pointer hover:scale-[1.02] transition-transform group relative"
              style={{ animationDelay: `${i * 40}ms` }}
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
                style={{
                  aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : "auto",
                }}
              />
              {/* Hover: move to album quick action */}
              {albums.length > 0 && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveImageId(moveImageId === img.id ? null : img.id);
                    }}
                    className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo viewer with move-to-album */}
      {viewerSrc && (
        <PhotoViewer
          src={viewerSrc}
          onClose={() => {
            setViewerSrc(null);
            setViewerId(null);
            setMoveImageId(null);
          }}
          onDelete={viewerId ? () => handleDelete(viewerId) : undefined}
          bottomBar={
            viewerId && albums.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto px-1">
                <span className="text-xs text-white/60 flex-shrink-0">移到：</span>
                <button
                  onClick={() => handleMoveToAlbum(viewerId, null)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  无相册
                </button>
                {albums.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleMoveToAlbum(viewerId, a.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        />
      )}

      {/* Move-to-album popover (visible on long-press or click folder icon) */}
      {moveImageId !== null && !viewerSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setMoveImageId(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl p-4 w-[260px] space-y-2 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-knot-dark">移动到相册</p>
            <button
              onClick={() => handleMoveToAlbum(moveImageId, null)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
            >
              无相册
            </button>
            {albums.map((a) => (
              <button
                key={a.id}
                onClick={() => handleMoveToAlbum(moveImageId, a.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-50 flex items-center justify-between"
              >
                {a.name}
                {a._count ? <span className="text-[11px] text-stone-400">{a._count.images}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="删除照片"
        message="确定要删除这张照片吗？此操作不可撤销。"
        danger
      />
    </div>
  );
}
