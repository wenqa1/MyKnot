import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exportData, importData } from "../api/client";
import { ArrowLeft, Sun, Moon, Palette, Image, Download, Upload, GripVertical, Eye, EyeOff } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";
import { useNav, type NavTab, ALL_TABS } from "../context/NavContext";
import { setBgImage, getBgImage } from "../components/Layout";

export default function AppSettings() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { tabs, setTabs } = useNav();
  const { toast } = useToast();

  // Background
  const [bgUrl, setBgUrl] = useState(() => getBgImage() || "");
  const [bgPreview, setBgPreview] = useState(() => getBgImage() || "");

  // Navigation editor
  const [editNav, setEditNav] = useState(false);
  const [navDraft, setNavDraft] = useState<NavTab[]>([]);

  // Data
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ── Background ──
  function handleSaveBg() {
    setBgImage(bgUrl.trim() || null);
    setBgPreview(bgUrl.trim() || "");
    toast("success", bgUrl.trim() ? "背景图已设置" : "背景图已清除");
  }

  // ── Navigation ──
  function openNavEditor() {
    setNavDraft([...tabs]);
    setEditNav(true);
  }

  function toggleNavTab(id: string) {
    const tab = navDraft.find((t) => t.id === id);
    if (tab) {
      if (navDraft.length <= 1) { toast("error", "至少保留一个导航按钮"); return; }
      setNavDraft(navDraft.filter((t) => t.id !== id));
    } else {
      if (navDraft.length >= 5) { toast("error", "最多 5 个导航按钮"); return; }
      const fromAll = ALL_TABS.find((t) => t.id === id);
      if (fromAll) {
        const idx = ALL_TABS.findIndex((t) => t.id === id);
        const newDraft = [...navDraft];
        newDraft.splice(Math.min(idx, newDraft.length), 0, fromAll);
        setNavDraft(newDraft);
      }
    }
  }

  function moveNavTab(id: string, dir: -1 | 1) {
    const idx = navDraft.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= navDraft.length) return;
    const newDraft = [...navDraft];
    [newDraft[idx], newDraft[newIdx]] = [newDraft[newIdx], newDraft[idx]];
    setNavDraft(newDraft);
  }

  function saveNav() {
    setTabs(navDraft);
    setEditNav(false);
    toast("success", "导航已更新");
  }

  // ── Data ──
  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myknot-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "数据已导出");
    } catch { toast("error", "导出失败"); } finally { setExporting(false); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const result = await importData(backup);
      toast("success", `已导入 ${result.imported} 条数据`);
    } catch { toast("error", "导入失败，请检查文件格式"); } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div className="page-enter space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/70 dark:bg-slate-800/70 flex items-center justify-center text-knot-dark dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-black text-knot-dark" style={{ fontFamily: "var(--font-display)" }}>
          应用设置
        </h1>
      </div>

      {/* Theme */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-knot-purple" /> : <Sun className="w-5 h-5 text-knot-amber" />}
            <div>
              <p className="font-semibold text-sm text-knot-dark">主题切换</p>
              <p className="text-xs text-knot-muted">{theme === "dark" ? "深色模式" : "浅色模式"}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-8 rounded-full transition-colors ${theme === "dark" ? "bg-knot-purple" : "bg-stone-200"}`}
          >
            <div className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow transition-transform flex items-center justify-center ${theme === "dark" ? "translate-x-6.5" : "translate-x-0.5"}`}>
              {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-knot-purple" /> : <Sun className="w-3.5 h-3.5 text-knot-amber" />}
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Background Image */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-knot-purple" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-knot-dark">自定义背景</p>
            <p className="text-xs text-knot-muted">设置页面背景图，留空则清除</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={bgUrl}
            onChange={(e) => { setBgUrl(e.target.value); setBgPreview(e.target.value); }}
            placeholder="输入图片 URL"
            className="flex-1 px-3 py-2.5 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
          />
          <button onClick={handleSaveBg} className="px-4 py-2.5 bg-knot-rose text-white rounded-xl text-sm font-semibold hover:bg-rose-500 transition-all active:scale-[0.98]">保存</button>
        </div>
        {bgPreview && (
          <div className="w-full h-24 rounded-xl bg-cover bg-center bg-no-repeat border border-stone-100 dark:border-slate-700" style={{ backgroundImage: `url(${bgPreview})` }} />
        )}
      </GlassCard>

      {/* Navigation Editor */}
      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image className="w-5 h-5 text-knot-rose" />
            <div>
              <p className="font-semibold text-sm text-knot-dark">底部导航</p>
              <p className="text-xs text-knot-muted">{tabs.length} 个按钮 (最多 5 个)</p>
            </div>
          </div>
          <button onClick={openNavEditor} className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-knot-dark dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">编辑</button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map((tab) => (
            <span key={tab.id} className="px-2.5 py-1 bg-knot-rose/10 text-knot-rose rounded-full text-xs font-medium">{tab.label}</span>
          ))}
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-knot-amber" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-knot-dark">数据管理</p>
            <p className="text-xs text-knot-muted">导出或导入云端备份数据</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} className="flex-1 py-2.5 bg-stone-100 dark:bg-slate-800 text-knot-dark dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
            <Download className="w-4 h-4" /> {exporting ? "导出中..." : "导出数据"}
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={importing} className="flex-1 py-2.5 bg-stone-100 dark:bg-slate-800 text-knot-dark dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
            <Upload className="w-4 h-4" /> {importing ? "导入中..." : "导入数据"}
          </button>
          <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </GlassCard>

      {/* Navigation Editor Modal */}
      <Modal open={editNav} onClose={() => setEditNav(false)} title="编辑底部导航">
        <div className="space-y-4">
          <p className="text-xs text-knot-muted">最多 5 个按钮，最少保留 1 个。点击眼睛图标显示/隐藏。</p>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-knot-muted uppercase">当前显示 ({navDraft.length})</p>
            {navDraft.map((tab, idx) => (
              <div key={tab.id} className="flex items-center gap-2 bg-stone-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                <button onClick={() => moveNavTab(tab.id, -1)} disabled={idx === 0} className="text-knot-muted hover:text-knot-dark disabled:opacity-20">
                  <GripVertical className="w-4 h-4" />
                </button>
                <span className="flex-1 text-sm font-medium text-knot-dark">{tab.label}</span>
                <button onClick={() => moveNavTab(tab.id, 1)} disabled={idx === navDraft.length - 1} className="text-xs px-2 py-1 bg-stone-200 dark:bg-slate-700 rounded text-knot-muted hover:text-knot-dark disabled:opacity-20">↓</button>
                <button onClick={() => moveNavTab(tab.id, -1)} disabled={idx === 0} className="text-xs px-2 py-1 bg-stone-200 dark:bg-slate-700 rounded text-knot-muted hover:text-knot-dark disabled:opacity-20">↑</button>
                <button onClick={() => toggleNavTab(tab.id)} className="text-red-400 hover:text-red-500 p-1"><EyeOff className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {ALL_TABS.filter((t) => !navDraft.find((d) => d.id === t.id)).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-knot-muted uppercase">已隐藏</p>
              {ALL_TABS.filter((t) => !navDraft.find((d) => d.id === t.id)).map((tab) => (
                <div key={tab.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm text-knot-muted line-through">{tab.label}</span>
                  <button onClick={() => toggleNavTab(tab.id)} className="text-knot-rose hover:text-rose-500 p-1"><Eye className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditNav(false)} className="flex-1 py-3 bg-stone-100 dark:bg-slate-800 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">取消</button>
            <button onClick={saveNav} className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 transition-all active:scale-[0.98]">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
