import {
  api,
  requirePassenger,
  assertOrigin,
  readJson,
  rateLimit,
  ApiError,
} from "@/lib/metro/security";
import { prepareTicket } from "@/lib/metro/store";
import { ticketDraftSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const p = await requirePassenger();
    rateLimit(`draft:${p.id}`);
    const body = ticketDraftSchema.safeParse(await readJson(request));
    if (!body.success) throw new ApiError("INVALID_TICKET");
    return prepareTicket(p.id, body.data);
  });
}
