// @vitest-environment node
/**
 * SHOP-10: a failed lookup must stay a real charge (a test charge on a paying
 * shop would be free Pro) and must be visible, with one retry for transient errors.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("../../../app/shopify.server", () => ({ PLAN_PRO: "Pro" }));
vi.mock("../../../app/utils/logger.server", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: mocks.error },
}));

const { isTestCharge } = await import("../../../app/utils/billing.server");

const reply = (body) => ({ json: async () => body });
const devStore = reply({ data: { shop: { plan: { partnerDevelopment: true } } } });
const paidStore = reply({ data: { shop: { plan: { partnerDevelopment: false } } } });

describe("isTestCharge in production", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("a development store gets a test charge", async () => {
    const graphql = vi.fn().mockResolvedValue(devStore);
    await expect(isTestCharge({ graphql })).resolves.toBe(true);
  });

  test("a paid store gets a real charge", async () => {
    const graphql = vi.fn().mockResolvedValue(paidStore);
    await expect(isTestCharge({ graphql })).resolves.toBe(false);
    expect(graphql).toHaveBeenCalledTimes(1);
  });

  test("a transient failure is retried once", async () => {
    const graphql = vi.fn().mockRejectedValueOnce(new Error("blip")).mockResolvedValue(devStore);
    await expect(isTestCharge({ graphql })).resolves.toBe(true);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  test("a persistent failure logs an error and stays a real charge", async () => {
    const graphql = vi.fn().mockRejectedValue(new Error("down"));
    await expect(isTestCharge({ graphql })).resolves.toBe(false);
    expect(graphql).toHaveBeenCalledTimes(2);
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  test("a GraphQL error body counts as a failure, not as a paid store", async () => {
    const graphql = vi.fn().mockResolvedValue(reply({ errors: [{ message: "denied" }] }));
    await expect(isTestCharge({ graphql })).resolves.toBe(false);
    expect(graphql).toHaveBeenCalledTimes(2);
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  test("a reauth Response is rethrown", async () => {
    const reauth = new Response(null, { status: 401 });
    const graphql = vi.fn().mockRejectedValue(reauth);
    await expect(isTestCharge({ graphql })).rejects.toBe(reauth);
  });
});

test("outside production every charge is a test charge", async () => {
  await expect(isTestCharge({ graphql: vi.fn() })).resolves.toBe(true);
});
