import { useState, useEffect, useCallback } from "react";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getPeriod,
  type CalendarEvent,
  type PeriodData,
} from "../api/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns";
import { Solar, Lunar } from "lunar-javascript";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import DatePicker from "../components/DatePicker";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import KnotIcon, {
  EVENT_ICON_NAMES,
  DEFAULT_EVENT_ICON,
  getEventIcon,
} from "../components/KnotIcon";
import GlassCard from "../components/GlassCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import Modal from "../components/Modal";
import PeriodTracker from "./PeriodTracker";

const SOLAR_HOLIDAYS: Record<string, string> = {
  "01-01": "元旦",
  "02-14": "情人节",
  "03-08": "妇女节",
  "05-01": "劳动节",
  "05-20": "520",
  "06-01": "儿童节",
  "10-01": "国庆节",
  "12-25": "圣诞节",
};

const EVENT_COLORS = [
  "bg-pink-100 text-pink-600",
  "bg-purple-100 text-purple-600",
  "bg-amber-100 text-amber-600",
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-rose-100 text-rose-600",
];

function getLunarFestival(year: number, month: number, day: number): string | null {
  try {
    const lunar = Lunar.fromYmd(year, month, day);
    const festivals = lunar.getFestivals();
    if (festivals && festivals.length > 0) return festivals[0];

    const m = lunar.getMonth();
    const d = lunar.getDay();

    if (m === 1 && d === 1) return "春节";
    if (m === 1 && d === 15) return "元宵节";
    if (m === 5 && d === 5) return "端午节";
    if (m === 7 && d === 7) return "七夕";
    if (m === 7 && d === 15) return "中元节";
    if (m === 8 && d === 15) return "中秋节";
    if (m === 9 && d === 9) return "重阳节";
    if (m === 12 && d === 30) return "除夕";
  } catch {
    // Lunar date might not exist
  }
  return null;
}

const PHASE_DOT: Record<string, string> = {
  menstrual: "bg-rose-300",
  follicular: "bg-purple-300",
  ovulation: "bg-amber-300",
  luteal: "bg-blue-300",
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: "经期",
  follicular: "卵泡期",
  ovulation: "排卵期",
  luteal: "黄体期",
};

