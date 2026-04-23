import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
import {
  categoryDot,
  type KanbanColumn,
  type KanbanTask,
} from "@/data/tasks";

const COLS: { id: KanbanColumn; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

function TaskCard({ task }: { task: KanbanTask }) {
  const done = task.column === "done";
  const person = getPerson(task.assignee);
  return (
    <article
      className={cn(
        "group relative cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-soft transition hover:shadow-card",
        done && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", categoryDot(task.category))} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {task.category}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-sm font-semibold leading-snug text-foreground",
          done && "text-muted-foreground line-through decoration-muted-foreground/60",
        )}
      >
        {task.title}
      </p>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-xs text-muted-foreground">{task.due}</span>
        <PersonAvatar person={person} size="xs" />
      </div>
    </article>
  );
}

function ColumnHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs font-medium text-muted-foreground">{count}</span>
      </div>
      <button
        className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Add to ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: KanbanTask[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {COLS.map((col) => {
        const items = tasks.filter((t) => t.column === col.id);
        return (
          <section key={col.id} className="flex flex-col">
            <ColumnHeader label={col.label} count={items.length} />
            <div className="flex flex-col gap-3">
              {items.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
              <button className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> Add task
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
