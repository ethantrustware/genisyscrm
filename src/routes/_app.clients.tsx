import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, SlidersHorizontal, ChevronRight, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/chip";
import { AvatarStack } from "@/components/people/Avatar";
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
  cap: number | null; // null = pay per appt
  status: Status;
};

const PACKAGES: { id: Package; cap: number | null }[] = [
  { id: "Starter", cap: 10 },
  { id: "Growth", cap: 20 },
  { id: "Pro", cap: 30 },
  { id: "Pay-per-appt", cap: null },
];

const clientsData: Client[] = [
  { id: "northwind", name: "Northwind Analytics", initials: "NA", color: "bg-[oklch(0.75_0.13_270)]", pod: "Aurora", podDot: "bg-sky-500", agents: 4, team: ["sl", "mo", "rc", "ta"], package: "Pro", appts: 24, cap: 30, status: "Active" },
  { id: "halcyon", name: "Halcyon Health", initials: "HH", color: "bg-[oklch(0.78_0.13_30)]", pod: "Meridian", podDot: "bg-rose-500", agents: 3, team: ["ev", "jw", "pr"], package: "Growth", appts: 16, cap: 20, status: "Active" },
  { id: "ridgefield", name: "Ridgefield Capital", initials: "RC", color: "bg-[oklch(0.78_0.1_220)]", pod: "Solace", podDot: "bg-amber-500", agents: 2, team: ["mo", "ta"], package: "Pay-per-appt", appts: 18, cap: null, status: "Active" },
  { id: "lumen", name: "Lumen Logistics", initials: "LL", color: "bg-[oklch(0.78_0.12_295)]", pod: "Meridian", podDot: "bg-rose-500", agents: 3, team: ["jw", "dh", "yt"], package: "Growth", appts: 12, cap: 20, status: "Active" },
  { id: "kestrel", name: "Kestrel Biotech", initials: "KB", color: "bg-[oklch(0.8_0.13_140)]", pod: "Aurora", podDot: "bg-sky-500", agents: 2, team: ["yt", "hr"], package: "Starter", appts: 7, cap: 10, status: "Active" },
  { id: "harbor", name: "Harbor & Vine", initials: "HV", color: "bg-[oklch(0.78_0.13_15)]", pod: "Solace", podDot: "bg-amber-500", agents: 2, team: ["nb", "hr"], package: "Starter", appts: 10, cap: 10, status: "Active" },
  { id: "atlas", name: "Atlas Robotics", initials: "AR", color: "bg-[oklch(0.74_0.13_330)]", pod: "Aurora", podDot: "bg-sky-500", agents: 1, team: ["rc"], package: "Pay-per-appt", appts: 9, cap: null, status: "Active" },
  { id: "cedar", name: "Cedar & Moss Home", initials: "CM", color: "bg-[oklch(0.8_0.13_140)]", pod: "Meridian", podDot: "bg-rose-500", agents: 2, team: ["dh", "nb"], package: "Pro", appts: 11, cap: 30, status: "Churned" },
];

function StatusChip({ s }: { s: Status }) {
  return <Chip tone={s === "Active" ? "mint" : "muted"}>{s}</Chip>;
}

function ApptProgress({ appts, cap }: { appts: number; cap: number | null }) {
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
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-primary";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cname">Client name</Label>
            <Input id="cname" placeholder="Acme Inc." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Add a name");
                return;
              }
              toast.success(`Client added: ${name}`);
              setName("");
              onOpenChange(false);
            }}
          >
            Add client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientsPage() {
  const [pkg, setPkg] = useState<"All" | Package>("All");
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const total = clientsData.length;
    const active = clientsData.filter((c) => c.status === "Active").length;
    const totalAppts = clientsData.reduce((sum, c) => sum + c.appts, 0);
    const capped = clientsData.filter((c) => c.cap !== null);
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
      { label: "Appts delivered", value: String(totalAppts), sub: "this month" },
      { label: "Avg fulfillment", value: `${avgFulfill}%`, sub: "of package caps" },
    ];
  }, []);

  const filtered = pkg === "All" ? clientsData : clientsData.filter((c) => c.package === pkg);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle="Track package fulfillment, pod assignment, and engagement status across the book."
        actions={
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
                  <SlidersHorizontal className="h-4 w-4" />
                  {pkg === "All" ? "All packages" : pkg}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="end">
                <ul className="flex flex-col">
                  {(["All", ...PACKAGES.map((p) => p.id)] as const).map((p) => (
                    <li key={p}>
                      <button
                        onClick={() => setPkg(p)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                          pkg === p && "bg-primary-soft text-primary",
                        )}
                      >
                        {p}
                        {pkg === p && <Check className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New client
            </button>
          </>
        }
      />

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
        <div className="grid grid-cols-[2fr_100px_140px_120px_1.4fr_120px_24px] items-center gap-4 px-2 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
              className="grid cursor-pointer grid-cols-[2fr_100px_140px_120px_1.4fr_120px_24px] items-center gap-4 border-t border-border-soft px-2 py-4 transition hover:bg-surface-muted"
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
              <div className="flex items-center gap-2">
                <AvatarStack ids={c.team} size="xs" max={3} />
                <span className="text-sm font-medium tabular-nums">{c.agents}</span>
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
              <ApptProgress appts={c.appts} cap={c.cap} />
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
