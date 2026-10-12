import { NextResponse } from "next/server";
import type { FieldError, Quote } from "@/domain/types";
import { emptyQuote } from "@/domain/quote";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "cache-control": "no-store",
  };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function jsonError(errors: FieldError[], status: number, quote?: Quote) {
  return json(quote ? { ok: false, errors, quote } : { ok: false, errors }, status);
}

export async function readJson(request: Request) {
  try {
    const value: unknown = await request.json();
    return { ok: true as const, value };
  } catch {
    return {
      ok: false as const,
      response: jsonError([{ path: "server", message: "Send the booking as JSON." }], 400, emptyQuote([])),
    };
  }
}
