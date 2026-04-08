import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { encryptSecret } from "@/lib/services/crypto";
import { sendingAccountSchema } from "@/lib/validators";

export async function GET() {
  try {
    const accounts = await prisma.sendingAccount.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        type: true,
        fromName: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        dailyLimit: true,
        hourlyLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return apiSuccess(accounts);
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = sendingAccountSchema.parse(await request.json());
    const account = await prisma.sendingAccount.upsert({
      where: { email: payload.email },
      update: {
        ...payload,
        password: encryptSecret(payload.password)
      },
      create: {
        ...payload,
        password: encryptSecret(payload.password)
      },
      select: {
        id: true,
        name: true,
        type: true,
        fromName: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        dailyLimit: true,
        hourlyLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return apiSuccess(account, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as { id: string; isActive: boolean };

    if (!payload.id) {
      throw new Error("Account id is required");
    }

    const account = await prisma.sendingAccount.update({
      where: { id: payload.id },
      data: { isActive: payload.isActive },
      select: {
        id: true,
        name: true,
        type: true,
        fromName: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        dailyLimit: true,
        hourlyLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return apiSuccess(account);
  } catch (error) {
    return apiError(error);
  }
}
