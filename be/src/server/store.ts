import "server-only";
import { INITIAL_STOCK, STOCK_CODES, type Stock } from "@/domain/catalog";
import type { BookingRecord } from "@/domain/types";
import postgres from "postgres";
import { decideCheckout, makeBookingCode, type CheckoutRequest, type CreateResult } from "./checkout";
import { createFileStore, defaultStoreFile, type Store } from "./file-store";

type StockRow = { code: string; remaining: number };
type BookingRow = { code: string; input_hash: string; payload: BookingRecord | string };

let sqlClient: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

function sql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    sqlClient = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    });
  }
  return sqlClient;
}

function asBooking(payload: BookingRecord | string): BookingRecord | null {
  const value: unknown = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.code !== "string" || typeof record.totalCents !== "number" || !Array.isArray(record.attendees)) {
    return null;
  }
  return value as BookingRecord;
}

async function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    try {
      const db = sql();
      await db`create table if not exists stock (
        code text primary key,
        remaining integer not null check (remaining >= 0)
      )`;
      await db`create table if not exists bookings (
        code text primary key,
        idempotency_key text not null unique,
        input_hash text not null,
        payload jsonb not null,
        created_at timestamptz not null default now()
      )`;
      for (const code of STOCK_CODES) {
        await db`insert into stock (code, remaining) values (${code}, ${INITIAL_STOCK[code]}) on conflict (code) do nothing`;
      }
    } catch (error) {
      schemaReady = null;
      throw error;
    }
  })();
  return schemaReady;
}

function rowsToStock(rows: StockRow[]): Stock {
  const stock = { ...INITIAL_STOCK };
  for (const row of rows) {
    if ((STOCK_CODES as readonly string[]).includes(row.code)) {
      stock[row.code as keyof Stock] = row.remaining;
    }
  }
  return stock;
}

function createPostgresStore(): Store {
  return {
    async getStock() {
      await ensureSchema();
      const rows = await sql()<StockRow[]>`select code, remaining from stock`;
      return rowsToStock(rows);
    },
    async getBooking(code) {
      await ensureSchema();
      const rows = await sql()<BookingRow[]>`select code, input_hash, payload from bookings where code = ${code}`;
      const row = rows[0];
      return row ? asBooking(row.payload) : null;
    },
    async createBooking(request: CheckoutRequest): Promise<CreateResult> {
      await ensureSchema();
      return sql().begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(482615)`;
        const stockRows = await tx<StockRow[]>`select code, remaining from stock`;
        const stock = rowsToStock(stockRows);
        const existingRows = await tx<BookingRow[]>`
          select code, input_hash, payload from bookings where idempotency_key = ${request.idempotencyKey}
        `;
        const existingRow = existingRows[0];
        const existingBooking = existingRow ? asBooking(existingRow.payload) : null;
        const decision = decideCheckout({
          stock,
          existing: existingRow && existingBooking ? { inputHash: existingRow.input_hash, booking: existingBooking } : null,
          request,
          now: new Date(),
          newCode: makeBookingCode(),
        });
        if (!decision.persist) return decision.result;
        for (const code of STOCK_CODES) {
          const remaining = decision.persist.stock[code];
          await tx`update stock set remaining = ${remaining} where code = ${code}`;
        }
        const saved = decision.persist.booking;
        await tx`
          insert into bookings (code, idempotency_key, input_hash, payload)
          values (${saved.code}, ${request.idempotencyKey}, ${decision.persist.inputHash}, ${tx.json(saved)})
        `;
        return decision.result;
      });
    },
  };
}

let singleton: Store | null = null;

export function getStore(): Store {
  singleton ??= process.env.DATABASE_URL ? createPostgresStore() : createFileStore(defaultStoreFile());
  return singleton;
}
