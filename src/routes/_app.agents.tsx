import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, SlidersHorizontal, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AvatarStack, PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Genisys" },
      { name: "description", content: "Twelve agents across three pods. Performance and pipeline at a glance." },
    ],
  }),
  component: AgentsPage,
});

type Status = "on-call" | "available" | "break" | "offline";

type AgentRow = {
  id: string;
  status: Status;
  dials: number;
  appts: number;
  show: string;
  pipeline: string;
};

type Pod = {
  id: string;
  name: string;
  desc: string;
  manager: string;
  dot: string;
  agents: AgentRow[];
};

const pods: Pod[] = [
  {
    id: "aurora",
    name: "Aurora",
    desc: "Enterprise SaaS · 5 members · Managed by Kenji Park",
    manager: "kp",
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
    manager: "dh",
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
    manager: "dh",
    dot: "bg-amber-500",
    agents: [
      { id: "dh", status: "on-call", dials: 110, appts: 8, show: "74%", pipeline: "$144K" },
      { id: "nb", status: "available", dials: 92, appts: 5, show: "66%", pipeline: "$88K" },
      { id: "yt", status: "offline", dials: 0, appts: 0, show: "0%", pipeline: "$0K" },
    ],
  },
];

const statusDot: Record<Status, string> = {
  "on-call": "bg-emerald-500",
  available: "bg-sky-500",
  break: "bg-amber-500",
  offline: "bg-zinc-400",
};

function StatCell({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          accent ? "text-emerald-600" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PodCard({ pod, defaultOpen }: { pod: Pod; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const ids = pod.agents.map((a) => a.id);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("h-2 w-2 rounded-full", pod.dot)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{pod.name}</p>
            <p className="truncate text-xs text-muted-foreground">{pod.desc}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AvatarStack ids={ids} max={4} />
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "relative h-6 w-11 rounded-full transition",
              open ? "bg-primary" : "bg-muted",
            )}
            aria-label={`Toggle ${pod.name} pod`}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
                open ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
      </header>

      {open && (
        <ul className="border-t border-border-soft">
          {pod.agents.map((a) => {
            const p = getPerson(a.id);
            return (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_24px] items-center gap-4 border-t border-border-soft bg-surface-muted/40 px-5 py-3.5 first:border-t-0 hover:bg-surface-muted"
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
                    <p className="truncate text-xs text-muted-foreground">{p.role}</p>
                  </div>
                </div>
                <StatCell label="Dials" value={a.dials} />
                <StatCell label="Appts" value={a.appts} />
                <StatCell label="Show" value={a.show} />
                <StatCell label="Pipeline" value={a.pipeline} accent />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function AgentsPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Agents"
        subtitle="Twelve agents across three pods. All Aurora pod members are in top 5 this quarter."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" /> All pods
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Invite agent
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {pods.map((pod, i) => (
          <PodCard key={pod.id} pod={pod} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
