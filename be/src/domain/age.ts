export type AgeBand = "under5" | "child" | "adult";

export function ageBand(age: number): AgeBand {
  if (age < 5) return "under5";
  if (age <= 11) return "child";
  return "adult";
}

export function bandLabel(band: AgeBand): string {
  if (band === "under5") return "Under 5";
  if (band === "child") return "Child";
  return "Adult";
}
