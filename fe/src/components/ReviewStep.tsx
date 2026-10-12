import type { FieldError, Quote } from "@/types";
import type { Draft, DraftAction } from "@/booking/draft";
import { Button, ErrorSummary, TextField, fieldError } from "./fields";
import { QuoteSummary } from "./QuoteSummary";

export function ReviewStep({
  draft,
  quote,
  errors,
  busy,
  network,
  dispatch,
  onBack,
  onContinue,
}: {
  draft: Draft;
  quote: Quote | null;
  errors: FieldError[];
  busy: boolean;
  network: boolean;
  dispatch: (action: DraftAction) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div>
        <h2 className="font-serif text-3xl text-heading">Review</h2>
        <p className="mt-2 text-prose">This total comes from our server. Changing it in the browser will not change what you pay.</p>
      </div>
      <ErrorSummary errors={errors} />
      {network ? <p className="font-semibold text-danger">We couldn't reach the server. Check your connection and try again.</p> : null}
      <TextField
        label="Promo code"
        name="promo"
        value={draft.promoCode}
        autoCapitalize="characters"
        error={fieldError(errors, "promoCode")}
        hint="Optional. One code. Leave it blank to pay the full price."
        onChange={(event) => dispatch({ type: "set-promo", code: event.target.value })}
      />
      {quote ? <QuoteSummary quote={quote} /> : <p className="text-sm">Calculating the total…</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Continue to payment"}</Button>
      </div>
    </form>
  );
}
