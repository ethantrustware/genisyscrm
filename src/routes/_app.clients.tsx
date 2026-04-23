import { createFileRoute } from "@tanstack/react-router";
import { Plus, SlidersHorizontal, ChevronRight, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/chip";
import { AvatarStack } from "@/components/people/Avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Genisys" },
      {
        name: "description",
        content: "Active client engagements with pipeline attribution and agent assignments.",
      },
    ],
  }),
  component: ClientsPage,
});

type Client = {
  id: string;
  name: string;
  initials: string;
  industry: string;
  agents: number;
  appts: number;
  pipeline: string;
  status: "Active" | "Pilot" | "Paused";
  color: string;
  team: string[];
};

const clients: Client[] = [
  { id: "northwind", name: "Northwind Analytics", initials: "NA", industry: "Analytics SaaS", agents: 4, appts: 42, pipeline: "$386K", status: "Active", color: "bg-[oklch(0.75_0.13_270)]", team: ["sl", "mo", "rc", "ta"] },
  { id: "halcyon", name: "Halcyon Health", initials: "HH", industry: "Healthcare", agents: 3, appts: 31, pipeline: "$248K", status: "Active", color: "bg-[oklch(0.78_0.13_30)]", team: ["ev", "jw", "pr"] },
  { id: "ridgefield", name: "Ridgefield Capital", initials: "RC", industry: "FinTech", agents: 2, appts: 18, pipeline: "$412K", status: "Pilot", color: "bg-[oklch(0.78_0.1_220)]", team: ["mo", "ta"] },
  { id: "lumen", name: "Lumen Logistics", initials: "LL", industry: "Supply Chain", agents: 3, appts: 27, pipeline: "$196K", status: "Active", color: "bg-[oklch(0.78_0.12_295)]", team: ["jw", "dh", "yt"] },
  { id: "kestrel", name: "Kestrel Biotech", initials: "KB", industry: "Biotech", agents: 2, appts: 14, pipeline: "$178K", status: "Active", color: "bg-[oklch(0.8_0.13_140)]", team: ["yt", "hr"] },
  { id: "harbor", name: "Harbor & Vine", initials: "HV", industry: "Hospitality", agents: 2, appts: 21, pipeline: "$94K", status: "Active", color: "bg-[oklch(0.78_0.13_15)]", team: ["nb", "hr"] },
  { id: "atlas", name: "Atlas Robotics", initials: "AR", industry: "Industrial", agents: 1, appts: 9, pipeline: "$142K", status: "Pilot", color: "bg-[oklch(0.74_0.13_330)]", team: ["rc"] },
  { id: "cedar", name: "Cedar & Moss Home", initials: "CM", industry: "Consumer", agents: 2, appts: 23, pipeline: "$118K", status: "Active", color: "bg-[oklch(0.8_0.13_140)]", team: ["dh", "nb"] },
];

const stats = [
  { label: "Pipeline QTD", value: "$1.77M", delta: "+22%", green: true },
  { label: "Appts set", value: "185", delta: "+14%" },
  { label: "Avg show", value: "74%", delta: "+2 pts" },
  { label: "Active clients", value: "8", delta: "2 pilots" },
];

function StatusChip({ s }: { s: Client["status"] }) {
  const map = { Active: "mint", Pilot: "amber", Paused: "muted" } as const;
  return <Chip tone={map[s]}>{s}</Chip>;
}

function ClientsPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle="Eight active engagements. $1.77M pipeline generated this quarter across the book."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" /> All industries
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New client
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-[13px] text-muted-foreground">{s.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p
                className={cn(
                  "text-[26px] font-semibold tracking-tight tabular-nums",
                  s.green && "text-emerald-600",
                )}
              >
                {s.value}
              </p>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" /> {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div>
        <div className="grid grid-cols-[1.6fr_1fr_120px_120px_140px_120px_24px] items-center gap-4 px-2 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span>Industry</span>
          <span>Agents</span>
          <span>Appts</span>
          <span>Pipeline</span>
          <span>Status</span>
          <span />
        </div>
        <ul>
          {clients.map((c) => (
            <li
              key={c.id}
              className="grid cursor-pointer grid-cols-[1.6fr_1fr_120px_120px_140px_120px_24px] items-center gap-4 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn("grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white", c.color)}>
                  {c.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <div className="mt-1">
                    <AvatarStack ids={c.team} size="xs" max={4} />
                  </div>
                </div>
              </div>
              <span className="text-sm text-foreground/80">{c.industry}</span>
              <span className="text-sm font-medium tabular-nums">{c.agents}</span>
              <span className="text-sm font-medium tabular-nums">{c.appts}</span>
              <span className="text-sm font-semibold tabular-nums text-emerald-600">{c.pipeline}</span>
              <StatusChip s={c.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
