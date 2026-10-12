import { createHash, randomBytes } from "crypto";
import { quoteBooking } from "@/domain/quote";
import { paymentLast4, validatePayment } from "@/domain/payment";
import type { BookingInput, BookingRecord, FieldError, PaymentInput, Quote } from "@/domain/types";
import type { Stock } from "@/domain/catalog";
import { STOCK_CODES } from "@/domain/catalog";

export type CheckoutRequest = {
  booking: BookingInput;
  idempotencyKey: string;
  payment?: PaymentInput;
};

export type CreateResult =
  | { ok: true; booking: BookingRecord }
  | { ok: false; errors: FieldError[]; quote: Quote };

export type IdempotencyHit = {
  inputHash: string;
  booking: BookingRecord;
};

export type Decision = {
  result: CreateResult;
  persist: { booking: BookingRecord; inputHash: string; stock: Stock } | null;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeBookingCode(): string {
  const bytes = randomBytes(8);
  let code = "SU-";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

export function hashBooking(booking: BookingInput): string {
  return createHash("sha256").update(stableStringify(booking)).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

function reduceStock(stock: Stock, usage: Stock): Stock {
  const next = { ...stock };
  for (const code of STOCK_CODES) next[code] -= usage[code];
  return next;
}

export function decideCheckout(args: {
  stock: Stock;
  existing: IdempotencyHit | null;
  request: CheckoutRequest;
  now: Date;
  newCode: string;
}): Decision {
  const inputHash = hashBooking(args.request.booking);
  if (args.existing) {
    if (args.existing.inputHash !== inputHash) {
      const quote = quoteBooking(args.request.booking, args.stock);
      return {
        persist: null,
        result: {
          ok: false,
          quote,
          errors: [
            {
              path: "idempotencyKey",
              message: "This payment attempt was already used for a different booking. Review the booking and pay again.",
            },
          ],
        },
      };
    }
    return { persist: null, result: { ok: true, booking: args.existing.booking } };
  }

  const quote = quoteBooking(args.request.booking, args.stock);
  if (!quote.ok) return { persist: null, result: { ok: false, errors: quote.errors, quote } };

  const paymentErrors = validatePayment(args.request.payment, quote.totalCents, args.now);
  if (paymentErrors.length > 0) {
    return { persist: null, result: { ok: false, errors: paymentErrors, quote } };
  }

  const booking: BookingRecord = {
    code: args.newCode,
    createdAt: args.now.toISOString(),
    contact: args.request.booking.contact,
    attendees: quote.attendees,
    lines: quote.lines,
    subtotalCents: quote.subtotalCents,
    discountCents: quote.discountCents,
    totalCents: quote.totalCents,
    promo: quote.promo,
    currency: "USD",
    payment:
      quote.totalCents <= 0 || !args.request.payment
        ? { status: "not_required" }
        : { status: "succeeded", last4: paymentLast4(args.request.payment) },
  };

  return {
    result: { ok: true, booking },
    persist: { booking, inputHash, stock: reduceStock(args.stock, quote.usage) },
  };
}
