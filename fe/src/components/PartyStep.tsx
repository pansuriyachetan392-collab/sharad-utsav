import type { FieldError } from "@/types";
import { responsibleAdults, type Draft, type DraftAction } from "@/booking/draft";
import { Button, ErrorSummary, TextField, fieldError } from "./fields";

export function PartyStep({
  draft,
  errors,
  busy,
  dispatch,
  onContinue,
}: {
  draft: Draft;
  errors: FieldError[];
  busy: boolean;
  dispatch: (action: DraftAction) => void;
  onContinue: () => void;
}) {
  const adults = responsibleAdults(draft);
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div>
        <h2 className="font-serif text-3xl text-heading">Who's coming</h2>
        <p className="mt-2 text-prose">
          One adult pays for the whole group. Age means age on 10 November 2026. Under 5s are free and still go on the door list.
        </p>
      </div>
      <ErrorSummary errors={errors} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" name="contact-first" autoComplete="given-name" value={draft.contact.firstName} error={fieldError(errors, "contact.firstName")} onChange={(event) => dispatch({ type: "patch-contact", patch: { firstName: event.target.value } })} />
        <TextField label="Last name" name="contact-last" autoComplete="family-name" value={draft.contact.lastName} error={fieldError(errors, "contact.lastName")} onChange={(event) => dispatch({ type: "patch-contact", patch: { lastName: event.target.value } })} />
        <TextField label="Email" name="contact-email" type="email" autoComplete="email" value={draft.contact.email} error={fieldError(errors, "contact.email")} hint="We store this with the booking. The confirmation stays on screen." onChange={(event) => dispatch({ type: "patch-contact", patch: { email: event.target.value } })} />
        <TextField label="Phone" name="contact-phone" type="tel" autoComplete="tel" value={draft.contact.phone} error={fieldError(errors, "contact.phone")} onChange={(event) => dispatch({ type: "patch-contact", patch: { phone: event.target.value } })} />
        <TextField label="Age" name="contact-age" inputMode="numeric" maxLength={3} value={draft.contact.age} error={fieldError(errors, "contact.age")} hint="The person paying needs to be 18 or older." onChange={(event) => dispatch({ type: "patch-contact", patch: { age: event.target.value } })} />
      </div>
      <label className="flex items-start gap-3 text-sm text-heading">
        <input type="checkbox" className="mt-1 size-5" checked={draft.contact.attending} onChange={(event) => dispatch({ type: "patch-contact", patch: { attending: event.target.checked } })} />
        <span>I am coming to the festival too. If you stay home, another adult who is 18 or older needs to be with any children.</span>
      </label>
      <div className="space-y-4">
        {draft.people.map((person, index) => {
          const age = /^\d{1,3}$/.test(person.age) ? Number(person.age) : null;
          const needsAdult = age !== null && age < 12;
          return (
            <fieldset key={person.id} className="rounded-2xl border border-gold/30 bg-white/60 p-4">
              <legend className="px-1 font-semibold text-heading">Person {index + 2}</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <TextField label="First name" name={`${person.id}-first`} value={person.firstName} error={fieldError(errors, `people.${person.id}.firstName`)} onChange={(event) => dispatch({ type: "patch-person", id: person.id, patch: { firstName: event.target.value } })} />
                <TextField label="Last name" name={`${person.id}-last`} value={person.lastName} hint={needsAdult ? "Optional for children." : "Needed for adults on the door list."} error={fieldError(errors, `people.${person.id}.lastName`)} onChange={(event) => dispatch({ type: "patch-person", id: person.id, patch: { lastName: event.target.value } })} />
                <TextField label="Age" name={`${person.id}-age`} inputMode="numeric" maxLength={3} value={person.age} error={fieldError(errors, `people.${person.id}.age`)} onChange={(event) => dispatch({ type: "patch-person", id: person.id, patch: { age: event.target.value } })} />
                {needsAdult ? (
                  <label className="block text-sm">
                    <span className="font-semibold text-heading">Adult with them</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-gold/50 bg-white px-3 py-3 text-heading"
                      value={person.accompanyingAdultId}
                      onChange={(event) => dispatch({ type: "patch-person", id: person.id, patch: { accompanyingAdultId: event.target.value } })}
                    >
                      <option value="">Choose an adult</option>
                      {adults.filter((adult) => adult.id !== person.id).map((adult) => (
                        <option key={adult.id} value={adult.id}>
                          {adult.name}
                        </option>
                      ))}
                    </select>
                    {fieldError(errors, `people.${person.id}.accompanyingAdultId`) ? (
                      <span className="mt-1 block font-semibold text-danger">{fieldError(errors, `people.${person.id}.accompanyingAdultId`)}</span>
                    ) : (
                      <span className="mt-1 block text-prose">They need to be 18 or older and coming on the same days. No email or phone for a child.</span>
                    )}
                  </label>
                ) : null}
              </div>
              <Button type="button" variant="danger" className="mt-4" onClick={() => dispatch({ type: "remove-person", id: person.id })}>
                Remove
              </Button>
            </fieldset>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={() => dispatch({ type: "add-person", id: crypto.randomUUID() })}>
          Add a person
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Continue to tickets"}
        </Button>
      </div>
    </form>
  );
}
