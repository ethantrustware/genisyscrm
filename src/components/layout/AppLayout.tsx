import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Bell,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/people/Avatar";
import { getPerson } from "@/data/people";
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

function Sidebar() {
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
        onClick={() => toast.info("Workspace switcher — coming soon")}
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
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search anything"
          className="h-9 w-full rounded-xl border border-border bg-surface-muted pl-8 pr-12 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

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

      {/* Workspace totals */}
      <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </p>
      <div className="mt-1 grid grid-cols-3 gap-2 px-1">
        {[
          { label: "Pods", value: "3" },
          { label: "Agents", value: "12" },
          { label: "Appts", value: "318" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border-soft bg-surface px-2 py-2 text-center shadow-soft"
          >
            <p className="text-[15px] font-semibold tabular-nums leading-none text-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={() => toast.info("Settings — coming soon")}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-muted"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          onClick={() => toast.info("Help & Support — coming soon")}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-muted"
        >
          <HelpCircle className="h-4 w-4" /> Help & Support
        </button>
        <button
          onClick={() => toast.info("Profile menu — coming soon")}
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
                <span className={i === breadcrumbs.length - 1 ? "text-foreground/70" : ""}>
                  {b}
                </span>
                {i < breadcrumbs.length - 1 && <span aria-hidden>→</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search..."
            className="h-10 w-[260px] rounded-full border border-border bg-surface pl-9 pr-4 text-sm shadow-soft outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <button
          onClick={() => toast.info("Profile menu — coming soon")}
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-soft hover:bg-muted"
        >
          <PersonAvatar person={getPerson("kp")} size="sm" />
          <div className="leading-tight text-left">
            <p className="text-sm font-semibold">Kenji Park</p>
            <p className="text-[11px] text-muted-foreground">Admin</p>
          </div>
        </button>
        <button
          onClick={() => toast.info("No new notifications")}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-soft hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => toast.info("Settings — coming soon")}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-soft hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
        {actions}
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
