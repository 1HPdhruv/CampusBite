import { api, requirePassenger, ApiError } from "@/lib/metro/security";
import { getTransactions } from "@/lib/metro/store";
import { transactionInputSchema } from "@/lib/schemas";
export async function GET(request: Request) {
  return api(async () => {
    const p = await requirePassenger();
    const q = new URL(request.url).searchParams;
    const parsed = transactionInputSchema.safeParse({
      cardId: q.get("cardId") ?? undefined,
      limit: q.has("limit") ? Number(q.get("limit")) : 10,
    });
    if (!parsed.success) throw new ApiError("INVALID_REQUEST");
    return {
      transactions: await getTransactions(
        p.id,
        parsed.data.cardId,
        parsed.data.limit,
      ),
      is_demo: true,
    };
  });
}
