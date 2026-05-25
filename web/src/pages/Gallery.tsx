import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGallery,
  uploadImage,
  deleteImage,
  moveImageToAlbum,
  updateImageCaption,
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
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import PhotoViewer from "../components/PhotoViewer";
import ConfirmModal from "../components/ConfirmModal";
import Modal from "../components/Modal";
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

  // Add album
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const addingRef = useRef(false);

  // Rename / Delete album modals
  const [renameAlbumId, setRenameAlbumId] = useState<number | null>(null);
  const [renameAlbumName, setRenameAlbumName] = useState("");
  const [deleteAlbumId, setDeleteAlbumId] = useState<number | null>(null);

  // Caption modal
  const [captionImgId, setCaptionImgId] = useState<number | null>(null);
  const [captionText, setCaptionText] = useState("");

  // Delete image
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
      toast("success", "照片已上传");
    } catch {
      toast("error", "上传失败");
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
    if (!newAlbumName.trim() || addingRef.current) return;
    addingRef.current = true;
    try {
      await createAlbum(newAlbumName.trim());
      setNewAlbumName("");
      setShowAddAlbum(false);
      await loadAlbums();
      toast("success", "相册已创建");
    } catch {
      toast("error", "创建相册失败");
    } finally {
      addingRef.current = false;
    }
  }

  async function handleRenameAlbum() {
    if (!renameAlbumName.trim() || renameAlbumId === null) return;
    try {
      await updateAlbum(renameAlbumId, renameAlbumName.trim());
      setRenameAlbumId(null);
      await loadAlbums();
      toast("success", "相册已重命名");
    } catch {
      toast("error", "重命名失败");
    }
  }

  async function handleDeleteAlbum() {
    if (deleteAlbumId === null) return;
    try {
      await deleteAlbum(deleteAlbumId);
      if (activeAlbumId === deleteAlbumId) setActiveAlbumId(null);
      setDeleteAlbumId(null);
      await loadAlbums();
      await loadImages();
      toast("success", "相册已删除");
    } catch {
      toast("error", "删除失败");
    }
  }

  async function handleMoveToAlbum(imageId: number, albumId: number | null) {
    try {
      await moveImageToAlbum(imageId, albumId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      await loadAlbums();
      toast("success", "已移动到相册");
    } catch {
      toast("error", "移动失败");
    }
  }

  async function handleSaveCaption() {
    if (!captionText.trim() || captionImgId === null) {
      setCaptionImgId(null);
      return;
    }
    try {
      const updated = await updateImageCaption(captionImgId, captionText.trim());
      setImages((prev) => prev.map((img) => (img.id === captionImgId ? updated : img)));
      setCaptionImgId(null);
      toast("success", "备注已保存");
    } catch {
      toast("error", "保存备注失败");
    }
  }

  const activeAlbum = albums.find((a) => a.id === activeAlbumId);

  if (loading && images.length === 0) return <LoadingSpinner />;
  if (error && images.length === 0) return <ErrorState message={error} onRetry={loadImages} />;

  return (
    <>
      <div className="page-enter space-y-3 pb-20">
        {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-knot-dark" style={{ fontFamily: "var(--font-display)" }}>
          画廊
        </h1>
        <span className="text-xs text-knot-muted">{images.length} 张照片</span>
      </div>

      {/* Album tabs row */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
        <button
          onClick={() => setActiveAlbumId(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeAlbumId === null
              ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/30"
              : "bg-white/70 dark:bg-slate-800/70 text-stone-600 dark:text-slate-300 hover:text-knot-rose"
          }`}
        >
          全部
        </button>

        {albums.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveAlbumId(a.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeAlbumId === a.id
                ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/30"
                : "bg-white/70 dark:bg-slate-800/70 text-stone-600 dark:text-slate-300 hover:text-knot-rose"
            }`}
          >
            {a.name}
            {a._count ? <span className="text-[11px] opacity-70">{a._count.images}</span> : null}
          </button>
        ))}

        {/* Add album */}
        {showAddAlbum ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddAlbum(); }}
            className="flex-shrink-0"
          >
            <input
              type="text"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onBlur={handleAddAlbum}
              onKeyDown={(e) => { if (e.key === "Escape") { setNewAlbumName(""); setShowAddAlbum(false); } }}
              autoFocus
              placeholder="相册名称"
              className="w-24 px-3 py-2 rounded-full text-sm bg-white/70 dark:bg-slate-800/70 border border-knot-rose/30 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
            />
          </form>
        ) : (
          <button
            onClick={() => setShowAddAlbum(true)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/70 dark:bg-slate-800/70 flex items-center justify-center text-stone-400 dark:text-slate-400 hover:text-knot-rose hover:bg-knot-rose-light/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Album actions bar (visible when an album is selected) */}
      {activeAlbum && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-knot-muted flex-1 truncate">
            当前相册：{activeAlbum.name}
          </span>
          <button
            onClick={() => {
              setRenameAlbumId(activeAlbum.id);
              setRenameAlbumName(activeAlbum.name);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Pencil className="w-3 h-3" /> 重命名
          </button>
          <button
            onClick={() => setDeleteAlbumId(activeAlbum.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> 删除
          </button>
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="pt-12">
          <EmptyState
            icon={<Images className="w-12 h-12" strokeWidth={1.5} />}
            message={activeAlbumId ? "此相册还没有照片" : "还没有照片，点击右下角上传吧"}
          />
        </div>
      ) : (
        <div className="columns-2 gap-2.5 space-y-2.5">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="break-inside-avoid rounded-xl overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur shadow-sm animate-fade-in-up group relative"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <img
                src={getImageUrl(img.filename)}
                alt={img.originalName}
                loading="lazy"
                className="w-full object-cover cursor-pointer"
                style={{
                  aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : "auto",
                }}
                onClick={() => {
                  setViewerSrc(getImageUrl(img.filename));
                  setViewerId(img.id);
                }}
              />

              {/* Caption badge */}
              {img.caption && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-xs text-stone-500 dark:text-slate-300 line-clamp-2">{img.caption}</span>
                </div>
              )}

              {/* Hover actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCaptionImgId(img.id);
                    setCaptionText(img.caption || "");
                  }}
                  className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Floating upload — outside page-enter so fixed positioning works */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-knot-rose text-white shadow-lg shadow-knot-rose/30 flex items-center justify-center hover:bg-rose-500 disabled:opacity-50 active:scale-95 transition-all"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      {/* Photo viewer */}
      {viewerSrc && (
        <PhotoViewer
          src={viewerSrc}
          onClose={() => { setViewerSrc(null); setViewerId(null); }}
          onDelete={viewerId ? () => handleDelete(viewerId) : undefined}
          bottomBar={
            viewerId ? (
              <div className="flex items-center gap-2 overflow-x-auto px-1">
                <button
                  onClick={() => {
                    const img = images.find((i) => i.id === viewerId);
                    setViewerSrc(null);
                    setViewerId(null);
                    setTimeout(() => {
                      setCaptionImgId(img?.id ?? null);
                      setCaptionText(img?.caption || "");
                    }, 250);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/20 dark:bg-slate-800/20 text-white hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> 备注
                </button>
                {albums.length > 0 && (
                  <>
                    <span className="text-white/40 text-xs">|</span>
                    {albums.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleMoveToAlbum(viewerId, a.id)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-white/20 dark:bg-slate-800/20 text-white hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {a.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ) : undefined
          }
        />
      )}

      {/* ── Modals ── */}

      {/* Caption editor modal */}
      <Modal open={captionImgId !== null} onClose={() => setCaptionImgId(null)} title="编辑备注">
        <div className="space-y-4">
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(); }}
            placeholder="添加照片备注..."
            className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={() => setCaptionImgId(null)} className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors">
              取消
            </button>
            <button onClick={handleSaveCaption} className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 transition-all active:scale-[0.98]">
              保存
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename album modal */}
      <Modal open={renameAlbumId !== null} onClose={() => setRenameAlbumId(null)} title="重命名相册">
        <div className="space-y-4">
          <input
            type="text"
            value={renameAlbumName}
            onChange={(e) => setRenameAlbumName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameAlbum(); }}
            placeholder="相册名称"
            className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={() => setRenameAlbumId(null)} className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors">
              取消
            </button>
            <button onClick={handleRenameAlbum} className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 transition-all active:scale-[0.98]">
              保存
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete photo confirm */}
      <ConfirmModal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="删除照片"
        message="确定要删除这张照片吗？此操作不可撤销。"
        danger
      />

      {/* Delete album confirm */}
      <ConfirmModal
        open={deleteAlbumId !== null}
        onClose={() => setDeleteAlbumId(null)}
        onConfirm={handleDeleteAlbum}
        title="删除相册"
        message="确定要删除这个相册吗？相册内的照片不会被删除，但会变为未分类。"
        confirmText="删除"
        danger
      />
    </>
  );
}
