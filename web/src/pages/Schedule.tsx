import { useState, useEffect, useCallback } from "react";
import {
  getSchedule,
  saveSchedule,
  type ScheduleData,
} from "../api/client";
import GlassCard from "../components/GlassCard";
import Modal from "../components/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";

const PERSON_COLORS: Record<string, string> = {
  her: "bg-rose-50 border-rose-200 text-rose-600",
  him: "bg-purple-50 border-purple-200 text-purple-600",
  both: "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200",
};

const PERSON_LABELS: Record<string, string> = {
  her: "她",
  him: "他",
  both: "一起",
};

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState<{
    dayIndex: number;
    timeIndex: number;
  } | null>(null);
  const [cellForm, setCellForm] = useState({
    subject: "",
    person: "both" as "her" | "him" | "both",
    duration: 2,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSchedule();
      setSchedule(data);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function getItem(dayIndex: number, timeIndex: number) {
    return schedule?.items.find(
      (item) => item.dayIndex === dayIndex && item.timeIndex === timeIndex
    );
  }

  function openCell(dayIndex: number, timeIndex: number) {
    const existing = getItem(dayIndex, timeIndex);
    setEditCell({ dayIndex, timeIndex });
    if (existing) {
      setCellForm({
        subject: existing.subject,
        person: existing.person,
        duration: existing.duration,
      });
    } else {
      setCellForm({ subject: "", person: "both", duration: 2 });
    }
  }

  async function handleSaveCell() {
    if (!schedule || !editCell) return;

    const newItems = [...schedule.items];
    const existingIdx = newItems.findIndex(
      (item) =>
        item.dayIndex === editCell.dayIndex &&
        item.timeIndex === editCell.timeIndex
    );

    if (cellForm.subject.trim()) {
      if (existingIdx >= 0) {
        newItems[existingIdx] = {
          ...newItems[existingIdx],
          subject: cellForm.subject,
          person: cellForm.person,
          duration: cellForm.duration,
        };
      } else {
        newItems.push({
          id: 0,
          userId: 0,
          dayIndex: editCell.dayIndex,
          timeIndex: editCell.timeIndex,
          subject: cellForm.subject,
          person: cellForm.person,
          duration: cellForm.duration,
        });
      }
    } else if (existingIdx >= 0) {
      newItems.splice(existingIdx, 1);
    }

    setSaving(true);
    try {
      const updated = await saveSchedule({
        days: schedule.days,
        times: schedule.times,
        items: newItems.map(({ id: _id, userId: _uid, ...rest }) => rest),
      });
      setSchedule(updated);
      setEditCell(null);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCell() {
    if (!schedule || !editCell) return;

    const newItems = schedule.items.filter(
      (item) =>
        !(
          item.dayIndex === editCell.dayIndex &&
          item.timeIndex === editCell.timeIndex
        )
    );

    setSaving(true);
    try {
      const updated = await saveSchedule({
        days: schedule.days,
        times: schedule.times,
        items: newItems.map(({ id: _id, userId: _uid, ...rest }) => rest),
      });
      setSchedule(updated);
      setEditCell(null);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!schedule) return null;

  return (
    <div className="page-enter space-y-5">
      <h1
        className="text-2xl font-black text-knot-dark"
        style={{ fontFamily: "var(--font-display)" }}
      >
        日程
      </h1>

      {/* Schedule grid - horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
          <GlassCard className="p-0 overflow-hidden">
            {/* Header row */}
            <div className="grid gap-px bg-stone-100/50 dark:bg-slate-700/50 rounded-t-2xl overflow-hidden">
              <div className="grid gap-0" style={{ gridTemplateColumns: `80px repeat(${schedule.times.length}, 1fr)` }}>
                <div className="p-3 text-xs font-semibold text-knot-muted bg-stone-50/80 dark:bg-slate-800/80">
                  时间
                </div>
                {schedule.times.map((time, i) => (
                  <div
                    key={i}
                    className="p-3 text-xs font-semibold text-knot-muted bg-stone-50/80 dark:bg-slate-800/80 text-center"
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>

            {/* Day rows */}
            {schedule.days.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className="grid gap-0"
                style={{ gridTemplateColumns: `80px repeat(${schedule.times.length}, 1fr)` }}
              >
                <div className="p-3 text-xs font-semibold text-knot-muted bg-stone-50/40 dark:bg-slate-800/40 border-t border-stone-100 dark:border-slate-700 dark:border-slate-700 flex items-center">
                  {day}
                </div>
                {schedule.times.map((_time, timeIndex) => {
                  const item = getItem(dayIndex, timeIndex);
                  const colors = item
                    ? PERSON_COLORS[item.person]
                    : "";
                  return (
                    <button
                      key={timeIndex}
                      onClick={() => openCell(dayIndex, timeIndex)}
                      className={`min-h-[52px] p-1.5 border-t border-stone-100 dark:border-slate-700 text-xs flex flex-col items-center justify-center transition-colors hover:bg-knot-rose/5 ${
                        item ? colors + " border rounded-lg m-0.5" : ""
                      }`}
                    >
                      {item ? (
                        <>
                          <span className="font-semibold truncate w-full text-center">
                            {item.subject}
                          </span>
                          <span className="opacity-60 text-[10px]">
                            {PERSON_LABELS[item.person]}
                          </span>
                        </>
                      ) : (
                        <span className="text-stone-300 dark:text-slate-500 text-lg">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </GlassCard>
        </div>
      </div>

      {/* Cell edit modal */}
      <Modal
        open={editCell !== null}
        onClose={() => setEditCell(null)}
        title={
          editCell
            ? `${getItem(editCell.dayIndex, editCell.timeIndex) ? "编辑" : "添加"} ${schedule.days[editCell.dayIndex]} ${schedule.times[editCell.timeIndex]}`
            : ""
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-knot-dark">内容</span>
            <input
              type="text"
              value={cellForm.subject}
              onChange={(e) =>
                setCellForm({ ...cellForm, subject: e.target.value })
              }
              placeholder="例如：上课、学习"
              className="mt-1.5 w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-100 dark:border-slate-700 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-knot-dark">谁</span>
            <div className="flex gap-2 mt-1.5">
              {(["her", "him", "both"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setCellForm({ ...cellForm, person: p })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    cellForm.person === p
                      ? PERSON_COLORS[p] + " ring-2 ring-offset-1"
                      : "bg-stone-50 dark:bg-slate-800 text-knot-muted hover:bg-stone-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {PERSON_LABELS[p]}
                </button>
              ))}
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            {editCell && getItem(editCell.dayIndex, editCell.timeIndex) && (
              <button
                onClick={handleDeleteCell}
                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                删除
              </button>
            )}
            <button
              onClick={() => setEditCell(null)}
              className="flex-1 py-3 bg-stone-100 dark:bg-slate-700 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveCell}
              disabled={saving}
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
