import { ageBand, type AgeBand } from "./age";
import {
  BOOKER_ID,
  DAY_LABEL,
  FESTIVAL_DAYS,
  PRICE,
  emptyUsage,
  formatDayList,
  isGarbaDay,
  sortDays,
  type FestivalDay,
  type PaidTicket,
  type Stock,
  type StockCode,
} from "./catalog";
import { applyPromo } from "./promo";
import type { AttendeePreview, BookingInput, FieldError, Line, Quote } from "./types";

const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;

type Attendee = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  band: AgeBand;
  isBooker: boolean;
  accompanyingAdultId?: string;
};

type Ticket =
  | { kind: PaidTicket; days: FestivalDay[] }
  | { kind: "family"; days: FestivalDay[]; passIndex: number }
  | { kind: "none"; days: FestivalDay[] };

type PlannedPerson = Attendee & { ticket: Ticket };

const SOLD_OUT: Record<StockCode, string> = {
  day_adult: "Adult day passes are sold out.",
  day_child: "Child day passes are sold out.",
  allday_adult: "Adult all-day passes are sold out.",
  allday_child: "Child all-day passes are sold out.",
  family: "Family passes are sold out.",
  dandiya: "Dandiya sticks are sold out.",
  dinner: "Dinner plates are sold out.",
  garba: "The Garba workshop is sold out.",
};

const TICKET_LABEL: Record<PlannedPerson["ticket"]["kind"], string> = {
  day_adult: "Adult day pass",
  day_child: "Child day pass",
  allday_adult: "Adult all-day pass",
  allday_child: "Child all-day pass",
  family: "Family pass",
  none: "No ticket (under 5)",
};

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function displayName(person: Attendee): string {
  return person.fullName || "This person";
}

export function emptyQuote(errors: FieldError[]): Quote {
  return {
    ok: false,
    currency: "USD",
    errors,
    lines: [],
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    promo: { code: null, state: "none", message: "", discountCents: 0 },
    usage: emptyUsage(),
    attendees: [],
  };
}

function checkName(value: string, path: string, label: string, required: boolean, errors: FieldError[]) {
  if (!value) {
    if (required) errors.push({ path, message: `Add a ${label}.` });
    return;
  }
  if (!NAME_RE.test(value)) {
    errors.push({ path, message: `Use letters for the ${label}.` });
  }
}

function buildAttendees(input: BookingInput, errors: FieldError[]): Attendee[] {
  const attendees: Attendee[] = [];
  checkName(input.contact.firstName, "contact.firstName", "first name", true, errors);
  checkName(input.contact.lastName, "contact.lastName", "last name", true, errors);
  const digits = input.contact.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    errors.push({
      path: "contact.phone",
      message: "Enter a phone number we can reach you on, including the area code.",
    });
  }
  if (input.contact.age < 18) {
    errors.push({ path: "contact.age", message: "The person paying needs to be 18 or older." });
  }
  if (input.contact.attending) {
    attendees.push({
      id: BOOKER_ID,
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      fullName: fullName(input.contact.firstName, input.contact.lastName),
      age: input.contact.age,
      band: ageBand(input.contact.age),
      isBooker: true,
    });
  }

  const seen = new Set<string>(attendees.map((person) => person.id));
  for (const person of input.people) {
    if (person.id === BOOKER_ID || seen.has(person.id)) {
      errors.push({ path: `people.${person.id}.id`, message: "Two people are using the same id." });
      continue;
    }
    seen.add(person.id);
    const namePath = `people.${person.id}`;
    checkName(person.firstName, `${namePath}.firstName`, "first name", true, errors);
    checkName(person.lastName, `${namePath}.lastName`, "last name", person.age >= 12, errors);
    attendees.push({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: fullName(person.firstName, person.lastName),
      age: person.age,
      band: ageBand(person.age),
      isBooker: false,
      accompanyingAdultId: person.accompanyingAdultId,
    });
  }

  if (attendees.length === 0) {
    errors.push({ path: "party", message: "Add at least one person who is coming." });
  } else if (attendees.length > 16) {
    errors.push({
      path: "party",
      message: "One booking can cover up to 16 people. Start another booking for the rest.",
    });
  }
  return attendees;
}

