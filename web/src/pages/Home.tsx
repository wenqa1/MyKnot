import { useState, useEffect, useCallback } from "react";
import { getProfile, saveProfile, type Profile } from "../api/client";
import { differenceInDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Heart, Gift, User, Settings } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Modal from "../components/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import DatePicker from "../components/DatePicker";

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    relationshipStartDate: "",
    myName: "",
    partnerName: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
      if (data.relationshipStartDate) {
        setForm({
          relationshipStartDate: format(new Date(data.relationshipStartDate), "yyyy-MM-dd"),
          myName: data.myName || "",
          partnerName: data.partnerName || "",
        });
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!form.relationshipStartDate) return;
    setSaving(true);
    try {
      const updated = await saveProfile({
        relationshipStartDate: form.relationshipStartDate,
        myName: form.myName || null,
        partnerName: form.partnerName || null,
      });
      setProfile(updated);
      setEditing(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const hasProfile = profile?.relationshipStartDate;
  const days = hasProfile
    ? differenceInDays(new Date(), new Date(profile.relationshipStartDate!))
    : 0;
  const startDate = hasProfile
    ? new Date(profile.relationshipStartDate!)
    : null;

  // Calculate next anniversary
  const today = new Date();
  let nextAnniversary: Date | null = null;
  let daysUntilAnniversary = 0;

  if (startDate) {
    nextAnniversary = new Date(
      today.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    if (nextAnniversary <= today) {
      nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
    }
    daysUntilAnniversary = differenceInDays(nextAnniversary, today);
  }

  if (!hasProfile && !editing) {
    return (
      <div className="page-enter space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/settings")}
            className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-knot-muted hover:text-knot-dark transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center pt-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-knot-rose/10 text-knot-rose mb-4">
            <Heart className="w-10 h-10" fill="currentColor" />
          </div>
          <h1
            className="text-3xl font-black text-knot-dark mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Knot
          </h1>
          <p className="text-knot-muted text-sm">
            设置你们的开始日期，开启时光记录
          </p>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-knot-dark">
                在一起的日子
              </span>
              <DatePicker
                value={form.relationshipStartDate}
                onChange={(v) => setForm({ ...form, relationshipStartDate: v })}
                placeholder="选择在一起的日子"
                className="mt-1.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">我的名字</span>
                <input
                  type="text"
                  value={form.myName}
                  onChange={(e) =>
                    setForm({ ...form, myName: e.target.value })
                  }
                  placeholder="你"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 rounded-xl border border-white/40 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">TA的名字</span>
                <input
                  type="text"
                  value={form.partnerName}
                  onChange={(e) =>
                    setForm({ ...form, partnerName: e.target.value })
                  }
                  placeholder="TA"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 rounded-xl border border-white/40 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={!form.relationshipStartDate || saving}
              className="w-full py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {saving ? "保存中..." : "开始记录"}
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-5">
      {/* Settings */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate("/settings")}
          className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-knot-muted hover:text-knot-dark transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Countdown */}
      <div className="text-center pt-6 pb-2">
        <p className="text-knot-muted text-sm mb-1">
          {profile?.myName || "我"} & {profile?.partnerName || "TA"} · 在一起的第
        </p>
        <div
          className="text-7xl font-black text-knot-rose animate-pulse-soft"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {days.toLocaleString()}
        </div>
        <p className="text-knot-muted text-sm mt-1">天</p>
        <p className="text-stone-300 text-xs mt-0.5">
          {startDate && format(startDate, "yyyy 年 M 月 d 日")}
          {" · "}
          {startDate && format(startDate, "EEEE")}
        </p>
      </div>

      {/* Anniversary countdown */}
      {nextAnniversary && (
        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-xs text-knot-muted mb-0.5">
              距离{startDate && today.getFullYear() - startDate.getFullYear() + 1}
              周年纪念日
            </p>
            <p className="text-2xl font-bold text-knot-dark">
              {daysUntilAnniversary === 0
                ? "今天"
                : `还有 ${daysUntilAnniversary} 天`}
            </p>
          </div>
          <div className="text-knot-rose">
            <Gift className="w-10 h-10" strokeWidth={1.5} />
          </div>
        </GlassCard>
      )}

      {/* Profile info */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-knot-rose-light flex items-center justify-center text-knot-rose">
              <User className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-knot-dark">
                {profile?.myName || "我"}
              </p>
              <p className="text-xs text-knot-muted">
                在一起 {days} 天
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditing(true);
              setForm({
                relationshipStartDate: profile?.relationshipStartDate
                  ? format(new Date(profile.relationshipStartDate), "yyyy-MM-dd")
                  : "",
                myName: profile?.myName || "",
                partnerName: profile?.partnerName || "",
              });
            }}
            className="text-xs text-knot-rose font-medium hover:underline"
          >
            编辑
          </button>
        </div>
      </GlassCard>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="编辑资料">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-knot-dark">
              在一起的日子
            </span>
            <DatePicker
              value={form.relationshipStartDate}
              onChange={(v) => setForm({ ...form, relationshipStartDate: v })}
              placeholder="选择在一起的日子"
              className="mt-1.5"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-knot-dark">我的名字</span>
              <input
                type="text"
                value={form.myName}
                onChange={(e) => setForm({ ...form, myName: e.target.value })}
                className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-knot-dark">TA的名字</span>
              <input
                type="text"
                value={form.partnerName}
                onChange={(e) =>
                  setForm({ ...form, partnerName: e.target.value })
                }
                className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!form.relationshipStartDate || saving}
              className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
