import { parseCheckout } from "@/domain/schema";
import { emptyQuote } from "@/domain/quote";
import { getStore } from "@/server/store";
import { json, jsonError, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = parseCheckout(body.value);
  if (!parsed.ok) return jsonError(parsed.errors, 400, emptyQuote(parsed.errors));
  try {
    const result = await getStore().createBooking(parsed.data);
    if (!result.ok) {
      const status = result.errors.some((error) => error.path.startsWith("stock.")) ? 409 : 422;
      return jsonError(result.errors, status, result.quote);
    }
    return json(result);
  } catch (error) {
    console.error(error);
    return jsonError(
      [{ path: "server", message: "Something went wrong before any charge. Please try again." }],
      500,
    );
  }
}
