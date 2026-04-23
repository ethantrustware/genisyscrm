import { cn } from "@/lib/utils";
import { getPerson, type Person } from "@/data/people";

type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function PersonAvatar({
  person,
  size = "sm",
  className,
}: {
  person: Person;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface",
        person.color,
        sizeMap[size],
        className,
      )}
      title={person.name}
    >
      {person.initials}
    </div>
  );
}

export function AvatarStack({
  ids,
  size = "sm",
  max = 3,
  extra,
}: {
  ids: string[];
  size?: Size;
  max?: number;
  extra?: number;
}) {
  const visible = ids.slice(0, max);
  const overflow = extra ?? Math.max(ids.length - max, 0);
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((id) => (
        <PersonAvatar key={id} person={getPerson(id)} size={size} />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-surface",
            sizeMap[size],
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
