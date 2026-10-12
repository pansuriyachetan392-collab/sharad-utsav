import { z } from "zod";
import { FESTIVAL_DAYS } from "./catalog";
import type { BookingInput, FieldError, PaymentInput } from "./types";

const daySchema = z.enum(FESTIVAL_DAYS);
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "That person id isn't valid.");

const ageSchema = z
  .number({ invalid_type_error: "Enter an age as a whole number from 0 to 120." })
  .int("Enter an age as a whole number from 0 to 120.")
  .min(0, "Enter an age as a whole number from 0 to 120.")
  .max(120, "Enter an age as a whole number from 0 to 120.");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dropClientPrices(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const rest: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "totalCents" || key === "total" || key === "amountCents" || key === "price") continue;
    rest[key] = entry;
  }
  return rest;
}

export const bookingSchema = z.preprocess(
  dropClientPrices,
  z.object({
    contact: z.object({
      firstName: z.string().trim().max(60),
      lastName: z.string().trim().max(60),
      email: z
        .string()
        .trim()
        .max(120)
        .email("Enter an email address so we can reach you about this booking."),
      phone: z.string().trim().max(30),
      age: ageSchema,
      attending: z.boolean(),
    }),
    people: z
      .array(
        z.object({
          id: idSchema,
          firstName: z.string().trim().max(60),
          lastName: z.string().trim().max(60),
          age: ageSchema,
          accompanyingAdultId: idSchema.optional(),
        }),
      )
      .max(16),
    selections: z
      .array(
        z.object({
          personId: idSchema,
          kind: z.enum(["day_adult", "day_child", "allday_adult", "allday_child", "none"]),
          days: z.array(daySchema).max(5),
        }),
      )
      .max(20),
    familyPasses: z
      .array(
        z.object({
          day: daySchema,
          personIds: z.array(idSchema).length(4, "A family pass needs exactly four people."),
        }),
      )
      .max(4),
    extras: z.object({
      dandiyaQty: z.number().int().min(0).max(30, "Choose up to 30 pairs on one booking."),
      dinner: z.array(z.object({ personId: idSchema, day: daySchema })).max(80),
      garba: z.array(z.object({ personId: idSchema, day: daySchema })).max(40),
    }),
    promoCode: z.string().trim().max(40).optional(),
  }),
);

export const checkoutSchema = z.object({
  booking: bookingSchema,
  idempotencyKey: z.string().uuid("Start the payment again from the review step."),
  payment: z
    .object({
      cardName: z.string().max(80),
      cardNumber: z.string().max(30),
      expiry: z.string().max(10),
      cvc: z.string().max(8),
    })
    .optional(),
});

function fromZod(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseBooking(body: unknown): { ok: true; data: BookingInput } | { ok: false; errors: FieldError[] } {
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return { ok: false, errors: fromZod(parsed.error) };
  return { ok: true, data: parsed.data };
}

export type CheckoutBody = {
  booking: BookingInput;
  idempotencyKey: string;
  payment?: PaymentInput;
};

export function parseCheckout(body: unknown): { ok: true; data: CheckoutBody } | { ok: false; errors: FieldError[] } {
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return { ok: false, errors: fromZod(parsed.error) };
  return { ok: true, data: parsed.data };
}
