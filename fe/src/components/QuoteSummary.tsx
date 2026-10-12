import { formatUsd } from "@/festival";
import { formatDayList } from "@/festival";
import type { Quote } from "@/types";
import { canShowTotal } from "@/booking/steps";

export function QuoteSummary({ quote }: { quote: Quote }) {
  const showTotal = canShowTotal(quote);
  return (
    <div className="space-y-4">
      {quote.attendees.length > 0 ? (
        <div>
          <h3 className="font-serif text-xl text-heading">Door list</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {quote.attendees.map((person) => (
              <li key={person.id} className="rounded-xl bg-white/70 px-3 py-2">
                <span className="font-semibold text-heading">{person.fullName}</span>
                <span className="text-prose">
                  {" "}
                  · age {person.age} · {person.ticketLabel} · {formatDayList(person.days)}
                </span>
                {person.accompanyingAdultName ? (
                  <span className="block text-prose">With {person.accompanyingAdultName}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showTotal ? (
        <div className="rounded-2xl bg-white px-4 py-4">
          <ul className="space-y-2 text-sm">
            {quote.lines.map((line, index) => (
              <li key={`${line.label}:${index}`} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span className="shrink-0 font-semibold text-heading">{formatUsd(line.amountCents)}</span>
              </li>
            ))}
          </ul>
          {quote.discountCents > 0 ? (
            <div className="mt-3 flex justify-between gap-4 border-t border-gold/30 pt-3 text-sm">
              <span>Subtotal</span>
              <span>{formatUsd(quote.subtotalCents)}</span>
            </div>
          ) : null}
          {quote.discountCents > 0 ? (
            <div className="mt-2 flex justify-between gap-4 text-sm font-semibold text-heading">
              <span>{quote.promo.code}</span>
              <span>−{formatUsd(quote.discountCents)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex justify-between gap-4 border-t border-gold/30 pt-3 font-serif text-2xl text-heading">
            <span>Total</span>
            <span>{formatUsd(quote.totalCents)}</span>
          </div>
          {quote.promo.message ? <p className="mt-2 text-sm text-prose">{quote.promo.message}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-prose">The total appears here once the booking can be priced.</p>
      )}
    </div>
  );
}
