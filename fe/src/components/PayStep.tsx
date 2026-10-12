import { useState } from "react";
import { formatUsd } from "@/festival";
import type { FieldError, Quote } from "@/types";
import { Button, ErrorSummary, TextField, fieldError } from "./fields";
import { QuoteSummary } from "./QuoteSummary";

export function PayStep({
  quote,
  errors,
  busy,
  network,
  onBack,
  onPay,
}: {
  quote: Quote | null;
  errors: FieldError[];
  busy: boolean;
  network: boolean;
  onBack: () => void;
  onPay: (payment?: { cardName: string; cardNumber: string; expiry: string; cvc: string }) => void;
}) {
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const total = quote?.totalCents ?? null;
  const free = total === 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onPay(free ? undefined : { cardName, cardNumber, expiry, cvc });
      }}
    >
      <div>
        <h2 className="font-serif text-3xl text-heading">Pay</h2>
        <p className="mt-2 text-prose">The amount is the one our server just calculated. Clicking twice will not create two bookings.</p>
      </div>
      <ErrorSummary errors={errors} />
      {network ? (
        <p className="font-semibold text-danger">We couldn't tell if the booking went through. Try again — you won't be charged twice.</p>
      ) : null}
      {quote ? <QuoteSummary quote={quote} /> : null}
      {free ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm">Your total is $0.00, so there's nothing to charge. We'll still save the tickets.</p>
      ) : (
        <div className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-prose">Simulated payment. Use card 4242 4242 4242 4242, any future expiry, and any 3-digit code. No real charge is made.</p>
          <TextField label="Name on card" name="cc-name" autoComplete="cc-name" value={cardName} error={fieldError(errors, "payment.cardName")} onChange={(event) => setCardName(event.target.value)} />
          <TextField label="Card number" name="cc-number" autoComplete="cc-number" inputMode="numeric" value={cardNumber} error={fieldError(errors, "payment.cardNumber")} onChange={(event) => setCardNumber(event.target.value)} />
          <TextField label="Expiry" name="cc-exp" autoComplete="cc-exp" placeholder="MM/YY" value={expiry} error={fieldError(errors, "payment.expiry")} onChange={(event) => setExpiry(event.target.value)} />
          <TextField label="Security code" name="cc-csc" autoComplete="cc-csc" inputMode="numeric" value={cvc} error={fieldError(errors, "payment.cvc")} onChange={(event) => setCvc(event.target.value)} />
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>Back</Button>
        <Button type="submit" disabled={busy || !quote?.ok}>
          {busy ? "Booking…" : free ? "Confirm booking" : total !== null ? `Pay ${formatUsd(total)}` : "Pay"}
        </Button>
      </div>
    </form>
  );
}
