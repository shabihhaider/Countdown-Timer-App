// @vitest-environment node
/** Free plan race and SHOP-08: the limit holds under concurrency and after a downgrade. */
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../app/shopify.server", () => ({ PLAN_PRO: "Pro" }));
vi.mock("../../../app/utils/logger.server", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { enforceFreeCampaignLimit, writeWithinCampaignLimit } = await import(
  "../../../app/utils/billing.server"
);

const SHOP = "busy-store.myshopify.com";
const FREE = { maxActiveCampaigns: 1 };
const PRO = { maxActiveCampaigns: Infinity };

function fakeDb(activeCount) {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    campaign: { count: vi.fn().mockResolvedValue(activeCount) },
  };
  return { tx, db: { $transaction: vi.fn((fn) => fn(tx)) } };
}

describe("writeWithinCampaignLimit", () => {
  test("takes the per-shop lock before counting", async () => {
    const { db, tx } = fakeDb(0);
    const order = [];
    tx.$executeRaw.mockImplementation(async () => order.push("lock"));
    tx.campaign.count.mockImplementation(async () => {
      order.push("count");
      return 0;
    });
    await writeWithinCampaignLimit(db, SHOP, FREE, async () => order.push("write"));
    expect(order).toEqual(["lock", "count", "write"]);
  });

  test("writes inside the transaction and returns the result", async () => {
    const { db, tx } = fakeDb(0);
    const write = vi.fn().mockResolvedValue({ id: 5 });
    const outcome = await writeWithinCampaignLimit(db, SHOP, FREE, write);
    expect(outcome).toEqual({ allowed: true, result: { id: 5 } });
    expect(write).toHaveBeenCalledWith(tx);
  });

  test("refuses at the limit without writing", async () => {
    const { db } = fakeDb(1);
    const write = vi.fn();
    const outcome = await writeWithinCampaignLimit(db, SHOP, FREE, write);
    expect(outcome.allowed).toBe(false);
    expect(outcome.reason).toMatch(/Upgrade to Pro/);
    expect(write).not.toHaveBeenCalled();
  });

  test("an unlimited plan needs no lock", async () => {
    const { db } = fakeDb(99);
    const write = vi.fn().mockResolvedValue({ id: 5 });
    const outcome = await writeWithinCampaignLimit(db, SHOP, PRO, write);
    expect(outcome.allowed).toBe(true);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(db);
  });
});

describe("enforceFreeCampaignLimit", () => {
  let db;

  beforeEach(() => {
    db = {
      campaign: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
  });

  test("does nothing at or under the limit", async () => {
    db.campaign.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(enforceFreeCampaignLimit(db, SHOP)).resolves.toBe(0);
    expect(db.campaign.updateMany).not.toHaveBeenCalled();
  });

  test("keeps the first campaign in priority order and pauses the rest", async () => {
    db.campaign.findMany.mockResolvedValue([{ id: 3 }, { id: 2 }, { id: 1 }]);
    await expect(enforceFreeCampaignLimit(db, SHOP)).resolves.toBe(2);
    expect(db.campaign.findMany.mock.calls[0][0].orderBy).toEqual([
      { priority: "desc" },
      { createdAt: "desc" },
    ]);
    expect(db.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [2, 1] }, shop: SHOP },
      data: { isActive: false },
    });
  });

  test("never deletes a campaign", async () => {
    db.campaign.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    await enforceFreeCampaignLimit(db, SHOP);
    expect(db.campaign.delete).toBeUndefined();
  });
});
