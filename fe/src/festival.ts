export const FESTIVAL_DAYS = [
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
] as const;

export type FestivalDay = (typeof FESTIVAL_DAYS)[number];

export const DAY_LABEL: Record<FestivalDay, string> = {
  "2026-11-10": "Tue 10 Nov",
  "2026-11-11": "Wed 11 Nov",
  "2026-11-12": "Thu 12 Nov",
  "2026-11-13": "Fri 13 Nov",
  "2026-11-14": "Sat 14 Nov",
};

export const BOOKER_ID = "booker";

export type SelectionKind = "day_adult" | "day_child" | "allday_adult" | "allday_child" | "none";

export type Stock = {
  day_adult: number;
  day_child: number;
  allday_adult: number;
  allday_child: number;
  family: number;
  dandiya: number;
  dinner: number;
  garba: number;
};

export type Catalog = {
  days: { date: FestivalDay; label: string; garba: boolean }[];
  stock: Stock;
};

export type AgeBand = "under5" | "child" | "adult";

export function ageBand(age: number): AgeBand {
  if (age < 5) return "under5";
  if (age <= 11) return "child";
  return "adult";
}

export function isFestivalDay(value: string): value is FestivalDay {
  return (FESTIVAL_DAYS as readonly string[]).includes(value);
}

export function isGarbaDay(day: FestivalDay): boolean {
  return day === "2026-11-11" || day === "2026-11-13";
}

export function sortDays(days: readonly FestivalDay[]): FestivalDay[] {
  const selected = new Set(days);
  return FESTIVAL_DAYS.filter((day) => selected.has(day));
}

export function formatDayList(days: readonly FestivalDay[]): string {
  return sortDays(days).map((day) => DAY_LABEL[day]).join(", ");
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${sign}$${dollars}.${remainder.toString().padStart(2, "0")}`;
}
