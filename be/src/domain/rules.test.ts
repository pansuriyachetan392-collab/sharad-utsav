import { describe, expect, it } from "vitest";
import { ageBand } from "./age";
import { INITIAL_STOCK, stockWith } from "./catalog";
import { formatUsd } from "./money";
import { applyPromo } from "./promo";
import { quoteBooking } from "./quote";
import { parseBooking } from "./schema";
import type { BookingInput } from "./types";

function booking(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    contact: {
      firstName: "Meera",
      lastName: "Shah",
      email: "meera@example.com",
      phone: "2145550100",
      age: 36,
      attending: true,
    },
    people: [],
    selections: [{ personId: "booker", kind: "day_adult", days: ["2026-11-10"] }],
    familyPasses: [],
    extras: { dandiyaQty: 0, dinner: [], garba: [] },
    ...overrides,
  };
}

describe("age bands", () => {
  it("puts 4, 5, 11 and 12 on the right band", () => {
    expect(ageBand(4)).toBe("under5");
    expect(ageBand(5)).toBe("child");
    expect(ageBand(11)).toBe("child");
    expect(ageBand(12)).toBe("adult");
  });
});

describe("money", () => {
  it("formats cents without floating dust", () => {
    expect(formatUsd(14670)).toBe("$146.70");
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(2000)).toBe("$20.00");
    expect(Number.isInteger(14670)).toBe(true);
  });
});

