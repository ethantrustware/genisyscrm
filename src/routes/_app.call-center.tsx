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
  ChevronLeft,
  Check,
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
  pipeline: string;
};
type Pod = { id: string; name: string; desc: string; dot: string; agents: AgentRow[] };

const podsData: Pod[] = [
  {
    id: "aurora",
    name: "Aurora",
    desc: "Enterprise SaaS · 5 members · Managed by Kenji Park",
    dot: "bg-sky-500",
    agents: [
      { id: "sl", status: "on-call", dials: 142, appts: 9, show: "78%", pipeline: "$185K" },
      { id: "mo", status: "available", dials: 118, appts: 11, show: "82%", pipeline: "$221K" },
      { id: "rc", status: "offline", dials: 0, appts: 0, show: "0%", pipeline: "$0K" },
      { id: "hr", status: "available", dials: 89, appts: 6, show: "68%", pipeline: "$92K" },
      { id: "ta", status: "on-call", dials: 124, appts: 9, show: "77%", pipeline: "$156K" },
    ],
  },
  {
    id: "meridian",
    name: "Meridian",
    desc: "Healthcare & Insurance · 4 members · Managed by Dana Wolcott",
    dot: "bg-rose-500",
    agents: [
      { id: "ev", status: "available", dials: 96, appts: 7, show: "71%", pipeline: "$128K" },
      { id: "jw", status: "on-call", dials: 88, appts: 5, show: "65%", pipeline: "$94K" },
      { id: "pr", status: "break", dials: 71, appts: 4, show: "60%", pipeline: "$72K" },
      { id: "yt", status: "available", dials: 102, appts: 6, show: "70%", pipeline: "$118K" },
    ],
  },
  {
    id: "solace",
    name: "Solace",
    desc: "FinTech & Financial Services · 3 members · Managed by Oluwaseun Adebayo",
    dot: "bg-amber-500",
    agents: [
      { id: "dh", status: "on-call", dials: 110, appts: 8, show: "74%", pipeline: "$144K" },
      { id: "nb", status: "available", dials: 92, appts: 5, show: "66%", pipeline: "$88K" },
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
  { id: "mo", value: 11, sub: "appts today" },
  { id: "sl", value: 9, sub: "appts today" },
  { id: "ta", value: 9, sub: "appts today" },
  { id: "dh", value: 8, sub: "appts today" },
  { id: "ev", value: 7, sub: "appts today" },
  { id: "hr", value: 6, sub: "appts today" },
  { id: "yt", value: 6, sub: "appts today" },
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
                className="grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] items-center gap-4 border-t border-border-soft bg-surface-muted/40 px-5 py-3.5 first:border-t-0 hover:bg-surface-muted"
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
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-600">{a.pipeline}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

// Calendar utilities
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function EodCalendar({
  podFilter,
  agentFilter,
}: {
  podFilter: PodFilter;
  agentFilter: string;
}) {
  const [cursor, setCursor] = useState(new Date(2026, 3, 1)); // April 2026
  const [selected, setSelected] = useState<string>("2026-04-23");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const filteredReports = eodReports.filter(
    (r) =>
      (podFilter === "All pods" || r.pod === podFilter) &&
      (agentFilter === "all" || r.agent === agentFilter) &&
      r.date === selected,
  );

  const reportDates = new Set(
    eodReports
      .filter(
        (r) =>
          (podFilter === "All pods" || r.pod === podFilter) &&
          (agentFilter === "all" || r.agent === agentFilter),
      )
      .map((r) => r.date),
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">
            {MONTHS[month]} {year}
          </p>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {DOW.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: first }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const has = reportDates.has(dateStr);
            const isSel = selected === dateStr;
            return (
              <button
                key={day}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-md text-xs font-medium transition",
                  isSel
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground/80",
                )}
              >
                {day}
                {has && !isSel && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">EOD reports · {selected}</h3>
          <Chip tone="blue">{filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}</Chip>
        </div>
        {filteredReports.length === 0 ? (
          <div className="grid place-items-center py-12 text-sm text-muted-foreground">
            No reports for this day.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col">
            {filteredReports.map((r, i) => {
              const p = getPerson(r.agent);
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 border-t border-border-soft py-4 first:border-t-0 first:pt-0"
                >
                  <PersonAvatar person={p} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <span className="text-xs text-muted-foreground">· {r.pod} · {r.time}</span>
                      {r.flagged && <Chip tone="pink">Flagged</Chip>}
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">{r.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CallCenterPage() {
  const [tab, setTab] = useState<TabId>("appointments");
  const [pod, setPod] = useState<PodFilter>("All pods");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [callOpen, setCallOpen] = useState(false);
  const [lbRange, setLbRange] = useState("Today");

  const allAgents = useMemo(() => podsData.flatMap((p) => p.agents.map((a) => ({ ...a, pod: p.name }))), []);

  const multiplier = pod === "All pods" ? 1 : pod === "Aurora" ? 0.55 : pod === "Meridian" ? 0.3 : 0.15;

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

        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium shadow-soft hover:bg-muted">
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
            <h2 className="text-[17px] font-semibold">Appointments today</h2>
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
                  onClick={() => toast.info(i === 0 ? `Joining ${a.co}` : `Opening ${a.co} details`)}
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
        <div className="flex flex-col gap-4">
          {podsData
            .filter((p) => pod === "All pods" || p.name === pod)
            .map((p, i) => (
              <PodAccordion key={p.id} pod={p} defaultOpen={i === 0} />
            ))}
        </div>
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

      {tab === "eod" && <EodCalendar podFilter={pod} agentFilter={agentFilter} />}

      {tab === "leaderboard" && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Top performers</h2>
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1 text-xs">
              {["Today", "7D", "30D", "QTD"].map((r) => (
                <button
                  key={r}
                  onClick={() => setLbRange(r)}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium transition",
                    lbRange === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-4 flex flex-col">
            {leaderboard.map((l, i) => {
              const p = getPerson(l.id);
              const rankColor = ["text-amber-500", "text-zinc-400", "text-amber-700"][i] ?? "text-muted-foreground";
              const max = leaderboard[0].value;
              const pct = (l.value / max) * 100;
              return (
                <li
                  key={l.id}
                  className="grid grid-cols-[36px_auto_1fr_140px_80px] items-center gap-4 border-t border-border-soft py-4 first:border-t-0 first:pt-0"
                >
                  <span className={cn("text-lg font-bold tabular-nums", rankColor)}>{i + 1}</span>
                  <PersonAvatar person={p} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">
                    {l.value} <span className="text-xs font-normal text-muted-foreground">{l.sub.split(" ")[1]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <NewCallDialog open={callOpen} onOpenChange={setCallOpen} />
    </div>
  );
}
