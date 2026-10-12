import type { FieldError, PaymentInput } from "./types";

const TEST_CARD = "4242424242424242";

export function cardDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function validatePayment(payment: PaymentInput | undefined, totalCents: number, now: Date): FieldError[] {
  if (totalCents <= 0) return [];
  if (!payment) {
    return [{ path: "payment.cardNumber", message: "Enter the test card to pay this booking." }];
  }

  const errors: FieldError[] = [];
  const name = payment.cardName.trim();
  if (name.length < 2) {
    errors.push({ path: "payment.cardName", message: "Enter the name on the card." });
  }

  const digits = cardDigits(payment.cardNumber);
  if (digits !== TEST_CARD) {
    errors.push({
      path: "payment.cardNumber",
      message: "Use the test card 4242 4242 4242 4242. This page never makes a real charge.",
    });
  }

  const expiry = /^(\d{2})\/(\d{2})$/.exec(payment.expiry.trim());
  const month = expiry ? Number(expiry[1]) : 0;
  const year = expiry ? 2000 + Number(expiry[2]) : 0;
  const current = now.getFullYear() * 12 + now.getMonth();
  const expires = year * 12 + (month - 1);
  if (!expiry || month < 1 || month > 12 || expires < current) {
    errors.push({ path: "payment.expiry", message: "Enter an expiry in the future, like 12/28." });
  }

  if (!/^\d{3,4}$/.test(payment.cvc.trim())) {
    errors.push({ path: "payment.cvc", message: "Enter the 3-digit security code." });
  }

  return errors;
}

export function paymentLast4(payment: PaymentInput): string {
  return cardDigits(payment.cardNumber).slice(-4);
}
