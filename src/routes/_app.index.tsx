import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar, ArrowRight, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/chip";
import { PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
import { myTodayTasks } from "@/data/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Today — Genisys" },
      { name: "description", content: "Your daily command center: meetings, tasks, callbacks." },
    ],
  }),
  component: TodayPage,
});

const stats = [
  { label: "Meetings today", value: "6", sub: "4 clients", barColor: "bg-sky-400", pct: 50 },
  { label: "Tasks to do", value: "3", sub: "of 5", barColor: "bg-orange-400", pct: 60 },
  { label: "Team appts", value: "42", sub: "+12% vs yesterday", barColor: "bg-amber-400", pct: 78 },
  { label: "Pipeline", value: "$1.84M", sub: "attributed", barColor: "bg-emerald-500", pct: 82 },
];

const meetings = [
  { time: "9:30 AM", duration: "30 min", co: "Northwind Analytics", type: "Discovery", contact: "David Mehta, VP Revenue", agent: "sl" },
  { time: "10:15 AM", duration: "45 min", co: "Halcyon Health", type: "Demo", contact: "Elise Parisi, Head of Growth", agent: "ev" },
  { time: "11:00 AM", duration: "30 min", co: "Ridgefield Capital", type: "Discovery", contact: "Bernard Orlov, CRO", agent: "mo" },
  { time: "1:30 PM", duration: "45 min", co: "Lumen Logistics", type: "Demo", contact: "Margo Achterberg, COO", agent: "jw" },
];

const callbacks = [
  { time: "10:45 AM", who: "Miriam Jensen", co: "Northwind Analytics", note: "Requested pricing details", agent: "sl" },
  { time: "2:00 PM", who: "Henrik Olofsson", co: "Lumen Logistics", note: "Needs to loop in CFO", agent: "jw" },
  { time: "3:30 PM", who: "Roshni Gupta", co: "Kestrel Biotech", note: "Budget approval update", agent: "yt" },
];

function TodayPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
      <PageHeader
        eyebrow="Wednesday, April 23"
        title={
          <>
            Good afternoon, Kenji <span aria-hidden>👋</span>
          </>
        }
        subtitle={
          <>
            You have <strong className="font-semibold text-foreground">6 meetings</strong> today across{" "}
            <strong className="font-semibold text-foreground">4 clients</strong>. Team is pacing{" "}
            <strong className="font-semibold text-foreground">42 appointments</strong>,{" "}
            <strong className="font-semibold text-emerald-600">$1.84M</strong> pipeline on the move.
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
              <Calendar className="h-4 w-4" /> Sept 24, 2028
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New task
            </button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
          >
            <p className="text-[13px] text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
              {s.value}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{s.sub}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", s.barColor)} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Next up */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight">Next up</h2>
            <button className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See all 6 <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {meetings.map((m, i) => (
              <li
                key={m.time}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition",
                  i === 0
                    ? "border-primary/20 bg-primary-soft"
                    : "border-border bg-surface shadow-soft hover:bg-surface-muted",
                )}
              >
                <div className="w-20 shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{m.time}</p>
                  <p className="text-xs text-muted-foreground">{m.duration}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {m.co} <span className="font-normal text-muted-foreground">· {m.type}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.contact}</p>
                </div>
                <PersonAvatar person={getPerson(m.agent)} size="sm" />
                <button
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                    i === 0
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border bg-surface text-foreground/80 hover:bg-muted",
                  )}
                >
                  {i === 0 ? "Join" : "Details"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* My tasks */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight">My tasks</h2>
            <span className="text-xs font-medium text-muted-foreground">3 to go</span>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-2 shadow-soft">
            <ul className="flex flex-col">
              {myTodayTasks.map((t) => {
                const done = t.column === "done";
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-muted"
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <p
                      className={cn(
                        "flex-1 truncate text-sm",
                        done
                          ? "text-muted-foreground line-through decoration-muted-foreground/60"
                          : "font-medium text-foreground",
                      )}
                    >
                      {t.title}
                    </p>
                    {t.flag && (
                      <Chip
                        tone={t.flag === "Flagged" ? "pink" : t.flag === "High" ? "amber" : "blue"}
                      >
                        {t.flag}
                      </Chip>
                    )}
                  </li>
                );
              })}
              <li className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-dashed border-border" />
                <input
                  placeholder="Add a task..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  ↵
                </kbd>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Callbacks */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight">Callbacks scheduled</h2>
          <span className="text-xs font-medium text-muted-foreground">3 scheduled</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {callbacks.map((c) => {
            const p = getPerson(c.agent);
            return (
              <div
                key={c.time}
                className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
              >
                <p className="text-xs font-semibold text-muted-foreground">{c.time}</p>
                <p className="mt-2 text-sm font-semibold">{c.who}</p>
                <p className="text-xs text-muted-foreground">{c.co}</p>
                <p className="mt-3 text-xs text-foreground/70">{c.note}</p>
                <div className="mt-4 flex items-center justify-between">
                  <PersonAvatar person={p} size="xs" />
                  <button className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Call back
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
