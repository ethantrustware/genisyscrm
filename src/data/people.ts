export type Person = {
  id: string;
  name: string;
  initials: string;
  color: string; // tailwind bg class
  role?: string;
};

export const people: Person[] = [
  { id: "kp", name: "Kenji Park", initials: "KP", color: "bg-[oklch(0.78_0.12_45)]", role: "Admin" },
  { id: "sl", name: "Sarah Lindqvist", initials: "SL", color: "bg-[oklch(0.78_0.1_25)]", role: "Senior SDR" },
  { id: "mo", name: "Marcus Okonkwo", initials: "MO", color: "bg-[oklch(0.7_0.13_295)]", role: "Senior SDR" },
  { id: "rc", name: "Rafael Castaño", initials: "RC", color: "bg-[oklch(0.78_0.1_220)]", role: "Senior SDR" },
  { id: "hr", name: "Hannah Reeves", initials: "HR", color: "bg-[oklch(0.8_0.13_140)]", role: "SDR" },
  { id: "ta", name: "Tomas Andersen", initials: "TA", color: "bg-[oklch(0.74_0.13_30)]", role: "Lead SDR" },
  { id: "ev", name: "Elise Vahlne", initials: "EV", color: "bg-[oklch(0.82_0.12_75)]", role: "Manager" },
  { id: "jw", name: "Jordan Wei", initials: "JW", color: "bg-[oklch(0.74_0.1_245)]", role: "SDR" },
  { id: "dh", name: "Dana Holt", initials: "DH", color: "bg-[oklch(0.78_0.11_160)]", role: "SDR" },
  { id: "nb", name: "Nadia Brooks", initials: "NB", color: "bg-[oklch(0.78_0.12_15)]", role: "SDR" },
  { id: "yt", name: "Yuki Tanaka", initials: "YT", color: "bg-[oklch(0.78_0.1_60)]", role: "SDR" },
  { id: "pr", name: "Priya Rao", initials: "PR", color: "bg-[oklch(0.74_0.13_330)]", role: "Manager" },
];

export const getPerson = (id: string) => people.find((p) => p.id === id)!;
