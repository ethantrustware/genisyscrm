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

export type Scope = "Daily" | "Weekly" | "Monthly" | "Quarterly";
export type Owner = "me" | "pod";

export type KanbanTask = {
  id: string;
  category: TaskCategory;
  title: string;
  due: string;
  assignee: string;
  column: KanbanColumn;
  owner: Owner;
  scope: Scope;
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

export const allTasks: KanbanTask[] = [
  // ME — Daily
  { id: "m1", category: "OPERATIONS", title: "Review Aurora pod EOD reports", due: "Today", assignee: "kp", column: "todo", owner: "me", scope: "Daily", flag: "Flagged" },
  { id: "m2", category: "SCRIPTS", title: "Approve Halcyon Health script v3", due: "Today", assignee: "kp", column: "todo", owner: "me", scope: "Daily", flag: "Elise waiting" },
  { id: "m3", category: "ANALYSIS", title: "Investigate Ridgefield show rate dip", due: "Today", assignee: "kp", column: "in_progress", owner: "me", scope: "Daily", flag: "High" },
  { id: "m4", category: "TEAM", title: "Morning standup — Aurora pod", due: "Today", assignee: "kp", column: "done", owner: "me", scope: "Daily" },
  { id: "m5", category: "OPS", title: "Check inbox for overnight callbacks", due: "Today", assignee: "kp", column: "done", owner: "me", scope: "Daily" },
  // ME — Weekly
  { id: "m6", category: "REPORTING", title: "Weekly pipeline review with leadership", due: "Fri", assignee: "kp", column: "todo", owner: "me", scope: "Weekly" },
  { id: "m7", category: "COACHING", title: "1:1s with Aurora pod members", due: "Thu", assignee: "kp", column: "in_progress", owner: "me", scope: "Weekly" },
  // ME — Monthly
  { id: "m8", category: "REPORTING", title: "Month-end client attribution report", due: "Apr 30", assignee: "kp", column: "todo", owner: "me", scope: "Monthly" },
  // ME — Quarterly
  { id: "m9", category: "ANALYSIS", title: "Q2 OKR planning", due: "Jun 30", assignee: "kp", column: "todo", owner: "me", scope: "Quarterly" },

  // POD — Daily
  { id: "p1", category: "SCRIPTS", title: "Approve Halcyon Health script revision v3", due: "Today", assignee: "ev", column: "todo", owner: "pod", scope: "Daily" },
  { id: "p2", category: "CLIENT", title: "Update Lumen Logistics qualification criteria", due: "Fri", assignee: "jw", column: "todo", owner: "pod", scope: "Daily" },
  { id: "p3", category: "OPERATIONS", title: "Review Aurora pod EOD reports", due: "Today", assignee: "sl", column: "in_progress", owner: "pod", scope: "Daily" },
  { id: "p4", category: "TEAM", title: "Onboard 2 new SDRs to Solace pod", due: "Tomorrow", assignee: "dh", column: "in_progress", owner: "pod", scope: "Daily" },
  { id: "p5", category: "ANALYSIS", title: "Investigate show rate dip on Ridgefield", due: "Today", assignee: "mo", column: "blocked", owner: "pod", scope: "Daily" },
  { id: "p6", category: "COACHING", title: "Review call recordings — Marcus", due: "Yesterday", assignee: "mo", column: "done", owner: "pod", scope: "Daily" },
  { id: "p7", category: "OPS", title: "Fix reporting export for Cedar & Moss", due: "Yesterday", assignee: "dh", column: "done", owner: "pod", scope: "Daily" },
  // POD — Weekly
  { id: "p8", category: "TEAM", title: "Schedule 1:1s with new Meridian hires", due: "Mon", assignee: "pr", column: "todo", owner: "pod", scope: "Weekly" },
  { id: "p9", category: "REPORTING", title: "Q2 pipeline forecast — pull latest numbers", due: "Fri", assignee: "ta", column: "in_progress", owner: "pod", scope: "Weekly" },
  { id: "p10", category: "SCRIPTS", title: "Draft Kestrel Biotech objection handling guide", due: "Thu", assignee: "yt", column: "in_progress", owner: "pod", scope: "Weekly" },
  // POD — Monthly
  { id: "p11", category: "HR", title: "Compliance training — Q2", due: "Apr 30", assignee: "nb", column: "todo", owner: "pod", scope: "Monthly" },
  { id: "p12", category: "CLIENT", title: "Sync with Halcyon on outreach cadence", due: "Yesterday", assignee: "ev", column: "done", owner: "pod", scope: "Monthly" },
];

export type FollowUp = {
  id: string;
  who: string;
  co: string;
  when: string;
  reason: string;
  agent: string;
};

export const followUps: FollowUp[] = [
  { id: "f1", who: "Miriam Jensen", co: "Northwind Analytics", when: "Today · 3:00 PM", reason: "Send revised pricing proposal", agent: "sl" },
  { id: "f2", who: "Henrik Olofsson", co: "Lumen Logistics", when: "Tomorrow · 10:30 AM", reason: "Loop in CFO for budget approval", agent: "jw" },
  { id: "f3", who: "Roshni Gupta", co: "Kestrel Biotech", when: "Thu · 1:00 PM", reason: "Confirm Q3 implementation timeline", agent: "yt" },
  { id: "f4", who: "David Mehta", co: "Northwind Analytics", when: "Fri · 11:00 AM", reason: "Demo recap + next steps", agent: "mo" },
  { id: "f5", who: "Bernard Orlov", co: "Ridgefield Capital", when: "Mon · 9:00 AM", reason: "Procurement intro call", agent: "rc" },
];
