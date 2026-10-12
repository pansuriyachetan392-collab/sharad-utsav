import type { AgeBand, FestivalDay, SelectionKind, Stock } from "./festival";

export type FieldError = {
  path: string;
  message: string;
};

export type Line = {
  code: string;
  label: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export type PromoResult = {
  code: string | null;
  state: "none" | "applied" | "rejected";
  message: string;
  discountCents: number;
};

export type AttendeePreview = {
  id: string;
  fullName: string;
  age: number;
  band: AgeBand;
  ticketLabel: string;
  days: FestivalDay[];
  accompanyingAdultName?: string;
  dinnerDays: FestivalDay[];
  garbaDays: FestivalDay[];
};

export type Quote = {
  ok: boolean;
  currency: "USD";
  errors: FieldError[];
  lines: Line[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promo: PromoResult;
  usage: Stock;
  attendees: AttendeePreview[];
};

export type BookingInput = {
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: number;
    attending: boolean;
  };
  people: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    accompanyingAdultId?: string;
  }[];
  selections: { personId: string; kind: SelectionKind; days: FestivalDay[] }[];
  familyPasses: { day: FestivalDay; personIds: string[] }[];
  extras: {
    dandiyaQty: number;
    dinner: { personId: string; day: FestivalDay }[];
    garba: { personId: string; day: FestivalDay }[];
  };
  promoCode?: string;
};

export type BookingRecord = {
  code: string;
  createdAt: string;
  contact: BookingInput["contact"];
  attendees: AttendeePreview[];
  lines: Line[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promo: PromoResult;
  payment: { status: "succeeded"; last4: string } | { status: "not_required" };
  currency: "USD";
};