function resolveParty(input: BookingInput, attendees: Attendee[], errors: FieldError[]): PlannedPerson[] {
  const byId = new Map(attendees.map((person) => [person.id, person]));
  const reserved = new Set<string>();
  const plan: PlannedPerson[] = [];

  input.familyPasses.forEach((pass, index) => {
    const path = `familyPasses.${index}`;
    for (const id of pass.personIds) reserved.add(id);
    if (new Set(pass.personIds).size !== 4) {
      errors.push({ path, message: "A family pass needs four different people." });
      return;
    }
    const members: Attendee[] = [];
    let missing = false;
    for (const id of pass.personIds) {
      const person = byId.get(id);
      if (!person) missing = true;
      else members.push(person);
    }
    if (missing || members.length !== 4) {
      errors.push({ path, message: "One of the family pass places doesn't match anyone on this booking." });
      return;
    }
    const under5 = members.filter((person) => person.band === "under5");
    if (under5.length > 0) {
      const names = under5.map((person) => displayName(person)).join(", ");
      errors.push({
        path,
        message: `${names} ${under5.length === 1 ? "is" : "are"} under 5, so they come in free and don't take a place on the family pass.`,
      });
      return;
    }
    const adults = members.filter((person) => person.band === "adult").length;
    const children = members.filter((person) => person.band === "child").length;
    if (adults !== 2 || children !== 2) {
      errors.push({
        path,
        message: "A family pass covers exactly 2 adults (12+) and 2 children (ages 5 to 11) for one day.",
      });
      return;
    }
    for (const person of members) {
      plan.push({ ...person, ticket: { kind: "family", days: [pass.day], passIndex: index } });
    }
  });

  const selections = new Map<string, BookingInput["selections"][number]>();
  for (const selection of input.selections) {
    if (selections.has(selection.personId)) {
      errors.push({ path: `selections.${selection.personId}`, message: "Choose one entry ticket for each person." });
      continue;
    }
    selections.set(selection.personId, selection);
  }

  for (const person of attendees) {
    if (reserved.has(person.id)) {
      if (selections.has(person.id)) {
        errors.push({
          path: `selections.${person.id}`,
          message: `${displayName(person)} is on a family pass, so they can't also have a separate entry ticket.`,
        });
      }
      continue;
    }
    const selection = selections.get(person.id);
    if (!selection) {
      errors.push({
        path: `selections.${person.id}`,
        message:
          person.band === "under5"
            ? `Choose at least one day ${displayName(person)} is coming.`
            : `Choose a ticket for ${displayName(person)}.`,
      });
      continue;
    }
    if (!byId.has(selection.personId)) {
      errors.push({ path: `selections.${selection.personId}`, message: "That ticket doesn't match anyone on this booking." });
      continue;
    }
    const ticket = ticketFor(person, selection, errors);
    if (ticket) plan.push({ ...person, ticket });
  }

  for (const selection of input.selections) {
    if (!byId.has(selection.personId) && !reserved.has(selection.personId)) {
      errors.push({
        path: `selections.${selection.personId}`,
        message: "That ticket doesn't match anyone on this booking.",
      });
    }
  }

  if (!plan.some((person) => person.ticket.kind !== "none") && errors.length === 0) {
    errors.push({ path: "party", message: "Add at least one entry ticket. Extras alone don't get someone in." });
  }

  checkAccompanying(plan, attendees, errors);
  return plan;
}

function ticketFor(
  person: Attendee,
  selection: BookingInput["selections"][number],
  errors: FieldError[],
): Ticket | null {
  const path = `selections.${person.id}`;
  const uniqueDays = new Set(selection.days);
  if (uniqueDays.size !== selection.days.length) {
    errors.push({ path, message: `A day is selected twice for ${displayName(person)}.` });
    return null;
  }

  if (person.band === "under5") {
    if (selection.kind !== "none") {
      errors.push({
        path,
        message: `${displayName(person)} is ${person.age}, so they don't need a ticket. Under 5s come in free.`,
      });
      return null;
    }
    if (selection.days.length === 0) {
      errors.push({ path, message: `Choose at least one day ${displayName(person)} is coming.` });
      return null;
    }
    return { kind: "none", days: sortDays(selection.days) };
  }

  if (selection.kind === "none") {
    errors.push({
      path,
      message: `Choose a ticket for ${displayName(person)}. Only under 5s come in without one.`,
    });
    return null;
  }

  const wantsChild = selection.kind === "day_child" || selection.kind === "allday_child";
  if (person.band === "child" && !wantsChild) {
    errors.push({
      path,
      message: `${displayName(person)} is ${person.age}, so they need a child ticket. Adult tickets are for ages 12 and above.`,
    });
    return null;
  }
  if (person.band === "adult" && wantsChild) {
    errors.push({
      path,
      message: `${displayName(person)} is ${person.age}, so they need an adult ticket. Child tickets are for ages 5 to 11.`,
    });
    return null;
  }

  if (selection.kind === "allday_adult" || selection.kind === "allday_child") {
    return { kind: selection.kind, days: [...FESTIVAL_DAYS] };
  }

  if (selection.days.length === 0) {
    errors.push({ path, message: `Choose at least one day for ${displayName(person)}.` });
    return null;
  }
  return { kind: selection.kind, days: sortDays(selection.days) };
}

