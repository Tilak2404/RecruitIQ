import nodemailer from "nodemailer";
import { Prisma, type SendingAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/services/crypto";
import { buildTrackingUrl, sleep, stripHtml } from "@/lib/utils";

interface SendCampaignOptions {
  campaignId: string;
  delayMs?: number;
  batchSize?: number;
  rotationSize?: number;
  retryLimit?: number;
  scheduledOnly?: boolean;
}

interface SendSummary {
  sent: number;
  failed: number;
  processed: number;
}

type QueueItem = Prisma.EmailLogGetPayload<{
  include: {
    recruiter: true;
  };
}>;

function createTransport(account: SendingAccount) {
  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.email,
      pass: decryptSecret(account.password)
    }
  });
}

async function getUsage(accounts: SendingAccount[]) {
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await prisma.emailLog.findMany({
    where: {
      sendingAccountId: { in: accounts.map((account) => account.id) },
      status: { in: ["SENT", "OPENED", "REPLIED"] },
      lastSentAt: { gte: lastDay }
    },
    select: {
      sendingAccountId: true,
      lastSentAt: true
    }
  });

  const usage = new Map<string, { hourly: number; daily: number }>();

  for (const account of accounts) {
    usage.set(account.id, { hourly: 0, daily: 0 });
  }

  for (const log of logs) {
    if (!log.sendingAccountId || !log.lastSentAt) {
      continue;
    }

    const stats = usage.get(log.sendingAccountId);

    if (!stats) {
      continue;
    }

    stats.daily += 1;

    if (log.lastSentAt >= lastHour) {
      stats.hourly += 1;
    }
  }

  return usage;
}

function pickEligibleAccount(
  accounts: SendingAccount[],
  usage: Map<string, { hourly: number; daily: number }>,
  preferredIndex: number
) {
  for (let offset = 0; offset < accounts.length; offset += 1) {
    const index = (preferredIndex + offset) % accounts.length;
    const account = accounts[index];
    const stats = usage.get(account.id) ?? { hourly: 0, daily: 0 };

    if (stats.daily < account.dailyLimit && stats.hourly < account.hourlyLimit) {
      return { account, index, stats };
    }
  }

  return null;
}

function addTrackingPixel(body: string, token: string) {
  return `${body}<img src="${buildTrackingUrl(token)}" alt="" width="1" height="1" style="display:none" />`;
}

async function getSendQueue(campaignId: string, scheduledOnly = false) {
  const now = new Date();

  return prisma.emailLog.findMany({
    where: {
      campaignId,
      status: "NOT_SENT",
      ...(scheduledOnly
        ? {
            scheduledAt: {
              lte: now,
              not: null
            }
          }
        : {
            OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }]
          })
    },
    include: {
      recruiter: true
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }]
  });
}

async function processQueue(
  campaign: {
    id: string;
    delayMs: number;
    batchSize: number;
    rotationSize: number;
    retryLimit: number;
  },
  queue: QueueItem[],
  options: SendCampaignOptions
): Promise<SendSummary> {
  const accounts = await prisma.sendingAccount.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (accounts.length === 0) {
    throw new Error("Add at least one active sending account before sending");
  }

  const delayMs = options.delayMs ?? campaign.delayMs;
  const batchSize = options.batchSize ?? campaign.batchSize;
  const rotationSize = options.rotationSize ?? campaign.rotationSize;
  const retryLimit = options.retryLimit ?? campaign.retryLimit;
  const limitedQueue = queue.slice(0, batchSize);

  if (limitedQueue.length === 0) {
    throw new Error("No pending emails to send");
  }

  const usage = await getUsage(accounts);
  let rotationIndex = 0;
  let rotationCounter = 0;
  let sent = 0;
  let failed = 0;

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "ACTIVE",
      sendState: "RUNNING",
      sendProgress: 0
    }
  });

  try {
    for (const [index, log] of limitedQueue.entries()) {
      if (rotationCounter >= rotationSize) {
        rotationIndex = (rotationIndex + 1) % accounts.length;
        rotationCounter = 0;
      }

      let lastError = "";
      let attemptsUsed = 0;
      let delivered = false;
      let accountUsed: SendingAccount | null = null;

      for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
        attemptsUsed += 1;
        const selected = pickEligibleAccount(accounts, usage, rotationIndex);

        if (!selected) {
          lastError = "All active sending accounts are currently rate-limited.";
          break;
        }

        rotationIndex = selected.index;
        accountUsed = selected.account;

        try {
          const transporter = createTransport(selected.account);
          await transporter.sendMail({
            from: selected.account.fromName
              ? `${selected.account.fromName} <${selected.account.email}>`
              : selected.account.email,
            to: log.recruiter.email,
            subject: log.subject,
            html: addTrackingPixel(log.body, log.trackingToken),
            text: stripHtml(log.body)
          });

          const now = new Date();
          selected.stats.daily += 1;
          selected.stats.hourly += 1;
          delivered = true;
          sent += 1;

          await prisma.emailLog.update({
            where: { id: log.id },
            data: {
              status: "SENT",
              sentAt: log.sentAt ?? now,
              lastSentAt: now,
              scheduledAt: null,
              attemptCount: { increment: attemptsUsed },
              lastError: null,
              sendingAccountId: selected.account.id
            }
          });

          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "SMTP send failed";
          rotationIndex = (rotationIndex + 1) % accounts.length;
        }
      }

      if (!delivered) {
        failed += 1;

        await prisma.emailLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            scheduledAt: null,
            lastError,
            attemptCount: { increment: attemptsUsed },
            sendingAccountId: accountUsed?.id ?? null
          }
        });
      }

      rotationCounter += 1;

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          sendProgress: Math.round(((index + 1) / limitedQueue.length) * 100)
        }
      });

      if (index < limitedQueue.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        sendState: "COMPLETED",
        sendProgress: 100,
        status: "COMPLETED"
      }
    });

    return {
      sent,
      failed,
      processed: limitedQueue.length
    };
  } catch (error) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        sendState: "FAILED"
      }
    });

    throw error;
  }
}

export async function sendCampaignEmails(options: SendCampaignOptions) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: options.campaignId },
    select: {
      id: true,
      delayMs: true,
      batchSize: true,
      rotationSize: true,
      retryLimit: true
    }
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const queue = await getSendQueue(campaign.id, options.scheduledOnly ?? false);
  return processQueue(campaign, queue, options);
}

export async function sendDueScheduledEmails() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      emailLogs: {
        some: {
          status: "NOT_SENT",
          scheduledAt: {
            lte: new Date(),
            not: null
          }
        }
      }
    },
    select: {
      id: true
    }
  });

  const results: Array<SendSummary & { campaignId: string }> = [];

  for (const campaign of campaigns) {
    const summary = await sendCampaignEmails({
      campaignId: campaign.id,
      scheduledOnly: true,
      batchSize: 500
    });

    results.push({ campaignId: campaign.id, ...summary });
  }

  return results;
}

