import type { FieldError, Quote } from "@/types";
import type { Step } from "./draft";

export function errorsForStep(errors: FieldError[], step: Step): FieldError[] {
  return errors.filter((error) => matchesStep(error.path, step));
}

function matchesStep(path: string, step: Step): boolean {
  if (step === "review" || step === "pay") return true;
  if (step === "party") return path.startsWith("contact") || path.startsWith("people") || path === "party";
  if (step === "tickets") {
    return (
      path.startsWith("contact") ||
      path.startsWith("people") ||
      path.startsWith("selections") ||
      path.startsWith("family") ||
      path === "party" ||
      path.startsWith("stock.day") ||
      path.startsWith("stock.allday") ||
      path.startsWith("stock.family")
    );
  }
  return (
    path.startsWith("extras") ||
    path.startsWith("stock") ||
    path.startsWith("selections") ||
    path.startsWith("family") ||
    path.startsWith("people") ||
    path.startsWith("contact") ||
    path === "party"
  );
}

export function canShowTotal(quote: Quote): boolean {
  return quote.lines.length > 0 && quote.errors.every((error) => error.path === "promoCode" || error.path.startsWith("stock."));
}

export function messageFor(errors: FieldError[], path: string): string | undefined {
  const messages = errors.filter((error) => error.path === path).map((error) => error.message);
  return messages.length > 0 ? messages.join(" ") : undefined;
}