function checkAccompanying(plan: PlannedPerson[], attendees: Attendee[], errors: FieldError[]) {
  const attendance = new Map(plan.map((person) => [person.id, person.ticket.days]));
  const byId = new Map(attendees.map((person) => [person.id, person]));
  for (const person of attendees) {
    if (person.isBooker || person.age >= 12) continue;
    const path = `people.${person.id}.accompanyingAdultId`;
    const adult = person.accompanyingAdultId ? byId.get(person.accompanyingAdultId) : undefined;
    if (!person.accompanyingAdultId || !adult) {
      errors.push({
        path,
        message: person.accompanyingAdultId
          ? `Choose an adult who is actually coming with ${displayName(person)}.`
          : `Choose the adult who will be with ${displayName(person)}.`,
      });
      continue;
    }
    if (adult.age < 18) {
      errors.push({
        path,
        message: `${displayName(adult)} needs to be 18 or older to be the adult with ${displayName(person)}.`,
      });
      continue;
    }
    const adultDays = new Set(attendance.get(adult.id) ?? []);
    for (const day of attendance.get(person.id) ?? []) {
      if (!adultDays.has(day)) {
        errors.push({
          path,
          message: `${displayName(adult)} isn't coming on ${DAY_LABEL[day]}, so they can't be the adult with ${displayName(person)} that day.`,
        });
      }
    }
  }
}

function checkExtras(input: BookingInput, plan: PlannedPerson[], errors: FieldError[]) {
  const byId = new Map(plan.map((person) => [person.id, person]));
  const seenDinner = new Set<string>();
  for (const plate of input.extras.dinner) {
    const dinnerKey = `${plate.personId}:${plate.day}`;
    if (seenDinner.has(dinnerKey)) {
      errors.push({ path: "extras.dinner", message: "A dinner plate is listed twice for the same person and day." });
      continue;
    }
    seenDinner.add(dinnerKey);
    const person = byId.get(plate.personId);
    if (!person || !person.ticket.days.includes(plate.day)) {
      errors.push({
        path: "extras.dinner",
        message: `${person ? displayName(person) : "That person"} isn't coming on ${DAY_LABEL[plate.day]}, so a dinner plate that day isn't on this booking.`,
      });
    }
  }
  const seenGarba = new Set<string>();
  for (const seat of input.extras.garba) {
    const garbaKey = `${seat.personId}:${seat.day}`;
    if (seenGarba.has(garbaKey)) {
      errors.push({ path: "extras.garba", message: "A workshop place is listed twice for the same person and day." });
      continue;
    }
    seenGarba.add(garbaKey);
    if (!isGarbaDay(seat.day)) {
      errors.push({
        path: "extras.garba",
        message: "The Garba workshop only runs on Wed 11 Nov and Fri 13 Nov.",
      });
      continue;
    }
    const person = byId.get(seat.personId);
    if (!person || !person.ticket.days.includes(seat.day)) {
      errors.push({
        path: "extras.garba",
        message: `${person ? displayName(person) : "That person"} isn't coming on ${DAY_LABEL[seat.day]}, so they can't take a workshop place that day.`,
      });
    }
  }
}

function stockMessage(code: StockCode, remaining: number, needed: number): string {
  if (remaining <= 0) return SOLD_OUT[code];
  if (code === "garba") {
    const noun = remaining === 1 ? "place is" : "places are";
    return `Only ${remaining} Garba workshop ${noun} left, and this booking needs ${needed}.`;
  }
  return `Only ${remaining} left for this item, and this booking needs ${needed}.`;
}

function stockErrors(stock: Stock, usage: Stock): FieldError[] {
  const errors: FieldError[] = [];
  for (const code of Object.keys(usage) as StockCode[]) {
    const needed = usage[code];
    const remaining = stock[code];
    if (needed > remaining) {
      errors.push({ path: `stock.${code}`, message: stockMessage(code, remaining, needed) });
    }
  }
  return errors;
}

