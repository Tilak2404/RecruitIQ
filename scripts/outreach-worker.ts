import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { runAutomationCycle } from "../lib/services/automation";

const cronExpression = process.env.OUTREACH_WORKER_CRON ?? "* * * * *";
const timezone = process.env.OUTREACH_TIMEZONE ?? "Asia/Calcutta";
let isRunning = false;

console.log(`[worker] starting outreach worker with schedule ${cronExpression} (${timezone})`);

const task = cron.schedule(
  cronExpression,
  async () => {
    if (isRunning) {
      console.log("[worker] skipped run because the previous cycle is still active");
      return;
    }

    isRunning = true;

    try {
      const result = await runAutomationCycle();
      console.log(
        `[worker] cycle complete | queued follow-ups: ${result.queuedFollowUps} | sent: ${result.sent} | failed: ${result.failed} | campaigns processed: ${result.processedCampaigns}`
      );
    } catch (error) {
      console.error("[worker] cycle failed", error);
    } finally {
      isRunning = false;
    }
  },
  {
    timezone
  }
);

task.start();

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down`);
  task.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

