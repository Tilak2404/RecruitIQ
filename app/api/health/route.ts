import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        database: "up"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HEALTH]", error);

    return NextResponse.json(
      {
        ok: false,
        database: "down"
      },
      { status: 503 }
    );
  }
}
