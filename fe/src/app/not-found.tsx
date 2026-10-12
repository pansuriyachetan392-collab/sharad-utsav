import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <section className="rounded-3xl bg-cream p-8 text-prose">
        <h1 className="font-serif text-3xl text-heading">We can't find that page</h1>
        <p className="mt-3">Check the confirmation code, or start a booking.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-5 font-semibold text-heading">
          Book tickets
        </Link>
      </section>
    </main>
  );
}
