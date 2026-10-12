import { BOOKER_ID, DAY_LABEL, FESTIVAL_DAYS, isFestivalDay, type Catalog, type FestivalDay } from "@/festival";
import type { FieldError } from "@/types";
import { partyMembers, type Draft, type DraftAction, type PartyMember, type TicketChoice } from "@/booking/draft";
import { Button, DayToggles, ErrorSummary, fieldError } from "./fields";

export function TicketsStep({
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
  const members = partyMembers(draft);
  const taken = new Set(draft.passes.flatMap((pass) => pass.personIds));
  const adults = members.filter((member) => member.age !== null && member.age >= 12 && !taken.has(member.id));
  const children = members.filter((member) => member.age !== null && member.age >= 5 && member.age <= 11 && !taken.has(member.id));
  const adultAllDayLeft = catalog?.stock.allday_adult ?? null;
  const childAllDayLeft = catalog?.stock.allday_child ?? null;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div>
        <h2 className="font-serif text-3xl text-heading">Tickets</h2>
        <p className="mt-2 text-prose">Each person gets one kind of entry. The price is worked out on our server when you continue.</p>
      </div>
      <ErrorSummary errors={errors} />
      {adults.length >= 2 && children.length >= 2 ? (
        <fieldset className="rounded-2xl border border-gold/40 bg-white/70 p-4">
          <legend className="px-1 font-serif text-xl text-heading">Family pass · $40</legend>
          <p className="mt-2 text-sm text-prose">Exactly 2 adults and 2 children for one day. Under 5s don't use a place. Those four can't add other days on this booking.</p>
          <label className="mt-3 block text-sm font-semibold text-heading">
            Day
            <select
              className="mt-1 w-full rounded-xl border border-gold/50 bg-white px-3 py-3 font-normal"
              value={draft.familyDay}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "" || isFestivalDay(value)) dispatch({ type: "set-family-day", day: value });
              }}
            >
              <option value="">Choose a day</option>
              {(catalog?.days ?? FESTIVAL_DAYS.map((date) => ({ date, label: DAY_LABEL[date] }))).map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CheckList title="Adults" people={adults} selected={draft.familyAdultIds} onToggle={(id) => dispatch({ type: "toggle-family-adult", id })} />
            <CheckList title="Children" people={children} selected={draft.familyChildIds} onToggle={(id) => dispatch({ type: "toggle-family-child", id })} />
          </div>
          <Button type="button" className="mt-4" variant="ghost" onClick={() => dispatch({ type: "add-family-pass", id: crypto.randomUUID() })}>
            Add family pass
          </Button>
        </fieldset>
      ) : null}
      {draft.passes.map((pass) => (
        <div key={pass.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
          <span>
            Family pass · {DAY_LABEL[pass.day]} · {pass.personIds.map((id) => members.find((member) => member.id === id)?.name || "Guest").join(", ")}
          </span>
          <Button type="button" variant="danger" onClick={() => dispatch({ type: "remove-family-pass", id: pass.id })}>
            Remove
          </Button>
        </div>
      ))}
      {errors.filter((error) => error.path.startsWith("family")).map((error) => (
        <p key={error.message} className="text-sm font-semibold text-danger">{error.message}</p>
      ))}
      <div className="space-y-4">
        {members.map((member) => (
          <article key={member.id} className="rounded-2xl border border-gold/30 p-4">
            <h3 className="font-semibold text-heading">{member.name || "Unnamed guest"}{member.id === BOOKER_ID ? " · paying" : ""}</h3>
            <p className="text-sm text-prose">{member.age === null ? "Add an age first." : `Age ${member.age}`}</p>
            {member.onFamilyPass ? (
              <p className="mt-2 text-sm">On the family pass for {member.familyDay ? DAY_LABEL[member.familyDay] : "one day"}.</p>
            ) : member.age !== null && member.age < 5 ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm">No ticket. Under 5s come in free. Which days are they with you?</p>
                <DayToggles selected={member.days} onToggle={(day) => dispatch({ type: "toggle-day", personId: member.id, day })} />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <TicketChoice
                  name={member.id}
                  kind={member.age !== null && member.age <= 11 ? "day_child" : "day_adult"}
                  allDayKind={member.age !== null && member.age <= 11 ? "allday_child" : "allday_adult"}
                  selected={member.ticketKind}
                  allDayLeft={member.age !== null && member.age <= 11 ? childAllDayLeft : adultAllDayLeft}
                  onChange={(kind) => dispatch({ type: "set-ticket-kind", personId: member.id, kind })}
                />
                {member.ticketKind === "allday_adult" || member.ticketKind === "allday_child" ? (
                  <p className="text-sm text-prose">Covers Tue 10 Nov through Sat 14 Nov. It can't be split into fewer days.</p>
                ) : (
                  <DayToggles selected={member.days} onToggle={(day) => dispatch({ type: "toggle-day", personId: member.id, day })} />
                )}
              </div>
            )}
            {fieldError(errors, `selections.${member.id}`) ? (
              <p className="mt-2 text-sm font-semibold text-danger">{fieldError(errors, `selections.${member.id}`)}</p>
            ) : null}
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={busy}>{busy ? "Checking the price…" : "Continue to extras"}</Button>
      </div>
    </form>
  );
}

function CheckList({ title, people, selected, onToggle }: { title: string; people: PartyMember[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-heading">{title}</p>
      <ul className="mt-2 space-y-1">
        {people.map((person) => (
          <li key={person.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={selected.includes(person.id)} onChange={() => onToggle(person.id)} />
              {person.name || "Unnamed"}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TicketChoice({
  name,
  kind,
  allDayKind,
  selected,
  allDayLeft,
  onChange,
}: {
  name: string;
  kind: "day_adult" | "day_child";
  allDayKind: "allday_adult" | "allday_child";
  selected: TicketChoice | "day_adult" | "allday_adult";
  allDayLeft: number | null;
  onChange: (kind: Exclude<TicketChoice, "">) => void;
}) {
  const soldOut = allDayLeft !== null && allDayLeft <= 0;
  const dayPrice = kind === "day_adult" ? "$15 a day" : "$8 a day";
  const allPrice = allDayKind === "allday_adult" ? "$60" : "$30";
  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="radio" name={name} checked={selected === kind} onChange={() => onChange(kind)} />
        Day pass · {dayPrice}
      </label>
      <label className={`flex items-center gap-2 ${soldOut ? "text-prose" : ""}`}>
        <input type="radio" name={name} disabled={soldOut} checked={selected === allDayKind} onChange={() => onChange(allDayKind)} />
        All-day pass · {allPrice}
        {allDayLeft === null ? " · checking availability" : soldOut ? " · sold out" : allDayLeft <= 20 ? ` · ${allDayLeft} left` : ""}
      </label>
    </div>
  );
}
