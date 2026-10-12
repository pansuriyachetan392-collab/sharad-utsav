import { isGarbaDay, type Catalog } from "@/festival";
import type { FieldError } from "@/types";
import { partyMembers, type Draft, type DraftAction } from "@/booking/draft";
import { Button, ErrorSummary } from "./fields";

export function ExtrasStep({
  draft,
  catalog,
  errors,
  busy,
  dispatch,
  onBack,
  onContinue,
}: {
  draft: Draft;
  catalog: Catalog | null;
  errors: FieldError[];
  busy: boolean;
  dispatch: (action: DraftAction) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const members = partyMembers(draft).filter((member) => member.days.length > 0);
  const garbaLeft = catalog?.stock.garba;
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div>
        <h2 className="font-serif text-3xl text-heading">Extras</h2>
        <p className="mt-2 text-prose">Dinner and the workshop are only for days that person is already coming.</p>
      </div>
      <ErrorSummary errors={errors} />
      <section className="rounded-2xl bg-white/70 p-4">
        <h3 className="font-semibold text-heading">Dandiya sticks · $5 a pair</h3>
        <p className="text-sm text-prose">A souvenir, not tied to a day. Up to 30 pairs.</p>
        <div className="mt-3 flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => dispatch({ type: "set-dandiya", qty: draft.dandiyaQty - 1 })}>
            −
          </Button>
          <span className="min-w-8 text-center font-semibold text-heading">{draft.dandiyaQty}</span>
          <Button type="button" variant="ghost" onClick={() => dispatch({ type: "set-dandiya", qty: draft.dandiyaQty + 1 })}>
            +
          </Button>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold text-heading">Dinner · $12 a person, a day</h3>
        {members.length === 0 ? <p className="text-sm">Choose tickets first, then dinner can be added for those days.</p> : null}
        {members.map((member) => (
          <div key={member.id}>
            <p className="text-sm font-semibold text-heading">{member.name || "Guest"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {member.days.map((day) => {
                const on = draft.dinner.some((item) => item.personId === member.id && item.day === day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => dispatch({ type: "toggle-dinner", personId: member.id, day })}
                    className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${on ? "border-primary bg-primary text-heading" : "border-gold/50 bg-white text-heading"}`}
                  >
                    Dinner {day.slice(8)} Nov
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold text-heading">Garba workshop · $20</h3>
        <p className="text-sm text-prose">
          Wednesday 11 November and Friday 13 November only.
          {garbaLeft === undefined ? " Checking places…" : garbaLeft <= 0 ? " Sold out." : ` ${garbaLeft} left in total, shared by both days.`}
        </p>
        {members.map((member) => {
          const days = member.days.filter(isGarbaDay);
          if (days.length === 0) return null;
          return (
            <div key={member.id}>
              <p className="text-sm font-semibold text-heading">{member.name || "Guest"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map((day) => {
                  const on = draft.garba.some((item) => item.personId === member.id && item.day === day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={garbaLeft === 0 && !on}
                      aria-pressed={on}
                      onClick={() => dispatch({ type: "toggle-garba", personId: member.id, day })}
                      className={`min-h-11 rounded-full border px-3 text-sm font-semibold disabled:opacity-50 ${on ? "border-primary bg-primary text-heading" : "border-gold/50 bg-white text-heading"}`}
                    >
                      Workshop {day === "2026-11-11" ? "Wed 11 Nov" : "Fri 13 Nov"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={busy}>{busy ? "Checking the price…" : "Review booking"}</Button>
      </div>
    </form>
  );
}
