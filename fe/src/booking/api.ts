import type { BookingInput, FieldError, Quote } from "@/types";

export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${base}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuote(value: unknown): value is Quote {
  return isRecord(value) && Array.isArray(value.errors) && Array.isArray(value.lines) && typeof value.totalCents === "number";
}

export async function requestQuote(input: BookingInput): Promise<Quote> {
  const response = await fetch(apiUrl("/api/quote"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json();
  if (!isQuote(body)) throw new Error("The price check came back in a shape we didn't expect.");
  return body;
}

export async function requestBooking(payload: {
  booking: BookingInput;
  idempotencyKey: string;
  payment?: { cardName: string; cardNumber: string; expiry: string; cvc: string };
}): Promise<{ ok: true; code: string } | { ok: false; errors: FieldError[] }> {
  const response = await fetch(apiUrl("/api/bookings"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.ok !== "boolean") {
    throw new Error("The booking came back in a shape we didn't expect.");
  }
  if (body.ok === true && isRecord(body.booking) && typeof body.booking.code === "string") {
    return { ok: true, code: body.booking.code };
  }
  const errors = Array.isArray(body.errors)
    ? body.errors.filter(isFieldError)
    : [{ path: "server", message: "The booking didn't go through. Nothing was charged." }];
  return { ok: false, errors };
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.path === "string" && typeof value.message === "string";
}
