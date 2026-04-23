export type TaskCategory =
  | "SCRIPTS"
  | "OPERATIONS"
  | "ANALYSIS"
  | "TEAM"
  | "CLIENT"
  | "REPORTING"
  | "HR"
  | "COACHING"
  | "OPS";

export type KanbanColumn = "todo" | "in_progress" | "blocked" | "done";

export type KanbanTask = {
  id: string;
  category: TaskCategory;
  title: string;
  due: string;
  assignee: string;
  column: KanbanColumn;
  // For "Today" myTasks list:
  flag?: "Flagged" | "Elise waiting" | "High";
};

const dot: Record<TaskCategory, string> = {
  SCRIPTS: "bg-rose-500",
  OPERATIONS: "bg-orange-500",
  ANALYSIS: "bg-violet-500",
  TEAM: "bg-amber-500",
  CLIENT: "bg-sky-500",
  REPORTING: "bg-amber-500",
  HR: "bg-amber-500",
  COACHING: "bg-emerald-500",
  OPS: "bg-amber-500",
};

export const categoryDot = (c: TaskCategory) => dot[c];

export const kanbanTasks: KanbanTask[] = [
  // To Do
  { id: "k1", category: "SCRIPTS", title: "Approve Halcyon Health script revision v3", due: "Today", assignee: "ev", column: "todo" },
  { id: "k2", category: "CLIENT", title: "Update Lumen Logistics qualification criteria", due: "Fri", assignee: "jw", column: "todo" },
  { id: "k3", category: "TEAM", title: "Schedule 1:1s with new Meridian hires", due: "Mon", assignee: "pr", column: "todo" },
  { id: "k4", category: "HR", title: "Compliance training — Q2", due: "Next week", assignee: "nb", column: "todo" },
  // In Progress
  { id: "k5", category: "OPERATIONS", title: "Review Aurora pod EOD reports", due: "Today", assignee: "sl", column: "in_progress" },
  { id: "k6", category: "TEAM", title: "Onboard 2 new SDRs to Solace pod", due: "Tomorrow", assignee: "dh", column: "in_progress" },
  { id: "k7", category: "REPORTING", title: "Q2 pipeline forecast — pull latest numbers", due: "Fri", assignee: "ta", column: "in_progress" },
  { id: "k8", category: "SCRIPTS", title: "Draft Kestrel Biotech objection handling guide", due: "Thu", assignee: "yt", column: "in_progress" },
  // Blocked
  { id: "k9", category: "ANALYSIS", title: "Investigate show rate dip on Ridgefield Capital", due: "Today", assignee: "mo", column: "blocked" },
  // Done
  { id: "k10", category: "COACHING", title: "Review call recordings — Marcus", due: "Yesterday", assignee: "mo", column: "done" },
  { id: "k11", category: "OPS", title: "Fix reporting export for Cedar & Moss", due: "Yesterday", assignee: "dh", column: "done" },
  { id: "k12", category: "CLIENT", title: "Sync with Halcyon on outreach cadence", due: "Yesterday", assignee: "ev", column: "done" },
];

export const myTodayTasks: KanbanTask[] = [
  { id: "t1", category: "OPERATIONS", title: "Review Aurora pod EOD reports", due: "Today", assignee: "sl", column: "todo", flag: "Flagged" },
  { id: "t2", category: "SCRIPTS", title: "Approve Halcyon Health script v3", due: "Today", assignee: "ev", column: "todo", flag: "Elise waiting" },
  { id: "t3", category: "ANALYSIS", title: "Investigate Ridgefield show rate dip", due: "Today", assignee: "mo", column: "todo", flag: "High" },
  { id: "t4", category: "TEAM", title: "Morning standup — Aurora pod", due: "Today", assignee: "sl", column: "done" },
  { id: "t5", category: "OPS", title: "Check inbox for overnight callbacks", due: "Today", assignee: "kp", column: "done" },
];
