import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { addStreamClient, removeStreamClient } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const isMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: params.roomId } }
  });
  if (!isMember) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const client = {
        roomId: params.roomId,
        send,
        close: () => controller.close()
      };

      addStreamClient(params.roomId, client);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 20_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeStreamClient(params.roomId, client);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
