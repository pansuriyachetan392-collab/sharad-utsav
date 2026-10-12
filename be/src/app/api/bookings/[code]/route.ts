import { getStore } from "@/server/store";
import { json, jsonError } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CODE = /^SU-[A-Z0-9]{8}$/;

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!CODE.test(code)) {
    return jsonError([{ path: "code", message: "That confirmation code doesn't look right." }], 404);
  }
  try {
    const booking = await getStore().getBooking(code);
    if (!booking) return jsonError([{ path: "code", message: "We can't find that confirmation." }], 404);
    return json(booking);
  } catch (error) {
    console.error(error);
    return jsonError([{ path: "server", message: "We couldn't open that confirmation." }], 500);
  }
}
