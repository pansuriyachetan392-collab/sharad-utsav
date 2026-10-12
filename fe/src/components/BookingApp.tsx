"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STEPS, draftReducer, initialDraft, nextStep, type DraftAction, type Step } from "@/booking/draft";
import { inputKey, toBookingInput } from "@/booking/payload";
import { errorsForStep } from "@/booking/steps";
import { apiUrl, requestBooking, requestQuote } from "@/booking/api";
import type { Catalog } from "@/festival";
import type { FieldError, Quote } from "@/types";
import { ExtrasStep } from "./ExtrasStep";
import { PartyStep } from "./PartyStep";
import { PayStep } from "./PayStep";
import { QuoteSummary } from "./QuoteSummary";
import { ReviewStep } from "./ReviewStep";
import { TicketsStep } from "./TicketsStep";
import { canShowTotal } from "@/booking/steps";

const STEP_LABEL: Record<Step, string> = {
  party: "Who's coming",
  tickets: "Tickets",
  extras: "Extras",
  review: "Review",
  pay: "Pay",
};

export function BookingApp() {
  const router = useRouter();
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [busy, setBusy] = useState(false);
  const [network, setNetwork] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const payLock = useRef(false);
  const quoteRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/catalog"), { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Catalog) => {
        if (!cancelled) setCatalog(body);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.step]);

  useEffect(() => {
    if (draft.step === "party") return;
    const built = toBookingInput(draft);
    if (!built.ok) return;
    const requestId = ++quoteRequest.current;
    const handle = window.setTimeout(() => {
      void requestQuote(built.input)
        .then((next) => {
          if (requestId === quoteRequest.current) {
            setQuote(next);
            setNetwork(false);
          }
        })
        .catch(() => {
          if (requestId === quoteRequest.current) setNetwork(true);
        });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [draft]);

  function send(action: DraftAction) {
    setErrors([]);
    dispatch(action);
  }

  async function goForward() {
    const built = toBookingInput(draft);
    if (!built.ok) {
      setErrors(errorsForStep(built.errors, draft.step));
      return;
    }
    setBusy(true);
    setNetwork(false);
    try {
      const nextQuote = await requestQuote(built.input);
      setQuote(nextQuote);
      const blockers = errorsForStep(nextQuote.errors, draft.step);
      if (blockers.length > 0 || ((draft.step === "review" || draft.step === "pay") && !nextQuote.ok)) {
        setErrors(blockers.length > 0 ? blockers : nextQuote.errors);
        return;
      }
      setErrors([]);
      const upcoming = nextStep(draft.step);
      if (upcoming) dispatch({ type: "go", step: upcoming });
    } catch {
      setNetwork(true);
      setErrors([{ path: "server", message: "We couldn't reach the server. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function pay(payment?: { cardName: string; cardNumber: string; expiry: string; cvc: string }) {
    if (payLock.current) return;
    const built = toBookingInput(draft);
    if (!built.ok || !quote?.ok) {
      setErrors(built.ok ? quote?.errors ?? [] : built.errors);
      return;
    }
    payLock.current = true;
    setBusy(true);
    setNetwork(false);
    const serialized = inputKey(draft);
    let key = draft.payKey;
    if (!key || draft.payKeyFor !== serialized) {
      key = crypto.randomUUID();
      dispatch({ type: "remember-key", key, forInput: serialized });
    }
    try {
      const result = await requestBooking({ booking: built.input, idempotencyKey: key, payment });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      router.push(`/booking/${result.code}`);
    } catch {
      setNetwork(true);
      setErrors([{ path: "server", message: "We couldn't tell if the booking went through. Try again — you won't be charged twice." }]);
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  }

  const stepIndex = STEPS.indexOf(draft.step);

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-primary">Radha Krishna Temple · Allen, Texas</p>
        <h1 className="mt-2 font-serif text-4xl text-white sm:text-5xl">Sharad Utsav 2026</h1>
        <p className="mt-2 max-w-xl text-white/85">Tuesday 10 November to Saturday 14 November. Book the household in one go.</p>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <ol className="flex gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const current = step === draft.step;
            return (
              <li key={step}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  disabled={index > stepIndex}
                  onClick={() => {
                    if (index < stepIndex) send({ type: "go", step });
                  }}
                  className={`min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold ${
                    current ? "bg-primary text-heading" : "bg-white/10 text-white disabled:opacity-40"
                  }`}
                >
                  {index + 1}. {STEP_LABEL[step]}
                </button>
              </li>
            );
          })}
        </ol>
        <section className="mt-4 rounded-3xl bg-cream p-5 text-prose sm:p-8">
          <noscript className="mb-4 block font-semibold text-danger">
            This page needs JavaScript so the server can price the booking before you pay.
          </noscript>
          {draft.step === "party" ? <PartyStep draft={draft} errors={errors} busy={busy} dispatch={send} onContinue={() => void goForward()} /> : null}
          {draft.step === "tickets" ? (
            <TicketsStep draft={draft} catalog={catalog} errors={errors} busy={busy} dispatch={send} onBack={() => send({ type: "go", step: "party" })} onContinue={() => void goForward()} />
          ) : null}
          {draft.step === "extras" ? (
            <ExtrasStep draft={draft} catalog={catalog} errors={errors} busy={busy} dispatch={send} onBack={() => send({ type: "go", step: "tickets" })} onContinue={() => void goForward()} />
          ) : null}
          {draft.step === "review" ? (
            <ReviewStep draft={draft} quote={quote} errors={errors} busy={busy} network={network} dispatch={send} onBack={() => send({ type: "go", step: "extras" })} onContinue={() => void goForward()} />
          ) : null}
          {draft.step === "pay" ? (
            <PayStep quote={quote} errors={errors} busy={busy} network={network} onBack={() => send({ type: "go", step: "review" })} onPay={(payment) => void pay(payment)} />
          ) : null}
          {draft.step !== "review" && draft.step !== "pay" && draft.step !== "party" && quote && canShowTotal(quote) ? (
            <div className="mt-6 border-t border-gold/30 pt-4">
              <QuoteSummary quote={quote} />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
