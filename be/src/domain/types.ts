import type { AgeBand } from "./age";
import type { FestivalDay, SelectionKind, Stock, StockCode } from "./catalog";

export type FieldError = {
  path: string;
  message: string;
};

export type Line = {
  code: StockCode;
  label: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export type PromoState = "none" | "applied" | "rejected";

export type PromoResult = {
  code: string | null;
  state: PromoState;
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

export type PersonInput = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  accompanyingAdultId?: string;
};

export type SelectionInput = {
  personId: string;
  kind: SelectionKind;
  days: FestivalDay[];
};

export type FamilyPassInput = {
  day: FestivalDay;
  personIds: string[];
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
  people: PersonInput[];
  selections: SelectionInput[];
  familyPasses: FamilyPassInput[];
  extras: {
    dandiyaQty: number;
    dinner: { personId: string; day: FestivalDay }[];
    garba: { personId: string; day: FestivalDay }[];
  };
  promoCode?: string;
};

export type PaymentInput = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export type PaymentRecord =
  | { status: "succeeded"; last4: string }
  | { status: "not_required" };

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
  payment: PaymentRecord;
  currency: "USD";
};