function pricePlan(plan: PlannedPerson[], input: BookingInput): { lines: Line[]; usage: Stock; attendees: AttendeePreview[] } {
  const lines: Line[] = [];
  const usage = emptyUsage();
  const familySeen = new Set<number>();

  for (const person of plan) {
    const ticket = person.ticket;
    if (ticket.kind === "family") {
      if (familySeen.has(ticket.passIndex)) continue;
      familySeen.add(ticket.passIndex);
      const names = plan
        .filter((member) => member.ticket.kind === "family" && member.ticket.passIndex === ticket.passIndex)
        .map((member) => displayName(member))
        .join(", ");
      const day = ticket.days[0];
      if (day) {
        lines.push({
          code: "family",
          label: `Family pass · ${DAY_LABEL[day]} · ${names}`,
          quantity: 1,
          unitAmountCents: PRICE.family,
          amountCents: PRICE.family,
        });
        usage.family += 1;
      }
      continue;
    }
    if (ticket.kind === "none") continue;
    const unit = PRICE[ticket.kind];
    lines.push({
      code: ticket.kind,
      label: `${displayName(person)} · ${TICKET_LABEL[ticket.kind]} · ${formatDayList(ticket.days)}`,
      quantity: ticket.kind.startsWith("allday") ? 1 : ticket.days.length,
      unitAmountCents: unit,
      amountCents: ticket.kind.startsWith("allday") ? unit : unit * ticket.days.length,
    });
    usage[ticket.kind] += ticket.kind.startsWith("allday") ? 1 : ticket.days.length;
  }

  if (input.extras.dandiyaQty > 0) {
    lines.push({
      code: "dandiya",
      label: `Dandiya sticks (pair) × ${input.extras.dandiyaQty}`,
      quantity: input.extras.dandiyaQty,
      unitAmountCents: PRICE.dandiya,
      amountCents: PRICE.dandiya * input.extras.dandiyaQty,
    });
    usage.dandiya += input.extras.dandiyaQty;
  }
  if (input.extras.dinner.length > 0) {
    lines.push({
      code: "dinner",
      label: `Dinner plates × ${input.extras.dinner.length}`,
      quantity: input.extras.dinner.length,
      unitAmountCents: PRICE.dinner,
      amountCents: PRICE.dinner * input.extras.dinner.length,
    });
    usage.dinner += input.extras.dinner.length;
  }
  if (input.extras.garba.length > 0) {
    lines.push({
      code: "garba",
      label: `Garba workshop × ${input.extras.garba.length}`,
      quantity: input.extras.garba.length,
      unitAmountCents: PRICE.garba,
      amountCents: PRICE.garba * input.extras.garba.length,
    });
    usage.garba += input.extras.garba.length;
  }

  const dinnerByPerson = new Map<string, FestivalDay[]>();
  for (const plate of input.extras.dinner) {
    dinnerByPerson.set(plate.personId, [...(dinnerByPerson.get(plate.personId) ?? []), plate.day]);
  }
  const garbaByPerson = new Map<string, FestivalDay[]>();
  for (const seat of input.extras.garba) {
    garbaByPerson.set(seat.personId, [...(garbaByPerson.get(seat.personId) ?? []), seat.day]);
  }
  const byId = new Map(plan.map((person) => [person.id, person]));

  const attendees: AttendeePreview[] = plan.map((person) => {
    const adult = person.accompanyingAdultId ? byId.get(person.accompanyingAdultId) : undefined;
    return {
      id: person.id,
      fullName: displayName(person),
      age: person.age,
      band: person.band,
      ticketLabel: TICKET_LABEL[person.ticket.kind],
      days: person.ticket.days,
      accompanyingAdultName: adult ? displayName(adult) : undefined,
      dinnerDays: sortDays(dinnerByPerson.get(person.id) ?? []),
      garbaDays: sortDays(garbaByPerson.get(person.id) ?? []),
    };
  });

  return { lines, usage, attendees };
}

export function quoteBooking(input: BookingInput, stock: Stock): Quote {
  const errors: FieldError[] = [];
  const attendees = buildAttendees(input, errors);
  const duplicateIds = errors.some((error) => error.path.endsWith(".id"));
  const plan = duplicateIds || attendees.length === 0 ? [] : resolveParty(input, attendees, errors);
  if (errors.length === 0) checkExtras(input, plan, errors);
  if (errors.length > 0 || plan.length === 0) return emptyQuote(errors);

  const priced = pricePlan(plan, input);
  const subtotalCents = priced.lines.reduce((sum, line) => sum + line.amountCents, 0);
  const promo = applyPromo(input.promoCode, priced.lines, subtotalCents);
  const discountCents = Math.min(promo.discountCents, subtotalCents);
  const quoteErrors = [
    ...stockErrors(stock, priced.usage),
    ...(promo.state === "rejected" ? [{ path: "promoCode", message: promo.message }] : []),
  ];

  return {
    ok: quoteErrors.length === 0,
    currency: "USD",
    errors: quoteErrors,
    lines: priced.lines,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    promo: { ...promo, discountCents },
    usage: priced.usage,
    attendees: priced.attendees,
  };
}
