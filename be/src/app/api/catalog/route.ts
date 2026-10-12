import { catalogBody } from "@/domain/catalog";
import { getStore } from "@/server/store";
import { json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const stock = await getStore().getStock();
  return json(catalogBody(stock));
}
