import {
  api,
  requirePassenger,
  assertOrigin,
  readJson,
  rateLimit,
  ApiError,
} from "@/lib/metro/security";
import { getTickets, createTicket, publicTicket } from "@/lib/metro/store";
import { ticketCreateSchema } from "@/lib/schemas";
export async function GET() {
  return api(async () => ({
    tickets: (await getTickets((await requirePassenger()).id)).map(
      publicTicket,
    ),
    is_demo: true,
  }));
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const p = await requirePassenger();
    rateLimit(`ticket:${p.id}`, 10);
    const body = ticketCreateSchema.safeParse(await readJson(request));
    if (!body.success) throw new ApiError("EXPLICIT_CONFIRMATION_REQUIRED");
    return {
      ticket: publicTicket(
        await createTicket(
          p.id,
          body.data.confirmation,
          body.data.idempotencyKey,
        ),
      ),
      is_demo: true,
      notice: "In-app prototype only; not submitted to CMRL",
    };
  });
}
