import { BOOKER_ID } from "@/festival";
import type { BookingInput, FieldError } from "@/types";
import { choiceForMember, partyMembers, type Draft } from "./draft";

function parseAge(value: string, path: string, errors: FieldError[]): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    errors.push({ path, message: "Enter an age as a whole number from 0 to 120." });
    return null;
  }
  const age = Number(trimmed);
  if (age > 120) {
    errors.push({ path, message: "Enter an age as a whole number from 0 to 120." });
    return null;
  }
  return age;
}

export function toBookingInput(draft: Draft): { ok: true; input: BookingInput } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const contactAge = parseAge(draft.contact.age, "contact.age", errors);
  const people: BookingInput["people"] = [];
  for (const person of draft.people) {
    const age = parseAge(person.age, `people.${person.id}.age`, errors);
    if (age === null) continue;
    people.push({
      id: person.id,
      firstName: person.firstName.trim(),
      lastName: person.lastName.trim(),
      age,
      ...(person.accompanyingAdultId ? { accompanyingAdultId: person.accompanyingAdultId } : {}),
    });
  }
  if (contactAge === null || errors.length > 0) return { ok: false, errors };

  const selections: BookingInput["selections"] = [];
  for (const member of partyMembers(draft)) {
    if (member.onFamilyPass) continue;
    const kind = choiceForMember(member);
    selections.push({
      personId: member.id,
      kind,
      days: kind === "allday_adult" || kind === "allday_child" ? [] : member.days,
    });
  }

  return {
    ok: true,
    input: {
      contact: {
        firstName: draft.contact.firstName.trim(),
        lastName: draft.contact.lastName.trim(),
        email: draft.contact.email.trim(),
        phone: draft.contact.phone.trim(),
        age: contactAge,
        attending: draft.contact.attending,
      },
      people,
      selections,
      familyPasses: draft.passes.map((pass) => ({ day: pass.day, personIds: [...pass.personIds] })),
      extras: {
        dandiyaQty: draft.dandiyaQty,
        dinner: draft.dinner.map((item) => ({ ...item })),
        garba: draft.garba.map((item) => ({ ...item })),
      },
      promoCode: draft.promoCode.trim() ? draft.promoCode.trim() : undefined,
    },
  };
}

export function inputKey(draft: Draft): string {
  const built = toBookingInput(draft);
  return built.ok ? JSON.stringify(built.input) : "";
}

export const bookerId = BOOKER_ID;
