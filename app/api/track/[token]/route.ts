import { prisma } from "@/lib/prisma";

const transparentGif = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64");

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;

    const log = await prisma.emailLog.findUnique({
      where: { trackingToken: token },
      select: {
        id: true,
        status: true
      }
    });

    if (log) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          opensCount: {
            increment: 1
          },
          openedAt: new Date(),
          status: log.status === "SENT" ? "OPENED" : log.status
        }
      });
    }
  } catch (error) {
    console.error("[TRACK OPEN]", error);
  }

  return new Response(transparentGif, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
