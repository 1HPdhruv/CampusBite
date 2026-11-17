import { api, requireGate, ApiError } from "@/lib/metro/security";
import { getFare } from "@/lib/metro/official";
import { fareInputSchema } from "@/lib/schemas";
export async function GET(request: Request) {
  return api(async () => {
    await requireGate();
    const q = new URL(request.url).searchParams;
    const p = fareInputSchema.safeParse({
      from: q.get("from"),
      to: q.get("to"),
      asOf: q.get("asOf") ?? undefined,
    });
    if (!p.success) throw new ApiError("INVALID_REQUEST");
    return getFare(p.data.from, p.data.to, p.data.asOf);
  });
}
