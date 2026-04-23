import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus,
  SlidersHorizontal,
  Phone,
  Calendar as CalendarIcon,
  FileText,
  Trophy,
  ChevronRight,
  TrendingUp,
  Check,
  Crown,
  Medal,
  Award,
  Sparkles,
  Users,
  Building2,
  CalendarCheck,
} from "lucide-react";
import { TopBar } from "@/components/layout/AppLayout";
import { Chip } from "@/components/ui/chip";
import { AvatarStack, PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/call-center")({
  head: () => ({
    meta: [
      { title: "Call Center — Genisys" },
      {
        name: "description",
        content: "Live appointments, callbacks, EOD reports, agents, and leaderboard.",
      },
    ],
  }),
  component: CallCenterPage,
});

const tabs = [
  { id: "appointments", label: "Appointments", icon: CalendarIcon },
  { id: "agents", label: "Agents", icon: Phone },
  { id: "callbacks", label: "Callbacks", icon: Phone },
  { id: "eod", label: "EOD Reports", icon: FileText },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

type TabId = (typeof tabs)[number]["id"];

const baseStats = [
  { key: "appts", label: "Appts set today", value: 42, suffix: "", trend: "+14%", barColor: "bg-orange-400", pct: 78 },
  { key: "show", label: "Avg show rate", value: 74, suffix: "%", trend: "+2 pts", barColor: "bg-emerald-500", pct: 74 },
  { key: "calls", label: "Calls today", value: 318, suffix: "", trend: "+9%", barColor: "bg-sky-400", pct: 64 },
  { key: "live", label: "Live agents", value: 9, suffix: " / 12", trend: "active", barColor: "bg-amber-400", pct: 75 },
];

const podsList = ["All pods", "Aurora", "Meridian", "Solace"] as const;
type PodFilter = (typeof podsList)[number];

const callbacks = [
  { time: "10:45 AM", who: "Miriam Jensen", co: "Northwind Analytics", note: "Requested pricing details", agent: "sl" },
  { time: "2:00 PM", who: "Henrik Olofsson", co: "Lumen Logistics", note: "Loop in CFO", agent: "jw" },
  { time: "3:30 PM", who: "Roshni Gupta", co: "Kestrel Biotech", note: "Budget approval update", agent: "yt" },
  { time: "4:15 PM", who: "Beatriz Costa", co: "Harbor & Vine", note: "Reschedule demo", agent: "nb" },
];

const appointments = [
  { time: "9:30 AM", duration: "30 min", co: "Northwind Analytics", type: "Discovery", contact: "David Mehta, VP Revenue", agent: "sl" },
  { time: "10:15 AM", duration: "45 min", co: "Halcyon Health", type: "Demo", contact: "Elise Parisi, Head of Growth", agent: "ev" },
  { time: "11:00 AM", duration: "30 min", co: "Ridgefield Capital", type: "Discovery", contact: "Bernard Orlov, CRO", agent: "mo" },
  { time: "1:30 PM", duration: "45 min", co: "Lumen Logistics", type: "Demo", contact: "Margo Achterberg, COO", agent: "jw" },
];

type AgentRow = {
  id: string;
  status: "on-call" | "available" | "break" | "offline";
  dials: number;
  appts: number;
  show: string;
};
type Pod = { id: string; name: string; desc: string; dot: string; agents: AgentRow[] };

const podsData: Pod[] = [
  {
    id: "aurora",
    name: "Aurora",
    desc: "Enterprise SaaS · 5 members · Managed by Kenji Park",
    dot: "bg-sky-500",
    agents: [
      { id: "sl", status: "on-call", dials: 142, appts: 9, show: "78%" },
      { id: "mo", status: "available", dials: 118, appts: 11, show: "82%" },
      { id: "rc", status: "offline", dials: 0, appts: 0, show: "0%" },
      { id: "hr", status: "available", dials: 89, appts: 6, show: "68%" },
      { id: "ta", status: "on-call", dials: 124, appts: 9, show: "77%" },
    ],
  },
  {
    id: "meridian",
    name: "Meridian",
    desc: "Healthcare & Insurance · 4 members · Managed by Dana Wolcott",
    dot: "bg-rose-500",
    agents: [
      { id: "ev", status: "available", dials: 96, appts: 7, show: "71%" },
      { id: "jw", status: "on-call", dials: 88, appts: 5, show: "65%" },
      { id: "pr", status: "break", dials: 71, appts: 4, show: "60%" },
      { id: "yt", status: "available", dials: 102, appts: 6, show: "70%" },
    ],
  },
  {
    id: "solace",
    name: "Solace",
    desc: "FinTech & Financial Services · 3 members · Managed by Oluwaseun Adebayo",
    dot: "bg-amber-500",
    agents: [
      { id: "dh", status: "on-call", dials: 110, appts: 8, show: "74%" },
      { id: "nb", status: "available", dials: 92, appts: 5, show: "66%" },
    ],
  },
];

const statusDot = {
  "on-call": "bg-emerald-500",
  available: "bg-sky-500",
  break: "bg-amber-500",
  offline: "bg-zinc-400",
};
const statusLabel = {
  "on-call": "On call",
  available: "Available",
  break: "On break",
  offline: "Offline",
};

const eodReports = [
  { date: "2026-04-23", agent: "sl", pod: "Aurora", time: "5:42 PM", summary: "Booked 3 demos for Aurora pod. Northwind moving to procurement.", flagged: false },
  { date: "2026-04-23", agent: "mo", pod: "Aurora", time: "5:51 PM", summary: "Show rate dipped on Halcyon — switching to morning slots.", flagged: true },
  { date: "2026-04-23", agent: "ta", pod: "Aurora", time: "6:04 PM", summary: "Closed callback streak. Solace pod hit weekly quota.", flagged: false },
  { date: "2026-04-22", agent: "ev", pod: "Meridian", time: "5:30 PM", summary: "Halcyon decision-maker shifted, retargeting Tuesday.", flagged: false },
  { date: "2026-04-22", agent: "jw", pod: "Meridian", time: "5:55 PM", summary: "Lumen budget approval on hold — follow up Friday.", flagged: true },
  { date: "2026-04-21", agent: "dh", pod: "Solace", time: "5:48 PM", summary: "Ridgefield CFO loop-in scheduled for Wednesday.", flagged: false },
];

const leaderboard = [
  { id: "mo", value: 47 },
  { id: "sl", value: 41 },
  { id: "ta", value: 38 },
  { id: "dh", value: 33 },
  { id: "ev", value: 29 },
  { id: "hr", value: 24 },
  { id: "yt", value: 22 },
];

function StatCard({
  s,
  multiplier,
}: {
  s: (typeof baseStats)[number];
  multiplier: number;
}) {
  const adjusted = Math.round(s.value * multiplier);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <p className="text-[13px] text-muted-foreground">{s.label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-[26px] font-semibold tracking-tight tabular-nums">
          {adjusted}
          {s.suffix}
        </p>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <TrendingUp className="h-3.5 w-3.5" /> {s.trend}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", s.barColor)} style={{ width: `${s.pct}%` }} />
      </div>
    </div>
  );
}

function NewCallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [phone, setPhone] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new call</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!phone.trim()) {
                toast.error("Add a number");
                return;
              }
              toast.success(`Dialing ${phone}…`);
              setPhone("");
              onOpenChange(false);
            }}
          >
            Dial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PodAccordion({ pod, defaultOpen }: { pod: Pod; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const ids = pod.agents.map((a) => a.id);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-muted"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("h-2 w-2 rounded-full", pod.dot)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{pod.name}</p>
            <p className="truncate text-xs text-muted-foreground">{pod.desc}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AvatarStack ids={ids} max={4} />
          <ChevronRight
            className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-90")}
          />
        </div>
      </button>

      {open && (
        <ul className="border-t border-border-soft">
          {pod.agents.map((a) => {
            const p = getPerson(a.id);
            return (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-border-soft bg-surface-muted/40 px-5 py-3.5 first:border-t-0 hover:bg-surface-muted"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <PersonAvatar person={p} size="sm" />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-surface",
                        statusDot[a.status],
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{statusLabel[a.status]}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dials</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{a.dials}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Appts</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{a.appts}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Show</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{a.show}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

/* =========================================================================
 * EOD Reports — uses the top-bar DateRangePicker. No internal calendar.
 * Shows reports filtered by the selected range, pod, and agent.
 * ========================================================================= */
function EodReports({
  range,
  podFilter,
  agentFilter,
}: {
  range: DateRange;
  podFilter: PodFilter;
  agentFilter: string;
}) {
  const start = range.start.toISOString().slice(0, 10);
  const end = range.end.toISOString().slice(0, 10);

  const filtered = eodReports.filter(
    (r) =>
      (podFilter === "All pods" || r.pod === podFilter) &&
      (agentFilter === "all" || r.agent === agentFilter) &&
      r.date >= start &&
      r.date <= end,
  );

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, r) => {
    (acc[r.date] ||= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">EOD reports</h3>
        <Chip tone="blue">
          {filtered.length} report{filtered.length === 1 ? "" : "s"}
        </Chip>
      </div>

      {dates.length === 0 ? (
        <div className="grid place-items-center py-12 text-sm text-muted-foreground">
          No reports for the selected range.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {dates.map((d) => (
            <div key={d}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {new Date(d).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <ul className="mt-2 flex flex-col">
                {grouped[d].map((r, i) => {
                  const p = getPerson(r.agent);
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 border-t border-border-soft py-3.5 first:border-t-0 first:pt-2"
                    >
                      <PersonAvatar person={p} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{p.name}</p>
                          <span className="text-xs text-muted-foreground">
                            · {r.pod} · {r.time}
                          </span>
                          {r.flagged && <Chip tone="pink">Flagged</Chip>}
                        </div>
                        <p className="mt-1 text-sm text-foreground/80">{r.summary}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * Leaderboard — Apple / Liquid Glass aesthetic.
 * Frosted gradient podium + ranked rows.
 * ========================================================================= */
function PodiumCard({
  rank,
  id,
  value,
  prize,
}: {
  rank: 1 | 2 | 3;
  id: string;
  value: number;
  prize: string;
}) {
  const p = getPerson(id);
  const meta = {
    1: {
      icon: Crown,
      glow: "from-amber-200/70 via-amber-100/40 to-transparent",
      ring: "ring-amber-300/70",
      iconColor: "text-amber-500",
      pill: "bg-amber-400/90 text-amber-950",
      label: "1st",
      height: "h-[280px]",
    },
    2: {
      icon: Medal,
      glow: "from-zinc-200/60 via-zinc-100/30 to-transparent",
      ring: "ring-zinc-300/70",
      iconColor: "text-zinc-500",
      pill: "bg-zinc-300/90 text-zinc-900",
      label: "2nd",
      height: "h-[252px]",
    },
    3: {
      icon: Award,
      glow: "from-orange-200/60 via-orange-100/30 to-transparent",
      ring: "ring-orange-300/70",
      iconColor: "text-orange-500",
      pill: "bg-orange-400/90 text-orange-950",
      label: "3rd",
      height: "h-[230px]",
    },
  }[rank];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-end overflow-hidden rounded-3xl border border-border/60 bg-surface/70 px-5 pb-6 pt-8 shadow-card backdrop-blur-xl",
        meta.height,
      )}
    >
      {/* Frosted glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b",
          meta.glow,
        )}
      />
      {/* Subtle inner highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/40" />

      <span
        className={cn(
          "absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur",
          meta.pill,
        )}
      >
        {meta.label}
      </span>

      <Icon className={cn("mb-3 h-8 w-8", meta.iconColor)} strokeWidth={2} />

      <div className={cn("rounded-full ring-4 ring-offset-2 ring-offset-surface/0", meta.ring)}>
        <PersonAvatar person={p} size="lg" />
      </div>

      <p className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">{p.name}</p>
      <p className="text-xs text-muted-foreground">{p.role}</p>

      <p className="mt-3 text-[34px] font-bold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        appts set
      </p>

      <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-surface/80 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
        <Sparkles className="h-3 w-3 text-primary" />
        {prize}
      </div>
    </div>
  );
}

function CallCenterPage() {
  const [tab, setTab] = useState<TabId>("appointments");
  const [pod, setPod] = useState<PodFilter>("All pods");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [callOpen, setCallOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => defaultRange(30));

  const allAgents = useMemo(
    () => podsData.flatMap((p) => p.agents.map((a) => ({ ...a, pod: p.name }))),
    [],
  );

  const multiplier = pod === "All pods" ? 1 : pod === "Aurora" ? 0.55 : pod === "Meridian" ? 0.3 : 0.15;

  // Date-range scaling for stats / leaderboard.
  const dayCount = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1,
  );
  const rangeMultiplier = Math.max(1, Math.round(dayCount / 7));

  const podiumPrizes = ["$200 bonus", "$100 bonus", "$50 bonus"];

  // Workspace summary cards for Agents tab.
  const totalPods = podsData.length;
  const totalAgents = allAgents.length;
  const totalAppts = allAgents.reduce((sum, a) => sum + a.appts, 0);

  const agentSummary = [
    { label: "Pods", value: String(totalPods), icon: Building2, color: "text-sky-600 bg-sky-50" },
    { label: "Agents", value: String(totalAgents), icon: Users, color: "text-violet-600 bg-violet-50" },
    {
      label: "Appts (today)",
      value: String(totalAppts),
      icon: CalendarCheck,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <TopBar
        title="Call Center"
        breadcrumbs={["Genisys", "Operations", "Call Center"]}
        actions={
          <button
            onClick={() => setCallOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New call
          </button>
        }
      />

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-surface text-primary shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
                <SlidersHorizontal className="h-4 w-4" /> {pod}
                {tab === "eod" && agentFilter !== "all" && (
                  <Chip tone="blue" className="ml-1">
                    {getPerson(agentFilter).name.split(" ")[0]}
                  </Chip>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="end">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Pod</p>
              <ul className="flex flex-col">
                {podsList.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => setPod(p)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                        pod === p && "bg-primary-soft text-primary",
                      )}
                    >
                      {p}
                      {pod === p && <Check className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
              {tab === "eod" && (
                <>
                  <p className="mt-2 border-t border-border-soft px-2 pt-2 pb-1.5 text-xs font-semibold text-muted-foreground">
                    Agent
                  </p>
                  <ul className="flex max-h-48 flex-col overflow-y-auto">
                    <li>
                      <button
                        onClick={() => setAgentFilter("all")}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                          agentFilter === "all" && "bg-primary-soft text-primary",
                        )}
                      >
                        All agents
                        {agentFilter === "all" && <Check className="h-4 w-4" />}
                      </button>
                    </li>
                    {allAgents.map((a) => {
                      const p = getPerson(a.id);
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => setAgentFilter(a.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                              agentFilter === a.id && "bg-primary-soft text-primary",
                            )}
                          >
                            {p.name}
                            {agentFilter === a.id && <Check className="h-4 w-4" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats — only on Appointments */}
      {tab === "appointments" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {baseStats.map((s) => (
            <StatCard key={s.key} s={s} multiplier={multiplier} />
          ))}
        </div>
      )}

      {tab === "appointments" && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Appointments</h2>
            <Chip tone="blue">{appointments.length} scheduled</Chip>
          </div>
          <ul className="mt-4 flex flex-col">
            {appointments.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-4 border-t border-border-soft py-3.5 first:border-t-0 first:pt-0"
              >
                <div className="w-20">
                  <p className="text-sm font-semibold tabular-nums">{a.time}</p>
                  <p className="text-xs text-muted-foreground">{a.duration}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {a.co} <span className="text-muted-foreground">· {a.type}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.contact}</p>
                </div>
                <PersonAvatar person={getPerson(a.agent)} size="sm" />
                <button
                  onClick={() => toast.success(i === 0 ? `Joining ${a.co}…` : `Opened ${a.co} details`)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold",
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
      )}

      {tab === "agents" && (
        <>
          {/* Workspace summary above pods */}
          <div className="grid grid-cols-3 gap-4">
            {agentSummary.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-muted-foreground">{s.label}</p>
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg", s.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">
                    {s.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            {podsData
              .filter((p) => pod === "All pods" || p.name === pod)
              .map((p, i) => (
                <PodAccordion key={p.id} pod={p} defaultOpen={i === 0} />
              ))}
          </div>
        </>
      )}

      {tab === "callbacks" && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Callbacks scheduled</h2>
            <Chip tone="blue">{callbacks.length} scheduled</Chip>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {callbacks.map((c, i) => {
              const p = getPerson(c.agent);
              return (
                <div key={i} className="rounded-xl border border-border-soft bg-surface-muted p-4">
                  <p className="text-xs font-semibold text-muted-foreground">{c.time}</p>
                  <p className="mt-2 text-sm font-semibold">{c.who}</p>
                  <p className="text-xs text-muted-foreground">{c.co}</p>
                  <p className="mt-3 text-xs text-foreground/70">{c.note}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <PersonAvatar person={p} size="xs" />
                    <button
                      onClick={() => toast.success(`Calling ${c.who}…`)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Call back
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "eod" && (
        <EodReports range={range} podFilter={pod} agentFilter={agentFilter} />
      )}

      {tab === "leaderboard" && (
        <section className="flex flex-col gap-6">
          {/* Incentive banner — Apple-style frosted gradient */}
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary-soft via-surface to-amber-50 p-6 shadow-card backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Monthly challenge
                  </p>
                  <p className="text-base font-semibold tracking-tight">
                    Top setter wins $200 · Runners-up $100 / $50
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1 text-xs font-semibold backdrop-blur">
                  9 days left
                </span>
                <span className="text-muted-foreground">
                  Leader:{" "}
                  <span className="font-semibold text-foreground">
                    {getPerson(leaderboard[0].id).name.split(" ")[0]}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Podium — frosted glass */}
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
            <div className="sm:order-2">
              <PodiumCard
                rank={1}
                id={leaderboard[0].id}
                value={leaderboard[0].value * rangeMultiplier}
                prize={podiumPrizes[0]}
              />
            </div>
            <div className="sm:order-1">
              <PodiumCard
                rank={2}
                id={leaderboard[1].id}
                value={leaderboard[1].value * rangeMultiplier}
                prize={podiumPrizes[1]}
              />
            </div>
            <div className="sm:order-3">
              <PodiumCard
                rank={3}
                id={leaderboard[2].id}
                value={leaderboard[2].value * rangeMultiplier}
                prize={podiumPrizes[2]}
              />
            </div>
          </div>

          {/* Full ranking — clean Apple list */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight">Full ranking</h2>
              <span className="text-xs text-muted-foreground">
                {leaderboard.length} agents
              </span>
            </div>
            <ul>
              {leaderboard.map((l, i) => {
                const p = getPerson(l.id);
                const max = leaderboard[0].value;
                const pct = (l.value / max) * 100;
                const value = l.value * rangeMultiplier;
                const isTop3 = i < 3;
                return (
                  <li
                    key={l.id}
                    className="grid grid-cols-[40px_auto_1fr_180px_90px] items-center gap-4 border-b border-border-soft px-5 py-4 last:border-b-0 transition hover:bg-surface-muted"
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full text-sm font-bold tabular-nums",
                        i === 0 && "bg-amber-100 text-amber-700",
                        i === 1 && "bg-zinc-100 text-zinc-700",
                        i === 2 && "bg-orange-100 text-orange-700",
                        !isTop3 && "bg-muted text-foreground/60",
                      )}
                    >
                      {i + 1}
                    </span>
                    <PersonAvatar person={p} size="sm" />
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          i === 0 ? "bg-amber-400" : "bg-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-right text-sm font-semibold tabular-nums">
                      {value}{" "}
                      <span className="text-xs font-normal text-muted-foreground">appts</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <NewCallDialog open={callOpen} onOpenChange={setCallOpen} />
    </div>
  );
}
