import { describe, expect, it, vi } from "vitest";

const { updateMany } = vi.hoisted(() => ({
  updateMany: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailLog: {
      updateMany
    }
  }
}));

import { claimEmailLogForSending } from "@/lib/services/mailer";

describe("duplicate email prevention", () => {
  it("claims a NOT_SENT draft only once", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(claimEmailLogForSending("email-1")).resolves.toBe(true);
    await expect(claimEmailLogForSending("email-1")).resolves.toBe(false);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });
});
