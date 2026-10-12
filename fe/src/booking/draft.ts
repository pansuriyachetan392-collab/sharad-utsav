import { ageBand } from "@/festival";
import {
  BOOKER_ID,
  FESTIVAL_DAYS,
  isGarbaDay,
  sortDays,
  type FestivalDay,
  type SelectionKind,
} from "@/festival";

export const STEPS = ["party", "tickets", "extras", "review", "pay"] as const;
export type Step = (typeof STEPS)[number];

export type TicketChoice = "" | "day_adult" | "day_child" | "allday_adult" | "allday_child";

export type PersonDraft = {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  accompanyingAdultId: string;
  ticketKind: TicketChoice;
  days: FestivalDay[];
};

export type FamilyPassDraft = {
  id: string;
  day: FestivalDay;
  personIds: string[];
};

export type Draft = {
  step: Step;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: string;
    attending: boolean;
    ticketKind: "day_adult" | "allday_adult";
    days: FestivalDay[];
  };
  people: PersonDraft[];
  passes: FamilyPassDraft[];
  familyDay: FestivalDay | "";
  familyAdultIds: string[];
  familyChildIds: string[];
  dandiyaQty: number;
  dinner: { personId: string; day: FestivalDay }[];
  garba: { personId: string; day: FestivalDay }[];
  promoCode: string;
  payKey: string | null;
  payKeyFor: string | null;
};

export type PartyMember = {
  id: string;
  name: string;
  age: number | null;
  days: FestivalDay[];
  ticketKind: TicketChoice | "day_adult" | "allday_adult";
  onFamilyPass: boolean;
  familyDay?: FestivalDay;
};

export const initialDraft: Draft = {
  step: "party",
  contact: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    attending: true,
    ticketKind: "day_adult",
    days: [],
  },
  people: [],
  passes: [],
  familyDay: "",
  familyAdultIds: [],
  familyChildIds: [],
  dandiyaQty: 0,
  dinner: [],
  garba: [],
  promoCode: "",
  payKey: null,
  payKeyFor: null,
};

export type DraftAction =
  | { type: "patch-contact"; patch: Partial<Draft["contact"]> }
  | { type: "add-person"; id: string }
  | { type: "remove-person"; id: string }
  | { type: "patch-person"; id: string; patch: Partial<PersonDraft> }
  | { type: "set-ticket-kind"; personId: string; kind: Exclude<TicketChoice, ""> }
  | { type: "toggle-day"; personId: string; day: FestivalDay }
  | { type: "set-family-day"; day: FestivalDay | "" }
  | { type: "toggle-family-adult"; id: string }
  | { type: "toggle-family-child"; id: string }
  | { type: "add-family-pass"; id: string }
  | { type: "remove-family-pass"; id: string }
  | { type: "set-dandiya"; qty: number }
  | { type: "toggle-dinner"; personId: string; day: FestivalDay }
  | { type: "toggle-garba"; personId: string; day: FestivalDay }
  | { type: "set-promo"; code: string }
  | { type: "go"; step: Step }
  | { type: "remember-key"; key: string; forInput: string };

function parseAge(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const age = Number(value);
  return age <= 120 ? age : null;
}

function toggleDay(days: FestivalDay[], day: FestivalDay): FestivalDay[] {
  return days.includes(day) ? days.filter((item) => item !== day) : sortDays([...days, day]);
}

