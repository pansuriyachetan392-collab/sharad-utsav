import { parseBooking } from "@/domain/schema";
import { emptyQuote, quoteBooking } from "@/domain/quote";
import { getStore } from "@/server/store";
import { json, jsonError, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = parseBooking(body.value);
  if (!parsed.ok) return json(emptyQuote(parsed.errors), 400);
  try {
    const stock = await getStore().getStock();
    return json(quoteBooking(parsed.data, stock));
  } catch (error) {
    console.error(error);
    return jsonError([{ path: "server", message: "We couldn't price this booking. Nothing was charged." }], 500);
  }
}
