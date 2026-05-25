import Modal from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  loading = false,
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-knot-muted">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-stone-100 dark:bg-slate-700 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 ${
              danger
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-knot-rose text-white hover:bg-rose-500"
            }`}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
