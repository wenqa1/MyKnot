import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
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
  isAfter,
  isBefore,
  parse,
  isValid,
  setMonth,
  setYear,
} from "date-fns";
import { zhCN } from "date-fns/locale";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  max?: string;
  min?: string;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1} 月`);

function parseFlexible(input: string, refDate?: Date): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Handle ISO 8601 datetime strings (e.g. "2026-05-25T00:00:00.000Z")
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed);
    if (isValid(d)) return d;
    // Fallback: extract date part only
    const dateOnly = trimmed.slice(0, 10);
    const parsed = parse(dateOnly, "yyyy-MM-dd", new Date(), { locale: zhCN });
    if (isValid(parsed)) return parsed;
  }

  const cleaned = trimmed.replace(/[.\-/年月]/g, (m) => (m === "年" || m === "月" ? "-" : "/"));

  const ref = refDate || new Date();
  const refYear = ref.getFullYear();

  const formats = ["yyyy-MM-dd", "yyyy/MM/dd", "yyyy.MM.dd", "yyyyMMdd", "MM-dd", "MM/dd", "M-d", "M/d"];

  for (const fmt of formats) {
    if (fmt.includes("yyyy")) {
      const parsed = parse(trimmed, fmt, ref, { locale: zhCN });
      if (isValid(parsed)) return parsed;
    }
  }

  for (const fmt of formats) {
    if (!fmt.includes("yyyy")) {
      const parsed = parse(trimmed, fmt, ref, { locale: zhCN });
      if (isValid(parsed)) {
        parsed.setFullYear(refYear);
        return parsed;
      }
    }
  }

  const jsDate = new Date(trimmed);
  if (isValid(jsDate)) return jsDate;

  return null;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  className = "",
  max,
  min,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const d = parseFlexible(value);
      if (d) return d.getFullYear();
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const d = parseFlexible(value);
      if (d) return d.getMonth();
    }
    return new Date().getMonth();
  });
  const [inputText, setInputText] = useState(() => {
    if (value) {
      const d = parseFlexible(value);
      if (d) return format(d, "yyyy-MM-dd");
      return value;
    }
    return "";
  });
  const [pickerMode, setPickerMode] = useState<"days" | "months">("days");

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseFlexible(value) : null;

  // Sync from external value changes
  useEffect(() => {
    if (value) {
      const d = parseFlexible(value);
      if (d) {
        setInputText(format(d, "yyyy-MM-dd"));
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    } else {
      setInputText("");
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickerMode("days");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const commitDay = useCallback(
    (d: Date) => {
      const formatted = format(d, "yyyy-MM-dd");
      setInputText(formatted);
      onChange(formatted);
      setOpen(false);
      setPickerMode("days");
    },
    [onChange],
  );

  const commitMonth = useCallback(
    (monthIndex: number) => {
      setViewMonth(monthIndex);
      setPickerMode("days");
    },
    [],
  );

  // --- Auto-segmenting input handler ---
  const handleInputChange = useCallback(
    (raw: string) => {
      // Strip all non-digits
      const digits = raw.replace(/\D/g, "");
      let formatted = "";
      if (digits.length <= 4) {
        formatted = digits;
      } else if (digits.length <= 6) {
        formatted = digits.slice(0, 4) + "-" + digits.slice(4);
      } else {
        formatted = digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6, 8);
      }
      // Max length: 10
      formatted = formatted.slice(0, 10);
      setInputText(formatted);
    },
    [],
  );

  const handleInputKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const parsed = parseFlexible(inputText);
        if (parsed) {
          const formatted = format(parsed, "yyyy-MM-dd");
          setInputText(formatted);
          onChange(formatted);
          setViewYear(parsed.getFullYear());
          setViewMonth(parsed.getMonth());
        }
        inputRef.current?.blur();
        setOpen(false);
        setPickerMode("days");
      }
      if (e.key === "Escape") {
        setOpen(false);
        setPickerMode("days");
      }
    },
    [inputText, onChange],
  );

  const handleInputBlur = useCallback(() => {
    const parsed = parseFlexible(inputText);
    if (parsed) {
      const clamped = applyBounds(parsed);
      const formatted = format(clamped, "yyyy-MM-dd");
      setInputText(formatted);
      onChange(formatted);
      setViewYear(clamped.getFullYear());
      setViewMonth(clamped.getMonth());
    } else if (value) {
      const d = parseFlexible(value);
      setInputText(d ? format(d, "yyyy-MM-dd") : value);
    } else {
      setInputText("");
    }
  }, [inputText, onChange, value]);

  function applyBounds(d: Date): Date {
    let result = d;
    if (min) {
      const minDate = new Date(min);
      if (isBefore(result, minDate)) result = minDate;
    }
    if (max) {
      const maxDate = new Date(max);
      if (isAfter(result, maxDate)) result = maxDate;
    }
    return result;
  }

  function isDisabled(day: Date): boolean {
    if (min && isBefore(day, new Date(min))) return true;
    if (max && isAfter(day, new Date(max))) return true;
    return false;
  }

  const currentViewDate = new Date(viewYear, viewMonth, 1);
  const monthStart = startOfMonth(currentViewDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = calStart;
  while (isBefore(cursor, calEnd) || isSameDay(cursor, calEnd)) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const today = new Date();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input with auto-segment */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKey}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          className="w-full px-4 py-3 pr-11 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all font-mono tracking-[0.05em]"
        />
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) setPickerMode("days");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-knot-rose hover:bg-knot-rose-light/20 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl shadow-knot-rose/5 w-[280px] animate-fade-in-up">
          {pickerMode === "days" ? (
            <>
              {/* Header — click month/year to enter month picker */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setViewMonth((m) => {
                      if (m === 0) { setViewYear((y) => y - 1); return 11; }
                      return m - 1;
                    });
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-knot-rose-light/20 hover:text-knot-rose transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode("months")}
                  className="text-sm font-semibold text-knot-dark hover:text-knot-rose transition-colors px-2 py-1 rounded-lg hover:bg-knot-rose-light/10"
                >
                  {viewYear} 年 {viewMonth + 1} 月
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMonth((m) => {
                      if (m === 11) { setViewYear((y) => y + 1); return 0; }
                      return m + 1;
                    });
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-knot-rose-light/20 hover:text-knot-rose transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-center text-[11px] font-medium text-stone-400 py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const outside = !isSameMonth(day, currentViewDate);
                  const isSel = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const disabled = isDisabled(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled || outside}
                      onClick={() => commitDay(day)}
                      className={[
                        "w-9 h-9 mx-auto my-0.5 rounded-lg text-sm transition-all",
                        outside && "text-stone-200 pointer-events-none",
                        !outside && !isSel && "text-stone-600 hover:bg-knot-rose-light/20",
                        isSel && "bg-knot-rose text-white shadow-sm shadow-knot-rose/30",
                        isToday && !isSel && "font-bold text-knot-rose ring-1 ring-knot-rose/30",
                        disabled && "opacity-30 pointer-events-none",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Month picker view */
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-knot-rose-light/20 hover:text-knot-rose transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode("days")}
                  className="text-sm font-semibold text-knot-dark hover:text-knot-rose transition-colors px-2 py-1 rounded-lg hover:bg-knot-rose-light/10"
                >
                  {viewYear} 年
                </button>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-knot-rose-light/20 hover:text-knot-rose transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((label, i) => {
                  const isCurrent = i === viewMonth;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => commitMonth(i)}
                      className={[
                        "py-2.5 rounded-xl text-sm font-medium transition-all",
                        isCurrent
                          ? "bg-knot-rose text-white shadow-sm shadow-knot-rose/30"
                          : "text-stone-600 hover:bg-knot-rose-light/20",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
