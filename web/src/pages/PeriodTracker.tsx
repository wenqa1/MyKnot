import { useState, useEffect, useCallback } from "react";
import {
  getPeriod,
  savePeriodConfig,
  createPeriodRecord,
  updatePeriodRecord,
  deletePeriodRecord,
  type PeriodData,
  type PeriodRecord,
} from "../api/client";
import { format, parseISO } from "date-fns";
import GlassCard from "../components/GlassCard";
import { HeartPulse, ClipboardList } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "text-rose-500",
  follicular: "text-purple-500",
  ovulation: "text-amber-500",
  luteal: "text-blue-500",
};

const PHASE_BG: Record<string, string> = {
  menstrual: "bg-rose-50 border-rose-200",
  follicular: "bg-purple-50 border-purple-100",
  ovulation: "bg-amber-50 border-amber-200",
  luteal: "bg-blue-50 border-blue-100",
};

const PHASE_CIRCLE: Record<string, string> = {
  menstrual: "#fb7185",
  follicular: "#c084fc",
  ovulation: "#fbbf24",
  luteal: "#60a5fa",
};

export default function PeriodTracker() {
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editRecord, setEditRecord] = useState<PeriodRecord | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [recordForm, setRecordForm] = useState({
    startDate: "",
    endDate: "",
    note: "",
  });
  const [configForm, setConfigForm] = useState({ cycleDays: 28, periodDays: 5 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPeriod();
      setData(result);
      if (result.config) {
        setConfigForm({
          cycleDays: result.config.cycleDays,
          periodDays: result.config.periodDays,
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

  async function handleSaveRecord() {
    if (!recordForm.startDate) return;
    setSaving(true);
    try {
      if (editRecord) {
        await updatePeriodRecord(editRecord.id, recordForm);
      } else {
        await createPeriodRecord(recordForm);
      }
      await load();
      setShowRecordForm(false);
      setEditRecord(null);
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord(id: number) {
    if (!confirm("确定删除这条记录？")) return;
    try {
      await deletePeriodRecord(id);
      await load();
    } catch {
      // fail silently
    }
  }

  async function handleSaveConfig() {
    setSaving(true);
    try {
      await savePeriodConfig(configForm);
      await load();
      setShowConfig(false);
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const prediction = data?.prediction;
  const records = data?.records || [];

  // Progress ring values
  const maxDays = data?.config?.cycleDays || 28;
  const periodDays = data?.config?.periodDays || 5;
  const currentDay = prediction?.dayInCycle || 0;
  const progressPct = prediction ? (currentDay / maxDays) * 100 : 0;
  const circumference = 2 * Math.PI * 80; // r=80
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;
  const phaseColor = prediction?.currentPhase
    ? PHASE_CIRCLE[prediction.currentPhase]
    : "#d6d3d1";

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-black text-knot-dark"
          style={{ fontFamily: "var(--font-display)" }}
        >
          经期关怀
        </h1>
        <button
          onClick={() => setShowConfig(true)}
          className="text-xs text-knot-muted font-medium hover:text-knot-rose transition-colors"
        >
          设置
        </button>
      </div>

      {!prediction && records.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="w-12 h-12" strokeWidth={1.5} />}
          message="还没有记录，添加第一条经期记录"
          action={() => {
            setEditRecord(null);
            setRecordForm({ startDate: "", endDate: "", note: "" });
            setShowRecordForm(true);
          }}
          actionLabel="添加记录"
        />
      ) : (
        <>
          {/* Progress ring */}
          {prediction && (
            <div className="flex justify-center">
              <div className="relative w-52 h-52">
                {/* Background circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {prediction.daysUntilNext >= 0 ? (
                    <>
                      <span className="text-4xl font-black text-knot-dark">
                        {prediction.daysUntilNext}
                      </span>
                      <span className="text-xs text-knot-muted mt-1">天后</span>
                      <span className="text-sm font-semibold text-knot-dark mt-0.5">
                        下次经期
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-bold text-rose-500">
                        经期中
                      </span>
                      <span className="text-xs text-knot-muted mt-1">
                        第 {Math.abs(prediction.daysUntilNext)} 天
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-knot-muted mt-1">
                    周期第 {prediction.dayInCycle} 天
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current phase */}
          {prediction?.currentPhase && (
            <GlassCard className={PHASE_BG[prediction.currentPhase] || ""}>
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl font-bold ${PHASE_COLORS[prediction.currentPhase] || ""}`}
                >
                  {prediction.currentPhaseLabel}
                </div>
              </div>
              {prediction.currentPhaseTip && (
                <p className="text-sm text-knot-muted mt-2">
                  {prediction.currentPhaseTip}
                </p>
              )}
              {prediction.ovulationWindowStart && (
                <p className="text-xs text-knot-muted mt-2">
                  排卵期: {prediction.ovulationWindowStart} ~{" "}
                  {prediction.ovulationWindowEnd}
                </p>
              )}
            </GlassCard>
          )}

          {/* Records list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-knot-dark">历史记录</h3>
              <button
                onClick={() => {
                  setEditRecord(null);
                  setRecordForm({
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: "",
                    note: "",
                  });
                  setShowRecordForm(true);
                }}
                className="text-xs text-knot-rose font-semibold hover:underline"
              >
                + 添加
              </button>
            </div>

            {records.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-12 h-12" strokeWidth={1.5} />}
                message="暂无记录"
              />
            ) : (
              records.map((record) => (
                <GlassCard
                  key={record.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
                  onClick={() => {
                    setEditRecord(record);
                    setRecordForm({
                      startDate:
                        typeof record.startDate === "string"
                          ? record.startDate
                          : format(new Date(record.startDate), "yyyy-MM-dd"),
                      endDate: record.endDate
                        ? typeof record.endDate === "string"
                          ? record.endDate
                          : format(new Date(record.endDate), "yyyy-MM-dd")
                        : "",
                      note: record.note || "",
                    });
                    setShowRecordForm(true);
                  }}
                >
                  <div>
                    <p className="font-semibold text-sm text-knot-dark">
                      {typeof record.startDate === "string"
                        ? format(
                            parseISO(record.startDate),
                            "yyyy 年 M 月 d 日"
                          )
                        : format(
                            new Date(record.startDate),
                            "yyyy 年 M 月 d 日"
                          )}
                      {record.endDate &&
                        ` ~ ${format(
                          typeof record.endDate === "string"
                            ? parseISO(record.endDate)
                            : new Date(record.endDate),
                          "M 月 d 日"
                        )}`}
                    </p>
                    {record.note && (
                      <p className="text-xs text-knot-muted mt-0.5">
                        {record.note}
                      </p>
                    )}
                  </div>
                  <span className="text-knot-muted text-sm">›</span>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}

      {/* Record form modal */}
      <Modal
        open={showRecordForm}
        onClose={() => {
          setShowRecordForm(false);
          setEditRecord(null);
        }}
        title={editRecord ? "编辑记录" : "添加记录"}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-knot-dark">开始日期</span>
            <input
              type="date"
              value={recordForm.startDate}
              onChange={(e) =>
                setRecordForm({ ...recordForm, startDate: e.target.value })
              }
              className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-knot-dark">
              结束日期 <span className="text-stone-300 font-normal">可选</span>
            </span>
            <input
              type="date"
              value={recordForm.endDate}
              onChange={(e) =>
                setRecordForm({ ...recordForm, endDate: e.target.value })
              }
              className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-knot-dark">
              备注 <span className="text-stone-300 font-normal">可选</span>
            </span>
            <textarea
              value={recordForm.note}
              onChange={(e) =>
                setRecordForm({ ...recordForm, note: e.target.value })
              }
              placeholder="记录身体感受..."
              rows={2}
              className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all resize-none"
            />
          </label>

          <div className="flex gap-3 pt-2">
            {editRecord && (
              <button
                onClick={() => handleDeleteRecord(editRecord.id)}
                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                删除
              </button>
            )}
            <button
              onClick={() => {
                setShowRecordForm(false);
                setEditRecord(null);
              }}
              className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveRecord}
              disabled={!recordForm.startDate || saving}
              className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Config modal */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title="经期设置">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-knot-dark">
              周期天数: {configForm.cycleDays} 天
            </span>
            <input
              type="range"
              min="15"
              max="60"
              value={configForm.cycleDays}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  cycleDays: parseInt(e.target.value),
                })
              }
              className="mt-1.5 w-full accent-knot-rose"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-knot-dark">
              经期天数: {configForm.periodDays} 天
            </span>
            <input
              type="range"
              min="1"
              max="14"
              value={configForm.periodDays}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  periodDays: parseInt(e.target.value),
                })
              }
              className="mt-1.5 w-full accent-knot-rose"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConfig(false)}
              className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveConfig}
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
