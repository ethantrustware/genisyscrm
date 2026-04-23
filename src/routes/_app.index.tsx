import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  SlidersHorizontal,
  KanbanSquare,
  Table2,
  CalendarDays,
  Sparkles,
  Archive,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TopBar, NewMemberPill } from "@/components/layout/AppLayout";
import { Chip } from "@/components/ui/chip";
import { AvatarStack } from "@/components/people/Avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Tasks — Genisys" },
      { name: "description", content: "Manage tasks across pods, clients, and campaigns." },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  members: string[];
  deadline: string;
  priority: 1 | 2 | 3;
  status: "Completed" | "In Progress" | "Up Coming" | "Blocked";
  progress: number;
};

const tasks: Task[] = [
  {
    id: "t1",
    title: "Build Northwind discovery deck",
    members: ["mo", "sl"],
    deadline: "Jun 20, 2028",
    priority: 1,
    status: "Completed",
    progress: 100,
  },
  {
    id: "t2",
    title: "Halcyon Health script v3 review",
    members: ["jw", "pr", "ev"],
    deadline: "Jun 29, 2028",
    priority: 2,
    status: "In Progress",
    progress: 70,
  },
  {
    id: "t3",
    title: "Run Q3 show-rate analysis",
    members: ["sl", "rc", "pr"],
    deadline: "Oct 15, 2028",
    priority: 3,
    status: "Completed",
    progress: 100,
  },
  {
    id: "t4",
    title: "Onboard 2 new SDRs to Solace pod",
    members: ["mo", "ta", "dh"],
    deadline: "Mar 03, 2028",
    priority: 1,
    status: "Up Coming",
    progress: 70,
  },
  {
    id: "t5",
    title: "Document objection-handling playbook",
    members: ["nb", "hr", "yt"],
    deadline: "Jun 20, 2028",
    priority: 3,
    status: "In Progress",
    progress: 20,
  },
];

function PriorityChip({ p }: { p: 1 | 2 | 3 }) {
  const map = {
    1: { tone: "pink" as const, label: "Priority 1" },
    2: { tone: "amber" as const, label: "Priority 2" },
    3: { tone: "blue" as const, label: "Priority 3" },
  };
  const v = map[p];
  return <Chip tone={v.tone}>{v.label}</Chip>;
}

function StatusChip({ s }: { s: Task["status"] }) {
  const map = {
    Completed: "mint",
    "In Progress": "blue",
    "Up Coming": "pink",
    Blocked: "amber",
  } as const;
  return <Chip tone={map[s]}>{s}</Chip>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 100 ? "bg-primary" : "bg-primary",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function ViewTab({
  active,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      className={cn(
        "relative flex items-center gap-2 px-1 pb-3 text-sm font-medium transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary" />
      )}
    </button>
  );
}

function BoardTab({ active, label }: { active?: boolean; label: string }) {
  return (
    <button
      className={cn(
        "relative pb-3 text-sm font-medium transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary" />
      )}
    </button>
  );
}

function TasksPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <TopBar
        title="Marketing Tasks"
        breadcrumbs={["Genisys", "Pods", "Aurora", "Tasks"]}
        actions={
          <div className="flex items-center gap-2">
            <AvatarStack ids={["sl", "mo", "rc", "hr", "ta", "ev"]} max={5} extra={12} />
            <NewMemberPill />
          </div>
        }
      />

      {/* Board switcher */}
      <div className="flex items-center gap-6 border-b border-border-soft">
        <BoardTab active label="Aurora Pod" />
        <BoardTab label="Meridian Pod" />
        <button className="flex items-center gap-1.5 pb-3 text-sm font-medium text-primary">
          <Plus className="h-4 w-4" /> Add Board
        </button>
      </div>

      {/* View switcher + actions */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-soft">
        <div className="flex items-center gap-7">
          <ViewTab icon={KanbanSquare} label="Kanban" />
          <ViewTab active icon={Table2} label="Table" />
          <ViewTab icon={CalendarDays} label="Timeline" />
          <ViewTab icon={Sparkles} label="AI Assistant" />
          <ViewTab icon={Archive} label="Archive" />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium shadow-soft hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.2fr_88px] items-center gap-4 px-2 pb-3 text-[13px] font-medium text-muted-foreground">
          <span>Task</span>
          <span>Team Members</span>
          <span>Deadline</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Progress</span>
          <span className="text-right">Action</span>
        </div>

        <ul className="flex flex-col">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1.2fr_88px] items-center gap-4 border-t border-border-soft px-2 py-5 text-sm transition hover:bg-surface-muted"
            >
              <span className="font-medium text-foreground/90">{t.title}</span>
              <AvatarStack ids={t.members} max={3} />
              <span className="text-foreground/80 tabular-nums">{t.deadline}</span>
              <span><PriorityChip p={t.priority} /></span>
              <span><StatusChip s={t.status} /></span>
              <ProgressBar value={t.progress} />
              <div className="flex justify-end gap-2 text-muted-foreground">
                <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2 text-sm">
        <p className="text-muted-foreground">Showing 1–5 from 26</p>
        <div className="flex items-center gap-1.5">
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg text-sm font-medium",
                n === 1
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-foreground/80 hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
          <span className="px-1 text-muted-foreground">…</span>
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
