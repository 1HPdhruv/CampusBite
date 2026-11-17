import { api, requirePassenger } from "@/lib/metro/security";
import { getCards, getRecharges } from "@/lib/metro/store";
export async function GET() {
  return api(async () => {
    const p = await requirePassenger();
    return {
      cards: await getCards(p.id),
      recharges: await getRecharges(p.id),
      is_demo: true,
    };
  });
}
