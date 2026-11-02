// @vitest-environment node
/** SEC-10: a caller must not be able to pick its own rate-limit bucket. */
import { describe, expect, test } from "vitest";
import { getClientIp } from "../../../app/utils/client-ip.server";

const requestWith = (headers) => new Request("http://local.test/", { headers });

describe("getClientIp", () => {
  test("prefers x-real-ip, which nginx and Vercel set themselves", () => {
    const request = requestWith({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "6.6.6.6" });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  test("uses the last X-Forwarded-For hop: proxies append, callers can only prepend", () => {
    const request = requestWith({ "x-forwarded-for": "6.6.6.6, 198.51.100.7" });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  test("rotating a spoofed prefix stays in the same bucket", () => {
    const first = getClientIp(requestWith({ "x-forwarded-for": "1.1.1.1, 198.51.100.7" }));
    const second = getClientIp(requestWith({ "x-forwarded-for": "2.2.2.2, 198.51.100.7" }));
    expect(first).toBe(second);
  });

  test("ignores empty hops", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "198.51.100.7, " }))).toBe("198.51.100.7");
  });

  test("falls back to a shared bucket with no proxy headers", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });
});
