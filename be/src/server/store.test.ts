import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { INITIAL_STOCK } from "@/domain/catalog";
import type { BookingInput } from "@/domain/types";
import { createFileStore } from "./file-store";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories) fs.rmSync(directory, { recursive: true, force: true });
  directories.length = 0;
});

function store() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "utsav-"));
  directories.push(directory);
  return createFileStore(path.join(directory, "bookings.json"));
}

function party(suffix: string, seats: 1 | 2): BookingInput {
  const people = seats === 2 ? [{ id: "friend", firstName: "Friend", lastName: suffix, age: 33 }] : [];
  const selections: BookingInput["selections"] = [{ personId: "booker", kind: "day_adult", days: ["2026-11-11"] }];
  const garba: BookingInput["extras"]["garba"] = [{ personId: "booker", day: "2026-11-11" }];
  if (seats === 2) {
    selections.push({ personId: "friend", kind: "day_adult", days: ["2026-11-11"] });
    garba.push({ personId: "friend", day: "2026-11-11" });
  }
  return {
    contact: {
      firstName: "Adult",
      lastName: suffix,
      email: `${suffix}@example.com`,
      phone: "2145550199",
      age: 34,
      attending: true,
    },
    people,
    selections,
    familyPasses: [],
    extras: { dandiyaQty: 0, dinner: [], garba },
  };
}

describe("stock", () => {
  it("lets only one of two simultaneous bookings take the last workshop places", async () => {
    const bookings = store();
    const payment = { cardName: "Meera Shah", cardNumber: "4242424242424242", expiry: "12/32", cvc: "123" };
    const [first, second] = await Promise.all([
      bookings.createBooking({ booking: party("One", 2), idempotencyKey: crypto.randomUUID(), payment }),
      bookings.createBooking({ booking: party("Two", 2), idempotencyKey: crypto.randomUUID(), payment }),
    ]);
    const outcomes = [first.ok, second.ok].sort();
    expect(outcomes).toEqual([false, true]);
    expect((await bookings.getStock()).garba).toBe(0);
  });

  it("does not create a second booking when the same payment is sent twice", async () => {
    const bookings = store();
    const request = {
      booking: party("Once", 1),
      idempotencyKey: crypto.randomUUID(),
      payment: { cardName: "Meera Shah", cardNumber: "4242424242424242", expiry: "12/32", cvc: "123" },
    };
    const first = await bookings.createBooking(request);
    const second = await bookings.createBooking(request);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.booking.code).toBe(second.booking.code);
    expect((await bookings.getStock()).garba).toBe(INITIAL_STOCK.garba - 1);
  });

  it("leaves stock alone when the card is declined", async () => {
    const bookings = store();
    const result = await bookings.createBooking({
      booking: party("Card", 1),
      idempotencyKey: crypto.randomUUID(),
      payment: { cardName: "Meera Shah", cardNumber: "4000000000000002", expiry: "12/32", cvc: "123" },
    });
    expect(result.ok).toBe(false);
    expect((await bookings.getStock()).garba).toBe(INITIAL_STOCK.garba);
  });
});
