import { ChevronDown, Check, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DropdownPill<T extends string>({
  value,
  options,
  onChange,
  icon: Icon,
  align = "start",
  width = "w-48",
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  icon?: LucideIcon;
  align?: "start" | "end" | "center";
  width?: string;
}) {
  const current = options.find((o) => o.id === value)?.label ?? String(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium shadow-soft hover:bg-muted">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span>{current}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-1.5", width)} align={align}>
        <ul className="flex flex-col">
          {options.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => onChange(o.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted",
                  value === o.id && "bg-primary-soft text-primary font-medium",
                )}
              >
                {o.label}
                {value === o.id && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