describe("quote", () => {
  it("prices an adult day and counts a person-day of stock", () => {
    const quote = quoteBooking(
      booking({ selections: [{ personId: "booker", kind: "day_adult", days: ["2026-11-10", "2026-11-12"] }] }),
      INITIAL_STOCK,
    );
    expect(quote.ok).toBe(true);
    expect(quote.totalCents).toBe(3000);
    expect(quote.usage.day_adult).toBe(2);
    expect(Number.isInteger(quote.totalCents)).toBe(true);
  });

  it("prices a child at $8 and an all-day child at $30", () => {
    const child = quoteBooking(
      booking({
        people: [{ id: "c1", firstName: "Aarav", lastName: "", age: 5, accompanyingAdultId: "booker" }],
        selections: [
          { personId: "booker", kind: "day_adult", days: ["2026-11-10"] },
          { personId: "c1", kind: "day_child", days: ["2026-11-10"] },
        ],
      }),
      INITIAL_STOCK,
    );
    expect(child.ok).toBe(true);
    expect(child.totalCents).toBe(2300);

    const allDay = quoteBooking(
      booking({
        people: [{ id: "c1", firstName: "Aarav", lastName: "", age: 11, accompanyingAdultId: "booker" }],
        selections: [
          { personId: "booker", kind: "allday_adult", days: [] },
          { personId: "c1", kind: "allday_child", days: [] },
        ],
      }),
      stockWith({ allday_adult: 5 }),
    );
    expect(allDay.ok).toBe(true);
    expect(allDay.totalCents).toBe(9000);
    expect(allDay.usage.allday_child).toBe(1);
  });

  it("rejects a booker under 18 and nonsense that never becomes a number", () => {
    const young = quoteBooking(booking({ contact: { ...booking().contact, age: 17 } }), INITIAL_STOCK);
    expect(young.ok).toBe(false);
    expect(young.errors.some((error) => error.message.includes("18 or older"))).toBe(true);

    const parsed = parseBooking({ ...booking(), contact: { ...booking().contact, age: "seven" } });
    expect(parsed.ok).toBe(false);
  });

  it("refuses to put a child on an adult ticket or an adult on a child ticket", () => {
    const child = quoteBooking(
      booking({
        people: [{ id: "c1", firstName: "Aarav", lastName: "", age: 7, accompanyingAdultId: "booker" }],
        selections: [
          { personId: "booker", kind: "day_adult", days: ["2026-11-10"] },
          { personId: "c1", kind: "day_adult", days: ["2026-11-10"] },
        ],
      }),
      INITIAL_STOCK,
    );
    expect(child.ok).toBe(false);
    expect(child.totalCents).toBe(0);

    const adult = quoteBooking(
      booking({ selections: [{ personId: "booker", kind: "day_child", days: ["2026-11-10"] }] }),
      INITIAL_STOCK,
    );
    expect(adult.ok).toBe(false);
  });

  it("lets an under-5 in free and still charges their dinner", () => {
    const quote = quoteBooking(
      booking({
        people: [{ id: "t1", firstName: "Anika", lastName: "", age: 3, accompanyingAdultId: "booker" }],
        selections: [
          { personId: "booker", kind: "day_adult", days: ["2026-11-10"] },
          { personId: "t1", kind: "none", days: ["2026-11-10"] },
        ],
        extras: { dandiyaQty: 0, dinner: [{ personId: "t1", day: "2026-11-10" }], garba: [] },
      }),
      INITIAL_STOCK,
    );
    expect(quote.ok).toBe(true);
    expect(quote.totalCents).toBe(2700);
    expect(quote.usage.day_child).toBe(0);
    expect(quote.usage.dinner).toBe(1);
  });

  it("prices one family pass and rejects an under-5 in a child seat", () => {
    const quote = quoteBooking(
      booking({
        people: [
          { id: "a2", firstName: "Raj", lastName: "Shah", age: 40 },
          { id: "c1", firstName: "Aarav", lastName: "", age: 8, accompanyingAdultId: "booker" },
          { id: "c2", firstName: "Diya", lastName: "", age: 6, accompanyingAdultId: "booker" },
        ],
        selections: [],
        familyPasses: [{ day: "2026-11-12", personIds: ["booker", "a2", "c1", "c2"] }],
      }),
      INITIAL_STOCK,
    );
    expect(quote.ok).toBe(true);
    expect(quote.totalCents).toBe(4000);
    expect(quote.usage.family).toBe(1);
    expect(quote.usage.day_adult).toBe(0);

    const toddler = quoteBooking(
      booking({
        people: [
          { id: "a2", firstName: "Raj", lastName: "Shah", age: 40 },
          { id: "c1", firstName: "Aarav", lastName: "", age: 8, accompanyingAdultId: "booker" },
          { id: "t1", firstName: "Anika", lastName: "", age: 3, accompanyingAdultId: "booker" },
        ],
        selections: [],
        familyPasses: [{ day: "2026-11-12", personIds: ["booker", "a2", "c1", "t1"] }],
      }),
      INITIAL_STOCK,
    );
    expect(toddler.ok).toBe(false);
  });

  it("sells the all-day adult pass only when stock exists", () => {
    const soldOut = quoteBooking(
      booking({ selections: [{ personId: "booker", kind: "allday_adult", days: [] }] }),
      INITIAL_STOCK,
    );
    expect(soldOut.ok).toBe(false);
    expect(soldOut.errors.some((error) => error.message.includes("sold out"))).toBe(true);

    const available = quoteBooking(
      booking({ selections: [{ personId: "booker", kind: "allday_adult", days: [] }] }),
      stockWith({ allday_adult: 1 }),
    );
    expect(available.ok).toBe(true);
    expect(available.totalCents).toBe(6000);
  });

  it("refuses dinner and Garba off the days someone is attending", () => {
    const dinner = quoteBooking(
      booking({
        extras: { dandiyaQty: 0, dinner: [{ personId: "booker", day: "2026-11-14" }], garba: [] },
      }),
      INITIAL_STOCK,
    );
    expect(dinner.ok).toBe(false);

    const workshop = quoteBooking(
      booking({
        extras: { dandiyaQty: 0, dinner: [], garba: [{ personId: "booker", day: "2026-11-12" }] },
      }),
      INITIAL_STOCK,
    );
    expect(workshop.ok).toBe(false);
    expect(workshop.errors.some((error) => error.message.includes("Wed 11 Nov"))).toBe(true);
  });

  it("ignores a total sent by the client", () => {
    const parsed = parseBooking({ ...booking(), totalCents: 1 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const quote = quoteBooking(parsed.data, INITIAL_STOCK);
    expect(quote.totalCents).toBe(1500);
  });
});

describe("promo codes", () => {
  it("takes 10% with integer rounding", () => {
    expect(applyPromo("SEVA10", [], 1005).discountCents).toBe(101);
    const quote = quoteBooking(booking({ promoCode: "seva10" }), INITIAL_STOCK);
    expect(quote.ok).toBe(true);
    expect(quote.totalCents).toBe(1350);
  });

  it("stops FLAT20 at zero", () => {
    const quote = quoteBooking(booking({ promoCode: "FLAT20" }), INITIAL_STOCK);
    expect(quote.ok).toBe(true);
    expect(quote.discountCents).toBe(1500);
    expect(quote.totalCents).toBe(0);
  });

  it("makes child tickets free and leaves a family pass alone", () => {
    const kids = quoteBooking(
      booking({
        people: [{ id: "c1", firstName: "Aarav", lastName: "", age: 7, accompanyingAdultId: "booker" }],
        selections: [
          { personId: "booker", kind: "day_adult", days: ["2026-11-10"] },
          { personId: "c1", kind: "day_child", days: ["2026-11-10"] },
        ],
        extras: { dandiyaQty: 0, dinner: [{ personId: "booker", day: "2026-11-10" }], garba: [] },
        promoCode: "KIDSFREE",
      }),
      INITIAL_STOCK,
    );
    expect(kids.ok).toBe(true);
    expect(kids.discountCents).toBe(800);
    expect(kids.totalCents).toBe(2700);

    const family = quoteBooking(
      booking({
        people: [
          { id: "a2", firstName: "Raj", lastName: "Shah", age: 40 },
          { id: "c1", firstName: "Aarav", lastName: "", age: 8, accompanyingAdultId: "booker" },
          { id: "c2", firstName: "Diya", lastName: "", age: 6, accompanyingAdultId: "booker" },
        ],
        selections: [],
        familyPasses: [{ day: "2026-11-10", personIds: ["booker", "a2", "c1", "c2"] }],
        promoCode: "KIDSFREE",
      }),
      INITIAL_STOCK,
    );
    expect(family.ok).toBe(true);
    expect(family.discountCents).toBe(0);
    expect(family.totalCents).toBe(4000);
  });

  it("rejects expired, exhausted, and unknown codes", () => {
    for (const code of ["EXPIRED5", "MAXEDOUT", "NOTACODE"]) {
      const quote = quoteBooking(booking({ promoCode: code }), INITIAL_STOCK);
      expect(quote.ok).toBe(false);
      expect(quote.totalCents).toBe(1500);
    }
  });
});
