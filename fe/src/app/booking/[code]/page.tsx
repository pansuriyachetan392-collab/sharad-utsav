import { notFound } from "next/navigation";
import { apiUrl } from "@/booking/api";
import { Confirmation } from "@/components/Confirmation";
import type { BookingRecord } from "@/types";

export const dynamic = "force-dynamic";

const CODE = /^SU-[A-Z0-9]{8}$/;

function isBooking(value: unknown): value is BookingRecord {
  return typeof value === "object" && value !== null && "code" in value && "attendees" in value && "totalCents" in value;
}

export default async function BookingConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!CODE.test(code)) notFound();
  const response = await fetch(apiUrl(`/api/bookings/${code}`), { cache: "no-store" });
  if (!response.ok) notFound();
  const body: unknown = await response.json();
  if (!isBooking(body)) notFound();
  return <Confirmation booking={body} />;
}
