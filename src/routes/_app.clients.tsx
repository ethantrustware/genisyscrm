import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, ChevronRight, Check, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/chip";
import { getPerson, people } from "@/data/people";
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
import { DropdownPill } from "@/components/ui/dropdown-pill";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Genisys" },
      {
        name: "description",
        content: "Active client engagements with appointment fulfillment and pod attribution.",
      },
    ],
  }),
  component: ClientsPage,
});

type Package = "Starter" | "Growth" | "Pro" | "Pay-per-appt";
type Status = "Active" | "Churned";

type Client = {
  id: string;
  name: string;
  initials: string;
  color: string;
  pod: string;
  podDot: string;
  agents: number;
  team: string[];
  package: Package;
  appts: number;
  cap: number | null;
  status: Status;
  deadline: string;
};

const PACKAGES: { id: Package; cap: number | null }[] = [
  { id: "Starter", cap: 10 },
  { id: "Growth", cap: 20 },
  { id: "Pro", cap: 30 },
  { id: "Pay-per-appt", cap: null },
];

const PODS = [
  { name: "Aurora", dot: "bg-sky-500" },
  { name: "Meridian", dot: "bg-rose-500" },
  { name: "Solace", dot: "bg-amber-500" },
];

const clientsData: Client[] = [
  { id: "northwind", name: "Northwind Analytics", initials: "NA", color: "bg-[oklch(0.75_0.13_270)]", pod: "Aurora", podDot: "bg-sky-500", agents: 4, team: ["sl", "mo", "rc", "ta"], package: "Pro", appts: 24, cap: 30, status: "Active", deadline: "May 15, 2026" },
  { id: "halcyon", name: "Halcyon Health", initials: "HH", color: "bg-[oklch(0.78_0.13_30)]", pod: "Meridian", podDot: "bg-rose-500", agents: 3, team: ["ev", "jw", "pr"], package: "Growth", appts: 16, cap: 20, status: "Active", deadline: "May 8, 2026" },
  { id: "ridgefield", name: "Ridgefield Capital", initials: "RC", color: "bg-[oklch(0.78_0.1_220)]", pod: "Solace", podDot: "bg-amber-500", agents: 2, team: ["mo", "ta"], package: "Pay-per-appt", appts: 18, cap: null, status: "Active", deadline: "—" },
  { id: "lumen", name: "Lumen Logistics", initials: "LL", color: "bg-[oklch(0.78_0.12_295)]", pod: "Meridian", podDot: "bg-rose-500", agents: 3, team: ["jw", "dh", "yt"], package: "Growth", appts: 12, cap: 20, status: "Active", deadline: "May 22, 2026" },
  { id: "kestrel", name: "Kestrel Biotech", initials: "KB", color: "bg-[oklch(0.8_0.13_140)]", pod: "Aurora", podDot: "bg-sky-500", agents: 2, team: ["yt", "hr"], package: "Starter", appts: 7, cap: 10, status: "Active", deadline: "Apr 30, 2026" },
  { id: "harbor", name: "Harbor & Vine", initials: "HV", color: "bg-[oklch(0.78_0.13_15)]", pod: "Solace", podDot: "bg-amber-500", agents: 2, team: ["nb", "hr"], package: "Starter", appts: 10, cap: 10, status: "Active", deadline: "Apr 28, 2026" },
  { id: "atlas", name: "Atlas Robotics", initials: "AR", color: "bg-[oklch(0.74_0.13_330)]", pod: "Aurora", podDot: "bg-sky-500", agents: 1, team: ["rc"], package: "Pay-per-appt", appts: 9, cap: null, status: "Active", deadline: "—" },
  { id: "cedar", name: "Cedar & Moss Home", initials: "CM", color: "bg-[oklch(0.8_0.13_140)]", pod: "Meridian", podDot: "bg-rose-500", agents: 2, team: ["dh", "nb"], package: "Pro", appts: 11, cap: 30, status: "Churned", deadline: "Mar 30, 2026" },
];

function StatusChip({ s }: { s: Status }) {
  if (s === "Churned") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
        Churned
      </span>
    );
  }
  return <Chip tone="mint">Active</Chip>;
}

