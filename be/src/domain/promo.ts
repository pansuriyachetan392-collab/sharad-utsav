import { formatUsd } from "./money";
import type { Line, PromoResult } from "./types";

const CHILD_TICKET = new Set<Line["code"]>(["day_child", "allday_child"]);

export function applyPromo(rawCode: string | undefined, lines: Line[], subtotalCents: number): PromoResult {
  const code = rawCode?.trim().toUpperCase() ?? "";
  if (!code) {
    return { code: null, state: "none", message: "", discountCents: 0 };
  }

  if (code === "SEVA10") {
    return {
      code,
      state: "applied",
      message: "SEVA10 takes 10% off the whole booking.",
      discountCents: Math.min(subtotalCents, Math.round((subtotalCents * 10) / 100)),
    };
  }

  if (code === "FLAT20") {
    const discountCents = Math.min(2000, subtotalCents);
    const message =
      discountCents === 2000
        ? "FLAT20 takes $20 off the whole booking."
        : `FLAT20 is $20 off. This booking is only ${formatUsd(subtotalCents)}, so the total is $0.00.`;
    return { code, state: "applied", message, discountCents };
  }

  if (code === "KIDSFREE") {
    const discountCents = Math.min(
      subtotalCents,
      lines.filter((line) => CHILD_TICKET.has(line.code)).reduce((sum, line) => sum + line.amountCents, 0),
    );
    const message =
      discountCents > 0
        ? "Child day passes and child all-day passes on this booking are free. Adult tickets are unchanged."
        : "KIDSFREE makes child day passes and child all-day passes free. This booking doesn't have those, so the total is unchanged. A family pass stays at its flat price.";
    return { code, state: "applied", message, discountCents };
  }

  if (code === "EXPIRED5") {
    return {
      code,
      state: "rejected",
      message: "EXPIRED5 was a real code, and it expired last month.",
      discountCents: 0,
    };
  }

  if (code === "MAXEDOUT") {
    return {
      code,
      state: "rejected",
      message: "MAXEDOUT was a real code, and it has already been used the maximum number of times.",
      discountCents: 0,
    };
  }

  return {
    code,
    state: "rejected",
    message: `"${code}" isn't a code we recognise. Check the spelling, or clear the box to pay the full price.`,
    discountCents: 0,
  };
}