export default function Calendar() {
  const [tab, setTab] = useState<"calendar" | "period">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    date: "",
    icon: DEFAULT_EVENT_ICON,
    color: EVENT_COLORS[0],
    tag: "MEMORY",
    description: "",
    recurrence: "yearly" as "yearly" | "none",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evts, per] = await Promise.all([getEvents(), getPeriod()]);
      setEvents(evts);
      setPeriodData(per);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function prevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function nextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter((e) => {
      const eventDate = typeof e.date === "string" ? parseISO(e.date) : new Date(e.date);
      return (
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate() &&
        (e.recurrence === "yearly" || eventDate.getFullYear() === date.getFullYear())
      );
    });
  }

  function getPeriodPhase(date: Date): string | null {
    if (!periodData?.records?.length || !periodData.config) return null;

    const records = periodData.records;
    const config = periodData.config;

    for (let i = 0; i < records.length; i++) {
      const recordStart = new Date(records[i].startDate);
      const cycleEnd = addDays(recordStart, config.cycleDays);

      if (date >= recordStart && date < cycleEnd) {
        const diff = Math.round(
          (date.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        const dayInCycle = diff + 1;

        if (dayInCycle <= config.periodDays) return "menstrual";

        const ovulationDay = config.cycleDays - 13;
        const windowStart = Math.max(config.periodDays + 1, ovulationDay - 5);
        const windowEnd = Math.min(config.cycleDays, ovulationDay + 1);

        if (dayInCycle >= windowStart && dayInCycle <= windowEnd) return "ovulation";
        if (dayInCycle < windowStart) return "follicular";
        return "luteal";
      }
    }

    return null;
  }

  function getPeriodInfo(date: Date): { phase: string; dayInCycle: number; daysLeft: number } | null {
    if (!periodData?.records?.length || !periodData.config) return null;

    const records = periodData.records;
    const config = periodData.config;

    for (let i = 0; i < records.length; i++) {
      const recordStart = new Date(records[i].startDate);
      const cycleEnd = addDays(recordStart, config.cycleDays);

      if (date >= recordStart && date < cycleEnd) {
        const diff = Math.round(
          (date.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        const dayInCycle = diff + 1;

        let phase: string;
        if (dayInCycle <= config.periodDays) {
          phase = "menstrual";
        } else {
          const ovulationDay = config.cycleDays - 13;
          const windowStart = Math.max(config.periodDays + 1, ovulationDay - 5);
          const windowEnd = Math.min(config.cycleDays, ovulationDay + 1);
          if (dayInCycle >= windowStart && dayInCycle <= windowEnd) {
            phase = "ovulation";
          } else if (dayInCycle < windowStart) {
            phase = "follicular";
          } else {
            phase = "luteal";
          }
        }

        const daysLeft = config.periodDays - dayInCycle;
        return { phase, dayInCycle, daysLeft };
      }
    }
    return null;
  }

  async function handleSaveEvent() {
    if (!form.name || !form.date) return;

    try {
      if (editEvent) {
        await updateEvent(editEvent.id, form);
      } else {
        await createEvent(form);
      }
      await load();
      setShowForm(false);
      setEditEvent(null);
      setForm({
        name: "",
        date: "",
        icon: DEFAULT_EVENT_ICON,
        color: EVENT_COLORS[0],
        tag: "MEMORY",
        description: "",
        recurrence: "yearly",
      });
    } catch {
      // fail silently
    }
  }

  async function handleDeleteEvent(id: number) {
    setDeleteConfirmId(id);
  }

  async function confirmDeleteEvent() {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await deleteEvent(id);
      await load();
      setEditEvent(null);
      setShowForm(false);
      toast("success", "已删除");
    } catch {
      toast("error", "删除失败");
    }
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-enter space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/50 rounded-2xl p-1">
        <button
          onClick={() => setTab("calendar")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "calendar"
              ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/20"
              : "text-stone-500"
          }`}
        >
          日历
        </button>
        <button
          onClick={() => setTab("period")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "period"
              ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/20"
              : "text-stone-500"
          }`}
        >
          经期
        </button>
      </div>

      {tab === "period" ? (
        <PeriodTracker />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1
              className="text-2xl font-black text-knot-dark"
              style={{ fontFamily: "var(--font-display)" }}
            >
              重要日子
            </h1>
            <button
              onClick={() => {
                setEditEvent(null);
                setForm({
                  name: "",
                  date: selectedDate
                    ? format(selectedDate, "yyyy-MM-dd")
                    : format(new Date(), "yyyy-MM-dd"),
                  icon: DEFAULT_EVENT_ICON,
                  color: EVENT_COLORS[0],
                  tag: "MEMORY",
                  description: "",
                  recurrence: "yearly",
                });
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-knot-rose text-white rounded-full text-sm font-semibold hover:bg-rose-500 transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-knot-dark hover:bg-white/50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-knot-dark">
              {format(currentMonth, "yyyy 年 M 月")}
            </h2>
            <button
              onClick={nextMonth}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-knot-dark hover:bg-white/50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar grid */}
          <GlassCard className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-knot-muted py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {weeks.flat().map((date, i) => {
                const eventsOnDay = getEventsForDate(date);
                const phase = getPeriodPhase(date);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const dateStr = format(date, "MM-dd");
                const holiday = SOLAR_HOLIDAYS[dateStr];

                let lunarFestival: string | null = null;
                if (isCurrentMonth) {
                  try {
                    lunarFestival = getLunarFestival(
                      date.getFullYear(),
                      date.getMonth() + 1,
                      date.getDate()
                    );
                  } catch {
                    // skip
                  }
                }

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "ring-2 ring-knot-rose bg-knot-rose/5 scale-105 z-10"
                        : ""
                    } ${
                      !isCurrentMonth ? "opacity-25" : ""
                    } hover:bg-knot-rose/5`}
                  >
                    {/* Phase indicator — top-left corner (no overlap with events) */}
                    {phase && (
                      <div className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full ${PHASE_DOT[phase]}`} />
                    )}

                    {/* Today indicator */}
                    {isToday && (
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-knot-rose" />
                    )}

                    <span
                      className={`font-semibold ${
                        isToday ? "text-knot-rose" : "text-knot-dark"
                      }`}
                    >
                      {format(date, "d")}
                    </span>

                    {/* Holiday / Festival */}
                    {holiday && (
                      <span className="text-[8px] text-knot-rose font-medium leading-tight">
                        {holiday}
                      </span>
                    )}
                    {lunarFestival && !holiday && (
                      <span className="text-[8px] text-knot-purple font-medium leading-tight">
                        {lunarFestival}
                      </span>
                    )}

                    {/* Events row */}
                    {eventsOnDay.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {eventsOnDay.slice(0, 3).map((evt, j) => (
                          <KnotIcon
                            key={j}
                            name={evt.icon}
                            className="w-3.5 h-3.5"
                          />
                        ))}
                        {eventsOnDay.length > 3 && (
                          <span className="text-[9px] text-knot-muted">+{eventsOnDay.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Selected day details */}
          {selectedDate && (() => {
            const periodInfo = getPeriodInfo(selectedDate);
            const eventsOnSelected = getEventsForDate(selectedDate);
            return (
            <GlassCard>
              <h3 className="font-bold text-knot-dark mb-3">
                {format(selectedDate, "M 月 d 日 EEEE")}
              </h3>

              {/* Period info */}
              {periodInfo && (
                <div className={`rounded-xl p-3 mb-3 ${periodInfo.phase === "menstrual" ? "bg-rose-100 border border-rose-200" : periodInfo.phase === "ovulation" ? "bg-amber-100 border border-amber-200" : periodInfo.phase === "follicular" ? "bg-purple-100 border border-purple-200" : "bg-blue-100 border border-blue-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${PHASE_DOT[periodInfo.phase]}`} />
                    <span className="text-sm font-semibold text-knot-dark">
                      {PHASE_LABELS[periodInfo.phase]}
                    </span>
                  </div>
                  <p className="text-xs text-knot-muted">
                    周期第 {periodInfo.dayInCycle} 天
                    {periodInfo.phase === "menstrual" && periodInfo.daysLeft >= 0
                      ? `，预计还有 ${periodInfo.daysLeft} 天结束`
                      : periodInfo.phase === "menstrual"
                        ? "，最后一天"
                        : periodInfo.phase === "ovulation"
                          ? "，易孕期"
                          : ""}
                  </p>
                </div>
              )}

              {eventsOnSelected.length === 0 && !periodInfo ? (
                <p className="text-knot-muted text-sm">这一天还没有事件</p>
              ) : eventsOnSelected.length === 0 ? null : (
                <div className="space-y-2">
                  {eventsOnSelected.map((event) => {
                    const Icon = getEventIcon(event.icon);
                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          setEditEvent(event);
                          setForm({
                            name: event.name,
                            date: format(new Date(event.date), "yyyy-MM-dd"),
                            icon: event.icon,
                            color: event.color,
                            tag: event.tag,
                            description: event.description,
                            recurrence: event.recurrence,
                          });
                          setShowForm(true);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer ${event.color} hover:opacity-80 transition-opacity`}
                      >
                        <Icon className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{event.name}</p>
                          {event.description && (
                            <p className="text-xs opacity-75 truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs opacity-50">
                          {event.recurrence === "yearly" ? "每年" : "单次"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          );
          })()}

          {/* Event form modal */}
          <Modal
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setEditEvent(null);
            }}
            title={editEvent ? "编辑事件" : "添加事件"}
          >
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">名称</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：第一次见面"
                  className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">日期</span>
                <DatePicker
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  placeholder="选择日期"
                  className="mt-1.5"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">图标</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {EVENT_ICON_NAMES.map((iconName) => {
                    const Icon = getEventIcon(iconName);
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setForm({ ...form, icon: iconName })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          form.icon === iconName
                            ? "bg-knot-rose/20 ring-2 ring-knot-rose text-knot-rose"
                            : "bg-stone-50 text-knot-muted hover:bg-stone-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">颜色</span>
                <div className="flex gap-2 mt-1.5">
                  {EVENT_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-9 h-9 rounded-xl transition-all ${color.split(" ")[0]} ${
                        form.color === color
                          ? "ring-2 ring-offset-2 ring-knot-rose"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">描述</span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="可选"
                  rows={2}
                  className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all resize-none"
                />
              </label>

              <label className="flex items-center gap-3">
                <span className="text-sm font-medium text-knot-dark">每年重复</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      recurrence:
                        form.recurrence === "yearly" ? "none" : "yearly",
                    })
                  }
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    form.recurrence === "yearly" ? "bg-knot-rose" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      form.recurrence === "yearly"
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>

              <div className="flex gap-3 pt-2">
                {editEvent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editEvent.id)}
                    className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                  >
                    删除
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditEvent(null);
                  }}
                  className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  disabled={!form.name || !form.date}
                  className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  保存
                </button>
              </div>
            </div>
          </Modal>

          <ConfirmModal
            open={deleteConfirmId !== null}
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={confirmDeleteEvent}
            title="删除事件"
            message="确定要删除这个事件吗？此操作不可撤销。"
            danger
          />
        </>
      )}
    </div>
  );
}
