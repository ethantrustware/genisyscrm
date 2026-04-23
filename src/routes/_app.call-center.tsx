import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  SlidersHorizontal,
  Phone,
  Calendar,
  FileText,
  Trophy,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { TopBar, NewMemberPill } from "@/components/layout/AppLayout";
import { Chip } from "@/components/ui/chip";
import { AvatarStack, PersonAvatar } from "@/components/people/Avatar";
import { getPerson, people } from "@/data/people";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/call-center")({
  head: () => ({
    meta: [
      { title: "Call Center — Genisys" },
      {
        name: "description",
        content: "Live appointments, callbacks, EOD reports, and agent leaderboard.",
      },
    ],
  }),
  component: CallCenterPage,
});

const tabs = [
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "callbacks", label: "Callbacks", icon: Phone },
  { id: "eod", label: "EOD Reports", icon: FileText },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

type TabId = (typeof tabs)[number]["id"];

const stats = [
  { label: "Pipeline QTD", value: "$1.84M", trend: "+12%", up: true },
  { label: "Appts set today", value: "42", trend: "+14%", up: true },
  { label: "Avg show rate", value: "74%", trend: "+2 pts", up: true },
  { label: "Live agents", value: "9", trend: "of 12", up: true },
];

const agents = [
  { id: "sl", dials: 142, appts: 9, show: "78%", pipeline: "$185K", status: "on-call" as const },
  { id: "mo", dials: 118, appts: 11, show: "82%", pipeline: "$221K", status: "available" as const },
  { id: "rc", dials: 0, appts: 0, show: "0%", pipeline: "$0K", status: "offline" as const },
  { id: "hr", dials: 89, appts: 6, show: "68%", pipeline: "$92K", status: "available" as const },
  { id: "ta", dials: 124, appts: 9, show: "77%", pipeline: "$156K", status: "on-call" as const },
  { id: "ev", dials: 96, appts: 7, show: "71%", pipeline: "$128K", status: "break" as const },
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

const callbacks = [
  { time: "10:45 AM", who: "Miriam Jensen", co: "Northwind Analytics", note: "Requested pricing details", agent: "sl" },
  { time: "2:00 PM", who: "Henrik Olofsson", co: "Lumen Logistics", note: "Loop in CFO", agent: "jw" },
  { time: "3:30 PM", who: "Roshni Gupta", co: "Kestrel Biotech", note: "Budget approval update", agent: "yt" },
];

const appointments = [
  { time: "9:30 AM", duration: "30 min", co: "Northwind Analytics", type: "Discovery", contact: "David Mehta, VP Revenue", agent: "sl" },
  { time: "10:15 AM", duration: "45 min", co: "Halcyon Health", type: "Demo", contact: "Elise Parisi, Head of Growth", agent: "ev" },
  { time: "11:00 AM", duration: "30 min", co: "Ridgefield Capital", type: "Discovery", contact: "Bernard Orlov, CRO", agent: "mo" },
  { time: "1:30 PM", duration: "45 min", co: "Lumen Logistics", type: "Demo", contact: "Margo Achterberg, COO", agent: "jw" },
];

const eodReports = [
  { agent: "sl", time: "5:42 PM", summary: "Booked 3 demos for Aurora pod. Northwind moving to procurement.", flagged: false },
  { agent: "mo", time: "5:51 PM", summary: "Show rate dipped on Halcyon — switching to morning slots.", flagged: true },
  { agent: "ta", time: "6:04 PM", summary: "Closed callback streak. Solace pod hit weekly quota.", flagged: false },
];

const leaderboard = [
  { id: "mo", value: "$221K", spark: [4, 6, 5, 7, 8, 9, 11] },
  { id: "sl", value: "$185K", spark: [3, 4, 6, 5, 7, 8, 9] },
  { id: "ta", value: "$156K", spark: [2, 3, 4, 6, 7, 7, 8] },
  { id: "ev", value: "$128K", spark: [2, 3, 4, 4, 5, 6, 7] },
  { id: "hr", value: "$92K", spark: [1, 2, 3, 3, 4, 5, 6] },
];

function StatCard({ s }: { s: (typeof stats)[number] }) {
  const Icon = s.up ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <p className="text-[13px] text-muted-foreground">{s.label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-[26px] font-semibold tracking-tight tabular-nums">{s.value}</p>
        <span className={cn("flex items-center gap-1 text-xs font-medium", s.up ? "text-emerald-600" : "text-rose-600")}>
          <Icon className="h-3.5 w-3.5" /> {s.trend}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/70" style={{ width: "62%" }} />
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80;
  const h = 24;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / Math.max(max - min, 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function CallCenterPage() {
  const [tab, setTab] = useState<TabId>("appointments");

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <TopBar
        title="Call Center"
        breadcrumbs={["Genisys", "Operations", "Call Center"]}
        actions={
          <div className="flex items-center gap-2">
            <AvatarStack ids={["sl", "mo", "rc", "hr", "ta", "ev"]} max={5} extra={6} />
            <NewMemberPill />
          </div>
        }
      />

      {/* Tab strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-soft">
        <div className="flex items-center gap-7">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 pb-3 text-sm font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {active && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium shadow-soft hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} s={s} />
        ))}
      </div>

      {tab === "appointments" && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* Next up */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Next up · Today</h2>
              <button className="text-sm font-medium text-primary hover:underline">See all 6 →</button>
            </div>
            <ul className="mt-4 flex flex-col">
              {appointments.map((a, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-3 py-3.5",
                    i === 0 ? "bg-primary-soft" : "hover:bg-surface-muted",
                  )}
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
          </div>

          {/* Agent grid card */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Aurora pod · Live</h2>
              <Chip tone="mint">5 active</Chip>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {agents.slice(0, 5).map((a) => {
                const p = getPerson(a.id);
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted"
                  >
                    <div className="relative">
                      <PersonAvatar person={p} size="md" />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface",
                          statusDot[a.status],
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{statusLabel[a.status]} · {p.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-emerald-600">{a.pipeline}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{a.appts} appts</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {tab === "callbacks" && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Callbacks scheduled</h2>
            <Chip tone="blue">{callbacks.length} scheduled</Chip>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
                    <button className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
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
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-[17px] font-semibold">EOD reports · Today</h2>
          <ul className="mt-4 flex flex-col">
            {eodReports.map((r, i) => {
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
                      <span className="text-xs text-muted-foreground">· {r.time}</span>
                      {r.flagged && <Chip tone="pink">Flagged</Chip>}
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">{r.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "leaderboard" && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Top performers · QTD</h2>
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1 text-xs">
              {["7D", "30D", "90D", "QTD"].map((r, i) => (
                <button
                  key={r}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium",
                    i === 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
              return (
                <li
                  key={l.id}
                  className="grid grid-cols-[36px_auto_1fr_120px_120px_24px] items-center gap-4 border-t border-border-soft py-4 first:border-t-0 first:pt-0"
                >
                  <span className={cn("text-lg font-bold tabular-nums", rankColor)}>{i + 1}</span>
                  <PersonAvatar person={p} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600">{l.value}</span>
                  <span className="text-primary"><Sparkline data={l.spark} /></span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Pods footer */}
      <section>
        <h2 className="mb-3 text-[17px] font-semibold">Pods</h2>
        <div className="flex flex-col gap-3">
          {[
            { name: "Aurora", desc: "Enterprise SaaS · 5 members · Managed by Kenji Park", ids: ["sl", "mo", "rc", "hr", "ta"], on: true },
            { name: "Meridian", desc: "Healthcare & Insurance · 4 members · Managed by Dana Wolcott", ids: ["ev", "jw", "pr", "yt"], on: false },
            { name: "Solace", desc: "FinTech & Financial Services · 3 members · Managed by Oluwaseun Adebayo", ids: ["dh", "nb", "yt"], on: false },
          ].map((pod) => (
            <div
              key={pod.name}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft"
            >
              <div>
                <p className="text-sm font-semibold">{pod.name}</p>
                <p className="text-xs text-muted-foreground">{pod.desc}</p>
              </div>
              <div className="flex items-center gap-4">
                <AvatarStack ids={pod.ids} max={4} />
                <button
                  className={cn(
                    "relative h-6 w-11 rounded-full transition",
                    pod.on ? "bg-primary" : "bg-muted",
                  )}
                  aria-label="Toggle pod"
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
                      pod.on ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
