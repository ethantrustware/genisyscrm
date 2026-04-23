import { cn } from "@/lib/utils";

type Tone = "pink" | "amber" | "mint" | "blue" | "violet" | "muted";

const toneMap: Record<Tone, string> = {
  pink: "chip-pink",
  amber: "chip-amber",
  mint: "chip-mint",
  blue: "chip-blue",
  violet: "chip-violet",
  muted: "bg-muted text-muted-foreground",
};

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
