import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus,
  KanbanSquare,
  ListChecks,
  Check,
  ArrowRight,
  Calendar as CalendarIcon,
  X,
  Users,
  Paperclip,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { TopBar } from "@/components/layout/AppLayout";
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
  DialogDescription,
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

/* =========================================================================
 * Local task detail state — comments and attachments stored in memory.
 * ========================================================================= */
type Comment = { id: string; author: string; body: string; when: string };
type Attachment = { id: string; name: string; size: string };
type TaskExtras = { dueDate?: string; comments: Comment[]; attachments: Attachment[]; notes?: string };

function emptyExtras(): TaskExtras {
  return { comments: [], attachments: [] };
}

/* =========================================================================
 * New task dialog — title, due date, notes, attachments.
 * ========================================================================= */
function NewTaskDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: { title: string; dueDate: string; notes: string; attachments: Attachment[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const reset = () => {
    setTitle("");
    setDueDate("");
    setNotes("");
    setAttachments([]);
  };

  const submit = () => {
    if (!title.trim()) return toast.error("Add a title");
    onCreate({ title: title.trim(), dueDate, notes: notes.trim(), attachments });
    toast.success(`Task added: ${title.trim()}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Capture what needs doing — add a due date, notes and attachments.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add context, links, or instructions…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Attachments</Label>
            {attachments.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      {a.name}
                      <span className="text-xs text-muted-foreground">· {a.size}</span>
                    </span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => {
                const id = `a${Date.now()}`;
                setAttachments((prev) => [
                  ...prev,
                  { id, name: `briefing-${prev.length + 1}.pdf`, size: "184 KB" },
                ]);
                toast.success("Attachment added");
              }}
              className="flex items-center gap-2 self-start rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
            >
              <Paperclip className="h-3.5 w-3.5" /> Attach file
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
 * Task detail dialog — view & edit metadata, comment thread, attachments.
 * ========================================================================= */
function TaskDetailDialog({
  task,
  extras,
  onClose,
  onUpdateExtras,
  done,
  onToggleDone,
}: {
  task: KanbanTask | null;
  extras: TaskExtras;
  onClose: () => void;
  onUpdateExtras: (id: string, next: TaskExtras) => void;
  done: boolean;
  onToggleDone: (id: string) => void;
}) {
  const [comment, setComment] = useState("");

  if (!task) return null;
  const assignee = getPerson(task.assignee);

  const addComment = () => {
    if (!comment.trim()) return;
    const next: TaskExtras = {
      ...extras,
      comments: [
        ...extras.comments,
        { id: `c${Date.now()}`, author: "Kenji Park", body: comment.trim(), when: "Just now" },
      ],
    };
    onUpdateExtras(task.id, next);
    setComment("");
    toast.success("Comment added");
  };

  return (
    <Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3">
            <button
              onClick={() => onToggleDone(task.id)}
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary",
              )}
            >
              {done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "text-base leading-snug",
                done && "text-muted-foreground line-through decoration-muted-foreground/60",
              )}
            >
              {task.title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-soft bg-surface-muted p-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <p className="mt-0.5 font-medium">{task.category}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Due
            </p>
            <p className="mt-0.5 font-medium">{extras.dueDate || task.due}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assignee
            </p>
            <div className="mt-1 flex items-center gap-2">
              <PersonAvatar person={assignee} size="xs" />
              <span className="font-medium">{assignee.name}</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scope
            </p>
            <p className="mt-0.5 font-medium">{task.scope}</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Notes</p>
          <Textarea
            rows={2}
            placeholder="Add notes, context, links…"
            value={extras.notes ?? ""}
            onChange={(e) => onUpdateExtras(task.id, { ...extras, notes: e.target.value })}
          />
        </div>

        {/* Attachments */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              Attachments ({extras.attachments.length})
            </p>
            <button
              onClick={() => {
                const id = `a${Date.now()}`;
                onUpdateExtras(task.id, {
                  ...extras,
                  attachments: [
                    ...extras.attachments,
                    { id, name: `note-${extras.attachments.length + 1}.pdf`, size: "92 KB" },
                  ],
                });
                toast.success("Attached");
              }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Paperclip className="h-3.5 w-3.5" /> Attach
            </button>
          </div>
          {extras.attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {extras.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    {a.name}
                    <span className="text-xs text-muted-foreground">· {a.size}</span>
                  </span>
                  <button
                    onClick={() =>
                      onUpdateExtras(task.id, {
                        ...extras,
                        attachments: extras.attachments.filter((x) => x.id !== a.id),
                      })
                    }
                    className="text-muted-foreground hover:text-rose-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Comments */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Comments ({extras.comments.length})
          </p>
          {extras.comments.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {extras.comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-border-soft bg-surface-muted p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold">{c.author}</p>
                    <p className="text-[10px] text-muted-foreground">{c.when}</p>
                  </div>
                  <p className="mt-1 text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <Button onClick={addComment}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(
    new Set(allTasks.filter((t) => t.column === "done").map((t) => t.id)),
  );
  const [extras, setExtras] = useState<Record<string, TaskExtras>>({});
  const [createdTasks, setCreatedTasks] = useState<KanbanTask[]>([]);
  const [showAllMeetings, setShowAllMeetings] = useState(false);

  const filtered = useMemo<KanbanTask[]>(() => {
    return [...allTasks, ...createdTasks].filter((t) => t.owner === owner && t.scope === scope);
  }, [owner, scope, createdTasks]);

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

  const updateExtras = (id: string, next: TaskExtras) => {
    setExtras((prev) => ({ ...prev, [id]: next }));
  };

  const getExtras = (id: string) => extras[id] ?? emptyExtras();

  const handleCreate = (input: {
    title: string;
    dueDate: string;
    notes: string;
    attachments: Attachment[];
  }) => {
    const id = `n${Date.now()}`;
    const newTask: KanbanTask = {
      id,
      title: input.title,
      category: "OPS",
      due: input.dueDate || "Today",
      assignee: "kp",
      column: "todo",
      owner,
      scope,
    };
    setCreatedTasks((prev) => [newTask, ...prev]);
    setExtras((prev) => ({
      ...prev,
      [id]: { dueDate: input.dueDate, notes: input.notes, attachments: input.attachments, comments: [] },
    }));
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

  const openTask = visibleTasks.find((t) => t.id === openTaskId) ?? null;

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
        <DropdownPill value={scope} options={SCOPES} onChange={setScope} icon={CalendarIcon} />
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
                    className="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-muted"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDone(t.id);
                      }}
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
                    <button
                      onClick={() => setOpenTaskId(t.id)}
                      className="min-w-0 text-left"
                    >
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
                      <p className="mt-0.5 text-xs text-muted-foreground">{t.due}</p>
                    </button>
                    <button
                      onClick={() => setOpenTaskId(t.id)}
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
              onClick={() => setShowAllMeetings(true)}
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
                  onClick={() => toast.success(i === 0 ? `Joining ${m.co}…` : `Opened ${m.co} details`)}
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
                  <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
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

      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} onCreate={handleCreate} />
      <TaskDetailDialog
        task={openTask}
        extras={openTask ? getExtras(openTask.id) : emptyExtras()}
        onClose={() => setOpenTaskId(null)}
        onUpdateExtras={updateExtras}
        done={openTask ? doneIds.has(openTask.id) : false}
        onToggleDone={toggleDone}
      />

      {/* All meetings dialog */}
      <Dialog open={showAllMeetings} onOpenChange={setShowAllMeetings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>All upcoming meetings</DialogTitle>
            <DialogDescription>{meetings.length} scheduled today</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {meetings.map((m) => (
              <li
                key={m.time}
                className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-muted p-3"
              >
                <div className="w-20">
                  <p className="text-sm font-semibold tabular-nums">{m.time}</p>
                  <p className="text-xs text-muted-foreground">{m.duration}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{m.co}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.contact}</p>
                </div>
                <PersonAvatar person={getPerson(m.agent)} size="xs" />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
