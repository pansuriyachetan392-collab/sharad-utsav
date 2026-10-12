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

export const STOCK_CODES = [
  "day_adult",
  "day_child",
  "allday_adult",
  "allday_child",
  "family",
  "dandiya",
  "dinner",
  "garba",
] as const;

export type StockCode = (typeof STOCK_CODES)[number];

export type Stock = Record<StockCode, number>;

export const PRICE = {
  day_adult: 1500,
  day_child: 800,
  allday_adult: 6000,
  allday_child: 3000,
  family: 4000,
  dandiya: 500,
  dinner: 1200,
  garba: 2000,
} as const;

export const INITIAL_STOCK: Stock = {
  day_adult: 380,
  day_child: 260,
  allday_adult: 0,
  allday_child: 140,
  family: 95,
  dandiya: 900,
  dinner: 1700,
  garba: 2,
};

export const EVENT = {
  name: "Sharad Utsav 2026",
  location: "Radha Krishna Temple, Allen, Texas",
  currency: "USD",
} as const;

export const BOOKER_ID = "booker";

export const PAID_TICKETS = ["day_adult", "day_child", "allday_adult", "allday_child"] as const;
export type PaidTicket = (typeof PAID_TICKETS)[number];
export type SelectionKind = PaidTicket | "none";

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

export function emptyUsage(): Stock {
  return {
    day_adult: 0,
    day_child: 0,
    allday_adult: 0,
    allday_child: 0,
    family: 0,
    dandiya: 0,
    dinner: 0,
    garba: 0,
  };
}

export function stockWith(overrides: Partial<Stock> = {}): Stock {
  return { ...INITIAL_STOCK, ...overrides };
}

export type TicketProduct = {
  code: PaidTicket | "family";
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
};

export const TICKET_PRODUCTS: TicketProduct[] = [
  {
    code: "day_adult",
    name: "Day Pass – Adult",
    blurb: "Ages 12 and above. Choose the days.",
    priceCents: PRICE.day_adult,
    priceLabel: "$15 per person, per day",
  },
  {
    code: "day_child",
    name: "Day Pass – Child",
    blurb: "Ages 5 to 11. Choose the days.",
    priceCents: PRICE.day_child,
    priceLabel: "$8 per person, per day",
  },
  {
    code: "allday_adult",
    name: "All-Day Pass – Adult",
    blurb: "Ages 12 and above. All five days.",
    priceCents: PRICE.allday_adult,
    priceLabel: "$60 flat",
  },
  {
    code: "allday_child",
    name: "All-Day Pass – Child",
    blurb: "Ages 5 to 11. All five days.",
    priceCents: PRICE.allday_child,
    priceLabel: "$30 flat",
  },
  {
    code: "family",
    name: "Family Pass",
    blurb: "2 adults and 2 children, one day.",
    priceCents: PRICE.family,
    priceLabel: "$40 flat",
  },
];

export type ExtraProduct = {
  code: "dandiya" | "dinner" | "garba";
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
};

export const EXTRA_PRODUCTS: ExtraProduct[] = [
  {
    code: "dandiya",
    name: "Dandiya sticks (pair)",
    blurb: "A souvenir. Up to 30 pairs on one booking.",
    priceCents: PRICE.dandiya,
    priceLabel: "$5 a pair",
  },
  {
    code: "dinner",
    name: "Dinner plate",
    blurb: "One person, one day they are attending.",
    priceCents: PRICE.dinner,
    priceLabel: "$12 per person, per day",
  },
  {
    code: "garba",
    name: "Garba workshop",
    blurb: "Wed 11 Nov and Fri 13 Nov only. Places are shared across both days.",
    priceCents: PRICE.garba,
    priceLabel: "$20 each",
  },
];

export type Catalog = {
  event: typeof EVENT;
  days: { date: FestivalDay; label: string; garba: boolean }[];
  tickets: TicketProduct[];
  extras: ExtraProduct[];
  stock: Stock;
};

export function catalogBody(stock: Stock): Catalog {
  return {
    event: EVENT,
    days: FESTIVAL_DAYS.map((date) => ({
      date,
      label: DAY_LABEL[date],
      garba: isGarbaDay(date),
    })),
    tickets: TICKET_PRODUCTS,
    extras: EXTRA_PRODUCTS,
    stock,
  };
}
