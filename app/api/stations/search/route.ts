import { api, requireGate, ApiError } from "@/lib/metro/security";
import { searchStations } from "@/lib/metro/official";
export async function GET(request: Request) {
  return api(async () => {
    await requireGate();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    if (q.length > 80) throw new ApiError("INVALID_QUERY");
    return { stations: searchStations(q), coverage: "checked subset only" };
  });
}
