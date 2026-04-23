import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus,
  KanbanSquare,
  ListChecks,
  Check,
  ArrowRight,
  Calendar,
  X,
  Users,
} from "lucide-react";
import { TopBar } from "@/components/layout/AppLayout";
import { Chip } from "@/components/ui/chip";
import { PersonAvatar } from "@/components/people/Avatar";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { DropdownPill } from "@/components/ui/dropdown-pill";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/ui/date-range-picker";
import { allTasks, followUps, type Scope, type Owner, type KanbanTask } from "@/data/tasks";
import { getPerson } from "@/data/people";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Genisys" },
      { name: "description", content: "Daily command center for tasks, meetings, and follow-ups." },
    ],
  }),
  component: TasksPage,
});

const meetings = [
  { time: "9:30 AM", duration: "30 min", co: "Northwind Analytics", type: "Discovery", contact: "David Mehta, VP Revenue", agent: "sl" },
  { time: "10:15 AM", duration: "45 min", co: "Halcyon Health", type: "Demo", contact: "Elise Parisi, Head of Growth", agent: "ev" },
  { time: "11:00 AM", duration: "30 min", co: "Ridgefield Capital", type: "Discovery", contact: "Bernard Orlov, CRO", agent: "mo" },
  { time: "1:30 PM", duration: "45 min", co: "Lumen Logistics", type: "Demo", contact: "Margo Achterberg, COO", agent: "jw" },
];

const SCOPES = [
  { id: "Daily" as Scope, label: "Daily" },
  { id: "Weekly" as Scope, label: "Weekly" },
  { id: "Monthly" as Scope, label: "Monthly" },
  { id: "Quarterly" as Scope, label: "Quarterly" },
] as const;

const OWNERS = [
  { id: "me" as Owner, label: "My tasks" },
  { id: "pod" as Owner, label: "Pod tasks" },
] as const;

const VIEWS = [
  { id: "checklist", label: "Checklist" },
  { id: "kanban", label: "Kanban" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Add context..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                toast.error("Add a title");
                return;
              }
              toast.success(`Task added: ${title}`);
              setTitle("");
              onOpenChange(false);
            }}
          >
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TasksPage() {
  const [owner, setOwner] = useState<Owner>("me");
  const [scope, setScope] = useState<Scope>("Daily");
  const [view, setView] = useState<ViewId>("checklist");
  const [range, setRange] = useState<DateRange>(() => defaultRange(7));
  const [newOpen, setNewOpen] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(
    new Set(allTasks.filter((t) => t.column === "done").map((t) => t.id)),
  );

  const filtered = useMemo<KanbanTask[]>(() => {
    return allTasks.filter((t) => t.owner === owner && t.scope === scope);
  }, [owner, scope]);

  const visibleTasks = filtered.map((t) => ({
    ...t,
    column: doneIds.has(t.id) ? ("done" as const) : t.column,
  }));

  const toggleDone = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Date-aware metric derivation. Range size scales the figures.
  const dayCount = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1,
  );

  const remaining = visibleTasks.filter((t) => !doneIds.has(t.id)).length;
  const completed = visibleTasks.length - remaining;

  const stats = [
    {
      label: "Tasks completed",
      value: String(completed * Math.max(1, Math.round(dayCount / 7))),
      sub: `${remaining} open`,
      barColor: "bg-emerald-500",
      pct: visibleTasks.length ? (completed / visibleTasks.length) * 100 : 0,
    },
    {
      label: "Meetings",
      value: String(meetings.length * Math.max(1, Math.round(dayCount / 1))),
      sub: `${dayCount} day${dayCount === 1 ? "" : "s"} window`,
      barColor: "bg-sky-400",
      pct: 64,
    },
    {
      label: "Follow-ups due",
      value: String(followUps.length),
      sub: owner === "me" ? "assigned to you" : "across the pod",
      barColor: "bg-amber-400",
      pct: 78,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <TopBar
        title="Tasks"
        breadcrumbs={["Genisys", "Tasks"]}
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New task
          </button>
        }
      />

      {/* Filters above KPI cards */}
      <div className="flex flex-wrap items-center gap-3">
        <DropdownPill value={owner} options={OWNERS} onChange={setOwner} icon={Users} />
        <DropdownPill value={scope} options={SCOPES} onChange={setScope} icon={Calendar} />
        <DateRangePicker value={range} onChange={setRange} align="start" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
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

      {/* View dropdown */}
      <div className="flex items-center justify-between">
        <DropdownPill
          value={view}
          options={VIEWS}
          onChange={setView}
          icon={view === "checklist" ? ListChecks : KanbanSquare}
        />
        <p className="text-xs text-muted-foreground">
          {visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"} · {scope.toLowerCase()}
        </p>
      </div>

      {/* Tasks view */}
      {view === "checklist" ? (
        <div className="rounded-2xl border border-border bg-surface p-2 shadow-soft">
          {visibleTasks.length === 0 ? (
            <div className="grid place-items-center py-16 text-sm text-muted-foreground">
              No tasks for {owner === "me" ? "you" : "the pod"} this {scope.toLowerCase()}.
            </div>
          ) : (
            <ul className="flex flex-col">
              {visibleTasks.map((t) => {
                const done = doneIds.has(t.id);
                return (
                  <li
                    key={t.id}
                    className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-muted"
                  >
                    <button
                      onClick={() => toggleDone(t.id)}
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary",
                      )}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm",
                          done
                            ? "text-muted-foreground line-through decoration-muted-foreground/60"
                            : "font-medium text-foreground",
                        )}
                      >
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.category} · {t.due}
                      </p>
                    </div>
                    {t.flag && (
                      <Chip tone={t.flag === "Flagged" ? "pink" : t.flag === "High" ? "amber" : "blue"}>
                        {t.flag}
                      </Chip>
                    )}
                    <button
                      onClick={() => toast.info(`Open ${t.title}`)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Open task"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border-soft px-3 py-2">
            <button
              onClick={() => setNewOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Add a task
            </button>
          </div>
        </div>
      ) : (
        <KanbanBoard tasks={visibleTasks} />
      )}

      {/* Next up + Follow-ups */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight">Next up</h2>
            <button
              onClick={() => toast.info("Showing all meetings")}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
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
                  onClick={() => toast.info(i === 0 ? `Joining ${m.co}` : `Opening ${m.co} details`)}
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

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight">Follow-ups scheduled</h2>
            <span className="text-xs font-medium text-muted-foreground">
              {followUps.length} scheduled
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {followUps.map((f) => {
              const p = getPerson(f.agent);
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft hover:bg-surface-muted"
                >
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-sm font-semibold">{f.who}</p>
                      <span className="truncate text-xs text-muted-foreground">· {f.co}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{f.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums">{f.when}</p>
                    <PersonAvatar person={p} size="xs" className="mt-1" />
                  </div>
                  <button
                    onClick={() => toast.success(`Marked ${f.who} follow-up done`)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {remaining} task{remaining === 1 ? "" : "s"} remaining for {owner === "me" ? "you" : "the pod"}.
          </p>
        </section>
      </div>

      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