function ApptProgress({ appts, cap, churned }: { appts: number; cap: number | null; churned: boolean }) {
  if (cap === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Pay-per-appt</span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-violet-500" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }
  const pct = Math.min((appts / cap) * 100, 100);
  let color = "bg-primary";
  if (churned) color = "bg-rose-500";
  else if (pct >= 100) color = "bg-emerald-500";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {Math.round(pct)}% fulfilled
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NewClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [pkg, setPkg] = useState<Package>("Growth");
  const [pod, setPod] = useState<string>("Aurora");
  const [team, setTeam] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");

  const cap = PACKAGES.find((p) => p.id === pkg)?.cap;

  const toggleAgent = (id: string) => {
    setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  };

  const reset = () => {
    setName("");
    setPkg("Growth");
    setPod("Aurora");
    setTeam([]);
    setDeadline("");
  };

  const submit = () => {
    if (!name.trim()) return toast.error("Add a client name");
    if (team.length === 0) return toast.error("Assign at least one agent");
    if (cap !== null && !deadline) return toast.error("Set a fulfillment deadline");
    toast.success(`${name} onboarded · ${pkg} · ${team.length} agent${team.length === 1 ? "" : "s"}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cname">Client name</Label>
            <Input id="cname" placeholder="Acme Inc." value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Package</Label>
              <DropdownPill
                value={pkg}
                options={PACKAGES.map((p) => ({
                  id: p.id,
                  label: p.cap === null ? `${p.id}` : `${p.id} · ${p.cap} appts`,
                }))}
                onChange={(v) => setPkg(v as Package)}
                width="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assigned pod</Label>
              <DropdownPill
                value={pod}
                options={PODS.map((p) => ({ id: p.name, label: p.name }))}
                onChange={setPod}
                width="w-44"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deadline">
              Fulfillment deadline {cap === null && <span className="text-muted-foreground">(optional for pay-per-appt)</span>}
            </Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Assign agents ({team.length} selected)</Label>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-border-soft bg-surface-muted p-2">
              <ul className="grid grid-cols-2 gap-1">
                {people
                  .filter((p) => p.role !== "Admin")
                  .map((p) => {
                    const sel = team.includes(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggleAgent(p.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface",
                            sel && "bg-primary-soft text-primary",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white", p.color)}>
                              {p.initials}
                            </span>
                            {p.name.split(" ")[0]}
                          </span>
                          {sel && <Check className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientsPage() {
  const [pkg, setPkg] = useState<"All" | Package>("All");
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => defaultRange(30));

  const dayCount = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1,
  );
  const rangeMultiplier = Math.max(0.3, Math.min(2, dayCount / 30));

  const stats = useMemo(() => {
    const total = clientsData.length;
    const active = clientsData.filter((c) => c.status === "Active").length;
    const totalAppts = Math.round(
      clientsData.reduce((sum, c) => sum + c.appts, 0) * rangeMultiplier,
    );
    const capped = clientsData.filter((c) => c.cap !== null && c.status === "Active");
    const avgFulfill =
      capped.length === 0
        ? 0
        : Math.round(
            (capped.reduce((sum, c) => sum + Math.min(c.appts / (c.cap as number), 1), 0) /
              capped.length) *
              100,
          );
    return [
      { label: "Active clients", value: String(active), sub: `${total - active} churned` },
      { label: "Appts delivered", value: String(totalAppts), sub: `last ${dayCount} day${dayCount === 1 ? "" : "s"}` },
      { label: "Avg fulfillment", value: `${avgFulfill}%`, sub: "of package caps" },
    ];
  }, [rangeMultiplier, dayCount]);

  const filtered = pkg === "All" ? clientsData : clientsData.filter((c) => c.package === pkg);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle="Track package fulfillment, pod assignment, and engagement status across the book."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New client
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DropdownPill
          value={pkg}
          options={[
            { id: "All" as const, label: "All packages" },
            ...PACKAGES.map((p) => ({ id: p.id as "All" | Package, label: p.id })),
          ]}
          onChange={setPkg}
        />
        <DateRangePicker value={range} onChange={setRange} align="start" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-[13px] text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div>
        <div className="grid grid-cols-[2fr_90px_120px_110px_1.4fr_110px_24px] items-center gap-4 px-2 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span>Agents</span>
          <span>Appts</span>
          <span>Package</span>
          <span>Progress</span>
          <span>Status</span>
          <span />
        </div>
        <ul>
          {filtered.map((c) => (
            <li
              key={c.id}
              onClick={() => toast.info(`Open ${c.name}`)}
              className="grid cursor-pointer grid-cols-[2fr_90px_120px_110px_1.4fr_110px_24px] items-center gap-4 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn("grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white shrink-0", c.color)}>
                  {c.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", c.podDot)} />
                    <p className="truncate text-xs text-muted-foreground">
                      {c.pod} pod · {c.team.map((id) => getPerson(id).name.split(" ")[0]).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums">{c.agents}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {c.appts}
                {c.cap !== null && (
                  <span className="text-muted-foreground"> / {c.cap}</span>
                )}
              </span>
              <span>
                <Chip tone={c.package === "Pro" ? "violet" : c.package === "Growth" ? "blue" : c.package === "Starter" ? "mint" : "amber"}>
                  {c.package}
                </Chip>
              </span>
              <ApptProgress appts={c.appts} cap={c.cap} churned={c.status === "Churned"} />
              <StatusChip s={c.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </div>

      <NewClientDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

// Suppress unused import warning when popover isn't used — keep for design parity.
void Popover;
void PopoverContent;
void PopoverTrigger;
