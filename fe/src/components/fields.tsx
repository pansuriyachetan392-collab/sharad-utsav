import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { DAY_LABEL, FESTIVAL_DAYS, type FestivalDay } from "@/festival";
import type { FieldError } from "@/types";
import { messageFor } from "@/booking/steps";

const fieldClass =
  "mt-1 w-full rounded-xl border border-gold/50 bg-white px-3 py-3 text-heading outline-none focus:border-primary";

export function TextField({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="font-semibold text-heading">{label}</span>
      <input id={id} aria-invalid={Boolean(error)} className={fieldClass} {...props} />
      {hint ? <span className="mt-1 block text-prose">{hint}</span> : null}
      {error ? <span className="mt-1 block font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }) {
  const id = props.id ?? props.name;
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="font-semibold text-heading">{label}</span>
      <select id={id} className={fieldClass} {...props}>
        {children}
      </select>
      {error ? <span className="mt-1 block font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles =
    variant === "primary"
      ? "bg-primary text-heading hover:bg-bright-gold"
      : variant === "danger"
        ? "bg-white text-danger border border-danger/40"
        : "border border-gold/50 bg-white text-heading hover:border-primary";
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function ErrorSummary({ errors }: { errors: FieldError[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-2xl border border-danger/40 bg-white px-4 py-3 text-sm font-semibold text-danger">
      <ul className="list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={`${error.path}:${error.message}`}>{error.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function DayToggles({
  selected,
  onToggle,
  allowed,
}: {
  selected: readonly FestivalDay[];
  onToggle: (day: FestivalDay) => void;
  allowed?: readonly FestivalDay[];
}) {
  const days = allowed ?? FESTIVAL_DAYS;
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((day) => {
        const pressed = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(day)}
            className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold ${
              pressed ? "border-primary bg-primary text-heading" : "border-gold/50 bg-white text-heading"
            }`}
          >
            {DAY_LABEL[day]}
          </button>
        );
      })}
    </div>
  );
}

export function fieldError(errors: FieldError[], path: string): string | undefined {
  return messageFor(errors, path);
}
