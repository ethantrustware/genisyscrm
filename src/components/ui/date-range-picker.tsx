import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { start: Date; end: Date };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmt = (d: Date) =>
  `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const between = (d: Date, a: Date, b: Date) => {
  const t = d.getTime();
  return t >= a.setHours(0, 0, 0, 0) && t <= b.setHours(23, 59, 59, 999);
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

const QUICK = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "This Month", thisMonth: true },
  { label: "Last Month", lastMonth: true },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
] as const;

function MonthGrid({
  cursor,
  range,
  hover,
  onPick,
  onHover,
  onPrev,
  onNext,
  showPrev,
  showNext,
}: {
  cursor: Date;
  range: DateRange | { start: Date; end: null } | null;
  hover: Date | null;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const start = range?.start ?? null;
  const end = (range && "end" in range ? range.end : null) ?? hover;

  return (
    <div className="w-[280px]">
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          onClick={onPrev}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted",
            !showPrev && "invisible",
          )}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </p>
        <button
          onClick={onNext}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted",
            !showNext && "invisible",
          )}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-medium text-muted-foreground">
        {DOW.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7">
        {Array.from({ length: first }).map((_, i) => (
          <span key={`pad-${i}`} className="h-9" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isStart = start && sameDay(date, start);
          const isEnd = end && sameDay(date, end);
          let inRange = false;
          if (start && end) {
            const a = startOfDay(start < end ? start : end);
            const b = startOfDay(start < end ? end : start);
            inRange = between(new Date(date), new Date(a), new Date(b));
          }
          return (
            <button
              key={day}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPick(date)}
              className={cn(
                "relative grid h-9 place-items-center text-sm transition",
                inRange && !isStart && !isEnd && "bg-primary-soft text-foreground",
                (isStart || isEnd) &&
                  "z-10 rounded-full bg-primary text-primary-foreground font-semibold",
                !inRange && !isStart && !isEnd && "hover:bg-muted text-foreground/80 rounded-full",
                isStart && end && !sameDay(start!, end) && "rounded-l-full rounded-r-none",
                isEnd && start && !sameDay(start, end!) && "rounded-r-full rounded-l-none",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  label,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  align?: "start" | "end" | "center";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date(value.start);
    d.setDate(1);
    return d;
  });
  const [draft, setDraft] = useState<{ start: Date; end: Date | null } | null>(null);
  const [hover, setHover] = useState<Date | null>(null);

  const display = useMemo(() => {
    if (label) return label;
    if (sameDay(value.start, value.end)) return fmt(value.start);
    return `${fmt(value.start)} – ${fmt(value.end)}`;
  }, [value, label]);

  const handlePick = (d: Date) => {
    if (!draft || draft.end) {
      setDraft({ start: d, end: null });
      return;
    }
    const start = draft.start <= d ? draft.start : d;
    const end = draft.start <= d ? d : draft.start;
    const next = { start: startOfDay(start), end: startOfDay(end) };
    setDraft(null);
    onChange(next);
    setOpen(false);
  };

  const applyQuick = (q: (typeof QUICK)[number]) => {
    const today = startOfDay(new Date());
    let start: Date;
    let end = today;
    if ("thisMonth" in q && q.thisMonth) {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if ("lastMonth" in q && q.lastMonth) {
      const m = today.getMonth() - 1;
      start = new Date(today.getFullYear(), m, 1);
      end = new Date(today.getFullYear(), m + 1, 0);
    } else {
      start = new Date(today);
      start.setDate(today.getDate() - ((q as { days: number }).days - 1));
    }
    onChange({ start, end });
    setDraft(null);
    setOpen(false);
  };

  const range = draft ?? value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
          <MonthGrid
            cursor={cursor}
            range={range}
            hover={hover}
            onPick={handlePick}
            onHover={setHover}
            onPrev={() => setCursor(addMonths(cursor, -1))}
            showPrev
          />
          <MonthGrid
            cursor={addMonths(cursor, 1)}
            range={range}
            hover={hover}
            onPick={handlePick}
            onHover={setHover}
            onNext={() => setCursor(addMonths(cursor, 1))}
            showNext
          />
        </div>
        <div className="mt-5 border-t border-border-soft pt-4">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => applyQuick(q)}
                className="rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-surface-muted hover:text-foreground"
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            {fmt(value.start)} <span className="text-muted-foreground">—</span> {fmt(value.end)}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper builders for default ranges
export function defaultRange(days = 30): DateRange {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return { start, end };
}
