import fs from "fs";
import path from "path";
import { INITIAL_STOCK, STOCK_CODES, type Stock } from "@/domain/catalog";
import { emptyQuote } from "@/domain/quote";
import type { BookingRecord } from "@/domain/types";
import { decideCheckout, makeBookingCode, type CheckoutRequest, type CreateResult } from "./checkout";

type Persisted = {
  stock: Stock;
  bookings: BookingRecord[];
  idempotency: Record<string, { code: string; inputHash: string }>;
};

const chains = new Map<string, Promise<unknown>>();

function withLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(file) ?? Promise.resolve();
  const run = previous.then(task, task);
  chains.set(
    file,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function fresh(): Persisted {
  return { stock: { ...INITIAL_STOCK }, bookings: [], idempotency: {} };
}

function isStock(value: unknown): value is Stock {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return STOCK_CODES.every((code) => Number.isInteger(record[code]) && (record[code] as number) >= 0);
}

function readDb(file: string): Persisted {
  if (!fs.existsSync(file)) return fresh();
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object") throw new Error("Booking store is unreadable.");
  const record = parsed as Partial<Persisted>;
  if (!isStock(record.stock) || !Array.isArray(record.bookings) || !record.idempotency) {
    throw new Error("Booking store is unreadable.");
  }
  return { stock: record.stock, bookings: record.bookings, idempotency: record.idempotency };
}

function writeDb(file: string, db: Persisted) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(db));
  if (fs.existsSync(file)) fs.rmSync(file);
  fs.renameSync(temporary, file);
}

export type Store = {
  getStock(): Promise<Stock>;
  getBooking(code: string): Promise<BookingRecord | null>;
  createBooking(request: CheckoutRequest): Promise<CreateResult>;
};

export function createFileStore(file: string): Store {
  return {
    async getStock() {
      return withLock(file, async () => readDb(file).stock);
    },
    async getBooking(code) {
      return withLock(file, async () => readDb(file).bookings.find((booking) => booking.code === code) ?? null);
    },
    async createBooking(request) {
      return withLock(file, async () => {
        const db = readDb(file);
        const prior = db.idempotency[request.idempotencyKey];
        const existingBooking = prior ? db.bookings.find((booking) => booking.code === prior.code) : undefined;
        if (prior && !existingBooking) {
          return {
            ok: false as const,
            errors: [{ path: "server", message: "We found a payment attempt but not the booking. Nothing new was charged." }],
            quote: emptyQuote([]),
          };
        }
        const decision = decideCheckout({
          stock: db.stock,
          existing: prior && existingBooking ? { inputHash: prior.inputHash, booking: existingBooking } : null,
          request,
          now: new Date(),
          newCode: makeBookingCode(),
        });
        if (decision.persist) {
          db.stock = decision.persist.stock;
          db.bookings.push(decision.persist.booking);
          db.idempotency[request.idempotencyKey] = {
            code: decision.persist.booking.code,
            inputHash: decision.persist.inputHash,
          };
          writeDb(file, db);
        }
        return decision.result;
      });
    },
  };
}

export function defaultStoreFile(): string {
  return path.join(process.cwd(), ".data", "bookings.json");
}
