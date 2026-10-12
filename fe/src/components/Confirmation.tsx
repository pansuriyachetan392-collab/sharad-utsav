import Link from "next/link";
import { formatDayList } from "@/festival";
import { formatUsd } from "@/festival";
import type { BookingRecord } from "@/types";

function whenBooked(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(iso));
}

export function Confirmation({ booking }: { booking: BookingRecord }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-white/80">Radha Krishna Temple · Allen, Texas</p>
      <h1 className="mt-2 font-serif text-4xl text-white">You're booked</h1>
      <section className="mt-6 rounded-3xl bg-cream p-5 text-prose sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-success">Confirmation</p>
        <p className="mt-2 font-serif text-4xl tracking-wide text-heading">{booking.code}</p>
        <p className="mt-2 text-sm">Show this code at the door. We haven't sent an email — keep this page or write the code down.</p>
        <p className="mt-4 text-sm">
          Booked {whenBooked(booking.createdAt)} Central time for {booking.contact.firstName} {booking.contact.lastName}.
        </p>
        <p className="mt-1 text-sm">
          {booking.payment.status === "succeeded"
            ? `Paid ${formatUsd(booking.totalCents)} with card ending ${booking.payment.last4}.`
            : `Nothing to pay. Total ${formatUsd(booking.totalCents)}.`}
        </p>
        <h2 className="mt-8 font-serif text-2xl text-heading">Who's coming</h2>
        <ul className="mt-3 space-y-2">
          {booking.attendees.map((person) => (
            <li key={person.id} className="rounded-xl bg-white px-3 py-3 text-sm">
              <span className="font-semibold text-heading">{person.fullName}</span> · age {person.age} · {person.ticketLabel}
              <span className="block">{formatDayList(person.days)}</span>
              {person.accompanyingAdultName ? <span className="block">With {person.accompanyingAdultName}</span> : null}
              {person.dinnerDays.length > 0 ? <span className="block">Dinner: {formatDayList(person.dinnerDays)}</span> : null}
              {person.garbaDays.length > 0 ? <span className="block">Garba workshop: {formatDayList(person.garbaDays)}</span> : null}
            </li>
          ))}
        </ul>
        <h2 className="mt-8 font-serif text-2xl text-heading">Amount</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {booking.lines.map((line, index) => (
            <li key={`${line.label}:${index}`} className="flex justify-between gap-4">
              <span>{line.label}</span>
              <span className="font-semibold text-heading">{formatUsd(line.amountCents)}</span>
            </li>
          ))}
        </ul>
        {booking.discountCents > 0 ? (
          <p className="mt-3 text-sm font-semibold text-heading">
            {booking.promo.code} −{formatUsd(booking.discountCents)}. {booking.promo.message}
          </p>
        ) : null}
        <p className="mt-3 font-serif text-3xl text-heading">{formatUsd(booking.totalCents)}</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-5 font-semibold text-heading">
          Book another family
        </Link>
      </section>
    </main>
  );
}