function toggleLimited(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((item) => item !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

export function partyMembers(draft: Draft): PartyMember[] {
  const passDay = new Map<string, FestivalDay>();
  for (const pass of draft.passes) {
    for (const id of pass.personIds) passDay.set(id, pass.day);
  }
  const members: PartyMember[] = [];
  if (draft.contact.attending) {
    members.push(toMember(BOOKER_ID, draft.contact.firstName, draft.contact.lastName, draft.contact.age, draft.contact.ticketKind, draft.contact.days, passDay));
  }
  for (const person of draft.people) {
    members.push(toMember(person.id, person.firstName, person.lastName, person.age, person.ticketKind, person.days, passDay));
  }
  return members;
}

function toMember(
  id: string,
  firstName: string,
  lastName: string,
  ageText: string,
  ticketKind: TicketChoice | Draft["contact"]["ticketKind"],
  selectedDays: FestivalDay[],
  passDay: Map<string, FestivalDay>,
): PartyMember {
  const age = parseAge(ageText);
  const familyDay = passDay.get(id);
  const onFamilyPass = familyDay !== undefined;
  let days = selectedDays;
  if (familyDay) days = [familyDay];
  else if (ticketKind === "allday_adult" || ticketKind === "allday_child") days = [...FESTIVAL_DAYS];
  const name = `${firstName} ${lastName}`.trim();
  return { id, name, age, days, ticketKind, onFamilyPass, familyDay };
}

function ageOf(draft: Draft, id: string): number | null {
  if (id === BOOKER_ID) return draft.contact.attending ? parseAge(draft.contact.age) : null;
  const person = draft.people.find((item) => item.id === id);
  return person ? parseAge(person.age) : null;
}

function validPasses(draft: Draft): FamilyPassDraft[] {
  return draft.passes.filter((pass) => {
    if (new Set(pass.personIds).size !== 4) return false;
    let adults = 0;
    let children = 0;
    for (const id of pass.personIds) {
      const age = ageOf(draft, id);
      if (age === null) return false;
      if (age >= 12) adults += 1;
      else if (age >= 5) children += 1;
      else return false;
    }
    return adults === 2 && children === 2;
  });
}

function keptPairs(draft: Draft, pairs: { personId: string; day: FestivalDay }[], garbaOnly: boolean) {
  const allowed = new Map(partyMembers(draft).map((member) => [member.id, new Set(member.days)]));
  return pairs.filter((pair) => {
    if (garbaOnly && !isGarbaDay(pair.day)) return false;
    return allowed.get(pair.personId)?.has(pair.day) ?? false;
  });
}

function finalize(draft: Draft): Draft {
  const next = { ...draft, passes: validPasses(draft) };
  return {
    ...next,
    dinner: keptPairs(next, next.dinner, false),
    garba: keptPairs(next, next.garba, true),
  };
}

function withTicketDefaults(draft: Draft): Draft {
  return {
    ...draft,
    people: draft.people.map((person) => {
      if (person.ticketKind) return person;
      const age = parseAge(person.age);
      if (age === null || age < 5) return person;
      return { ...person, ticketKind: age <= 11 ? "day_child" : "day_adult" };
    }),
  };
}

export function draftReducer(state: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case "patch-contact": {
      let next: Draft = { ...state, contact: { ...state.contact, ...action.patch } };
      if (action.patch.attending === false) {
        next = {
          ...next,
          passes: next.passes.filter((pass) => !pass.personIds.includes(BOOKER_ID)),
          familyAdultIds: next.familyAdultIds.filter((id) => id !== BOOKER_ID),
          people: next.people.map((person) =>
            person.accompanyingAdultId === BOOKER_ID ? { ...person, accompanyingAdultId: "" } : person,
          ),
        };
      }
      return finalize(next);
    }
    case "add-person":
      return {
        ...state,
        people: [
          ...state.people,
          {
            id: action.id,
            firstName: "",
            lastName: "",
            age: "",
            accompanyingAdultId: state.contact.attending ? BOOKER_ID : "",
            ticketKind: "",
            days: [],
          },
        ],
      };
    case "remove-person":
      return finalize({
        ...state,
        people: state.people.filter((person) => person.id !== action.id),
        familyAdultIds: state.familyAdultIds.filter((id) => id !== action.id),
        familyChildIds: state.familyChildIds.filter((id) => id !== action.id),
      });
    case "patch-person":
      return finalize({
        ...state,
        people: state.people.map((person) => {
          if (person.id !== action.id) return person;
          const next = { ...person, ...action.patch };
          if (action.patch.age === undefined) return next;
          const age = parseAge(next.age);
          if (age === null) return next;
          const band = ageBand(age);
          if (band === "under5") return { ...next, ticketKind: "" };
          if (band === "child" && next.ticketKind !== "day_child" && next.ticketKind !== "allday_child") {
            return { ...next, ticketKind: "day_child" };
          }
          if (band === "adult" && next.ticketKind !== "day_adult" && next.ticketKind !== "allday_adult") {
            return { ...next, ticketKind: "day_adult" };
          }
          return next;
        }),
      });
    case "set-ticket-kind":
      if (action.personId === BOOKER_ID) {
        if (action.kind !== "day_adult" && action.kind !== "allday_adult") return state;
        return finalize({ ...state, contact: { ...state.contact, ticketKind: action.kind } });
      }
      return finalize({
        ...state,
        people: state.people.map((person) => (person.id === action.personId ? { ...person, ticketKind: action.kind } : person)),
      });
    case "toggle-day":
      if (action.personId === BOOKER_ID) {
        return finalize({ ...state, contact: { ...state.contact, days: toggleDay(state.contact.days, action.day) } });
      }
      return finalize({
        ...state,
        people: state.people.map((person) =>
          person.id === action.personId ? { ...person, days: toggleDay(person.days, action.day) } : person,
        ),
      });
    case "set-family-day":
      return { ...state, familyDay: action.day };
    case "toggle-family-adult":
      return { ...state, familyAdultIds: toggleLimited(state.familyAdultIds, action.id, 2) };
    case "toggle-family-child":
      return { ...state, familyChildIds: toggleLimited(state.familyChildIds, action.id, 2) };
    case "add-family-pass": {
      if (!state.familyDay || state.familyAdultIds.length !== 2 || state.familyChildIds.length !== 2) return state;
      const personIds = [...state.familyAdultIds, ...state.familyChildIds];
      const taken = new Set(state.passes.flatMap((pass) => pass.personIds));
      if (new Set(personIds).size !== 4 || personIds.some((id) => taken.has(id))) return state;
      return finalize({
        ...state,
        passes: [...state.passes, { id: action.id, day: state.familyDay, personIds }],
        familyDay: "",
        familyAdultIds: [],
        familyChildIds: [],
      });
    }
    case "remove-family-pass":
      return finalize({ ...state, passes: state.passes.filter((pass) => pass.id !== action.id) });
    case "set-dandiya":
      return { ...state, dandiyaQty: Math.max(0, Math.min(30, Math.trunc(action.qty))) };
    case "toggle-dinner":
      return { ...state, dinner: togglePair(state.dinner, action) };
    case "toggle-garba":
      return { ...state, garba: togglePair(state.garba, action) };
    case "set-promo":
      return { ...state, promoCode: action.code };
    case "go":
      return action.step === "tickets" ? withTicketDefaults({ ...state, step: action.step }) : { ...state, step: action.step };
    case "remember-key":
      return { ...state, payKey: action.key, payKeyFor: action.forInput };
    default:
      return state;
  }
}

function togglePair(
  list: { personId: string; day: FestivalDay }[],
  pair: { personId: string; day: FestivalDay },
) {
  const exists = list.some((item) => item.personId === pair.personId && item.day === pair.day);
  return exists
    ? list.filter((item) => item.personId !== pair.personId || item.day !== pair.day)
    : [...list, pair];
}

export function responsibleAdults(draft: Draft): { id: string; name: string }[] {
  return partyMembers(draft).flatMap((member) => {
    if (member.age === null || member.age < 18) return [];
    return [{ id: member.id, name: member.name || "Adult" }];
  });
}

export function nextStep(step: Step): Step | null {
  const index = STEPS.indexOf(step);
  return STEPS[index + 1] ?? null;
}

export function choiceForMember(member: PartyMember): SelectionKind {
  if (member.age !== null && member.age < 5) return "none";
  if (
    member.ticketKind === "day_adult" ||
    member.ticketKind === "day_child" ||
    member.ticketKind === "allday_adult" ||
    member.ticketKind === "allday_child"
  ) {
    return member.ticketKind;
  }
  if (member.age !== null && member.age <= 11) return "day_child";
  return "day_adult";
}
