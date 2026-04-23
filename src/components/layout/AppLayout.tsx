import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Settings,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Phone,
  Building2,
  LayoutGrid,
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  User,
  Users,
  CreditCard,
  Bell,
  Mail,
  BookOpen,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavItem = {
  to: "/tasks" | "/call-center" | "/clients";
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const nav: NavItem[] = [
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/call-center", label: "Call Center", icon: Phone },
  { to: "/clients", label: "Clients", icon: Building2 },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
      }}
      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* =========================================================================
 * Global dialogs: Settings, Help & Support, Profile, Workspace, Search.
 * Each is a simple but functional prototype with filler data.
 * ========================================================================= */

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const sections = [
    {
      group: "Account",
      items: [
        { id: "profile", icon: User, label: "Profile", desc: "Name, email, photo" },
        { id: "team", icon: Users, label: "Team & roles", desc: "12 members · 3 pods" },
        { id: "billing", icon: CreditCard, label: "Billing", desc: "Pro plan · renews May 12" },
      ],
    },
    {
      group: "Workspace",
      items: [
        { id: "noti", icon: Bell, label: "Notifications", desc: "Email, push, in-app" },
        { id: "appearance", icon: Sun, label: "Appearance", desc: "Light / dark / system" },
        { id: "integrations", icon: LayoutGrid, label: "Integrations", desc: "GoHighLevel, Slack, Zapier" },
      ],
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account, workspace and integrations.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {sections.map((s) => (
            <div key={s.group}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.group}
              </p>
              <ul className="overflow-hidden rounded-xl border border-border-soft">
                {s.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.id}>
                      <button
                        onClick={() => toast.success(`Opened ${it.label}`)}
                        className="flex w-full items-center gap-3 border-b border-border-soft bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-muted"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">{it.label}</span>
                          <span className="block text-xs text-muted-foreground">{it.desc}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const items = [
    { icon: BookOpen, label: "Documentation", desc: "Guides, API reference, recipes" },
    { icon: MessageCircle, label: "Live chat", desc: "Avg response 2 min · 9am–6pm PT" },
    { icon: Mail, label: "Email support", desc: "support@genisys.io" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>Find answers fast or talk to our team.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.label}>
                <button
                  onClick={() => toast.success(`${it.label} — opening…`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:bg-surface-muted"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{it.label}</span>
                    <span className="block text-xs text-muted-foreground">{it.desc}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = getPerson("kp");
  const [status, setStatus] = useState<"Available" | "Busy" | "Away">("Available");
  const items = [
    { icon: User, label: "View profile", action: () => toast.success("Opened your profile") },
    { icon: Settings, label: "Account settings", action: () => toast.success("Opened settings") },
    { icon: CreditCard, label: "Billing & plan", action: () => toast.success("Opened billing") },
    { icon: LogOut, label: "Sign out", action: () => toast.success("Signed out (demo)"), danger: true },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your account</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
          <PersonAvatar person={me} size="md" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-muted-foreground">kenji@genisys.io · Admin</p>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Status</p>
          <div className="flex gap-2">
            {(["Available", "Busy", "Away"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  toast.success(`Status set to ${s}`);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  status === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground/80 hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex flex-col">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.label}>
                <button
                  onClick={() => {
                    it.action();
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm hover:bg-muted",
                    it.danger && "text-rose-600 hover:bg-rose-50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const workspaces = [
    { id: "g", name: "Genisys Sales", desc: "12 members · Pro plan", current: true, color: "bg-primary" },
    { id: "p", name: "Pinnacle Outbound", desc: "5 members · Starter", current: false, color: "bg-rose-500" },
    { id: "n", name: "Northwind Internal", desc: "3 members · Free", current: false, color: "bg-emerald-500" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Switch workspace</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5">
          {workspaces.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => {
                  toast.success(w.current ? "Already on this workspace" : `Switched to ${w.name}`);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                  w.current
                    ? "border-primary/30 bg-primary-soft"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
              >
                <span className={cn("grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white", w.color)}>
                  {w.name[0]}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">{w.desc}</span>
                </span>
                {w.current && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    Current
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={() => toast.success("Create workspace flow")}>
          + Create workspace
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const SEARCH_INDEX = [
  { type: "Page", label: "Tasks", to: "/tasks" as const },
  { type: "Page", label: "Call Center", to: "/call-center" as const },
  { type: "Page", label: "Clients", to: "/clients" as const },
  { type: "Client", label: "Northwind Analytics", to: "/clients" as const },
  { type: "Client", label: "Halcyon Health", to: "/clients" as const },
  { type: "Client", label: "Ridgefield Capital", to: "/clients" as const },
  { type: "Client", label: "Lumen Logistics", to: "/clients" as const },
  { type: "Agent", label: "Sarah Lindqvist", to: "/call-center" as const },
  { type: "Agent", label: "Marcus Okonkwo", to: "/call-center" as const },
  { type: "Task", label: "Approve Halcyon Health script v3", to: "/tasks" as const },
  { type: "Task", label: "Review Aurora pod EOD reports", to: "/tasks" as const },
];

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const results = q
    ? SEARCH_INDEX.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : SEARCH_INDEX.slice(0, 6);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <div className="flex items-center gap-2 border-b border-border-soft px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients, agents, tasks…"
            className="h-8 w-full bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches for “{q}”.</li>
          ) : (
            results.map((r, i) => (
              <li key={i}>
                <Link
                  to={r.to}
                  onClick={() => {
                    onOpenChange(false);
                    toast.success(`Jumped to ${r.label}`);
                  }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted"
                >
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {r.type}
                  </span>
                  <span className="text-sm">{r.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
 * Sidebar
 * ========================================================================= */

function Sidebar({
  onOpenSearch,
  onOpenSettings,
  onOpenHelp,
  onOpenProfile,
  onOpenWorkspace,
}: {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  onOpenWorkspace: () => void;
}) {
  const { location } = useRouterState();
  const currentPath = location.pathname;

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col gap-2 border-r border-border-soft bg-sidebar px-4 py-5">
      {/* Brand */}
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">Genisys</span>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            onClick={() => toast.info("Sidebar collapse — coming soon")}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Workspace switcher */}
      <button
        onClick={onOpenWorkspace}
        className="mt-1 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium shadow-soft hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
            G
          </span>
          Genisys Sales
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Command pill */}
      <button
        onClick={onOpenSearch}
        className="relative mt-1 flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-left text-sm text-muted-foreground transition hover:bg-muted"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1">Search anything</span>
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Main menu
      </p>

      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const active = currentPath === "/" ? item.to === "/tasks" : currentPath.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-foreground/75 hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </span>
              {active && <ChevronRight className="h-4 w-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-muted"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-muted"
        >
          <HelpCircle className="h-4 w-4" /> Help & Support
        </button>
        <button
          onClick={onOpenProfile}
          className="mt-2 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-soft hover:bg-muted"
        >
          <PersonAvatar person={getPerson("kp")} size="sm" />
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-sm font-semibold">Kenji Park</p>
            <p className="truncate text-xs text-muted-foreground">Available</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
}

/* =========================================================================
 * TopBar — clean: title, breadcrumbs, search trigger, optional actions.
 * Notification, settings, and admin pill all removed per design.
 * ========================================================================= */

export function TopBar({
  title,
  breadcrumbs,
  actions,
}: {
  title: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {breadcrumbs && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={i === breadcrumbs.length - 1 ? "text-foreground/70" : ""}>{b}</span>
                {i < breadcrumbs.length - 1 && <span aria-hidden>→</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  // ⌘K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenWorkspace={() => setWorkspaceOpen(true)}
      />
      <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <WorkspaceDialog open={workspaceOpen} onOpenChange={setWorkspaceOpen} />
    </div>
  );
}

/* Placeholder dialog suppression — Label/Input/DialogDescription are imported
 * to keep the dialogs ready for richer forms later. */
const _u = { Label, Input, DialogFooter };
void _u;
