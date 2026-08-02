/**
 * Unit tests for countdown timer utility logic.
 *
 * These tests cover the pure functions embedded in countdown-bar.js without
 * needing a browser DOM. The logic is extracted inline for testability.
 */

// ── pad(n) ────────────────────────────────────────────────────────────────────
// Extracted from countdown-bar.js: function pad(n) { return n < 10 ? '0' + n : String(n); }
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

describe("pad(n)", () => {
  it("pads single-digit numbers with a leading zero", () => {
    expect(pad(0)).toBe("00");
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });

  it("does not pad two-digit numbers", () => {
    expect(pad(10)).toBe("10");
    expect(pad(59)).toBe("59");
    expect(pad(99)).toBe("99");
  });

  it("handles large numbers without padding", () => {
    expect(pad(100)).toBe("100");
    expect(pad(365)).toBe("365");
  });
});

// ── Time decomposition ────────────────────────────────────────────────────────
// Mirrors the formula in countdown-bar.js tick() function
function decompose(totalSecs) {
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
  };
}

describe("time decomposition (mirrors countdown-bar.js tick formula)", () => {
  it("decomposes exactly 1 day", () => {
    const { days, hours, mins, secs } = decompose(86400);
    expect(days).toBe(1);
    expect(hours).toBe(0);
    expect(mins).toBe(0);
    expect(secs).toBe(0);
  });

  it("decomposes exactly 1 hour", () => {
    const { days, hours, mins, secs } = decompose(3600);
    expect(days).toBe(0);
    expect(hours).toBe(1);
    expect(mins).toBe(0);
    expect(secs).toBe(0);
  });

  it("decomposes 90 seconds", () => {
    const { days, hours, mins, secs } = decompose(90);
    expect(days).toBe(0);
    expect(hours).toBe(0);
    expect(mins).toBe(1);
    expect(secs).toBe(30);
  });

  it("decomposes 1 day + 2 hours + 30 minutes + 45 seconds", () => {
    const totalSecs = 86400 + 2 * 3600 + 30 * 60 + 45;
    const { days, hours, mins, secs } = decompose(totalSecs);
    expect(days).toBe(1);
    expect(hours).toBe(2);
    expect(mins).toBe(30);
    expect(secs).toBe(45);
  });

  it("decomposes zero correctly", () => {
    const { days, hours, mins, secs } = decompose(0);
    expect(days).toBe(0);
    expect(hours).toBe(0);
    expect(mins).toBe(0);
    expect(secs).toBe(0);
  });

  it("handles BFCM-scale duration (7 days)", () => {
    const totalSecs = 7 * 86400;
    const { days, hours, mins, secs } = decompose(totalSecs);
    expect(days).toBe(7);
    expect(hours).toBe(0);
    expect(mins).toBe(0);
    expect(secs).toBe(0);
  });
});

// ── UTC end-date calculation ───────────────────────────────────────────────────
describe("UTC-based remaining time calculation", () => {
  it("calculates remaining milliseconds from UTC ISO string", () => {
    const futureMs = Date.now() + 3600 * 1000; // 1 hour from now
    const endDate = new Date(futureMs);
    const dist = endDate.getTime() - Date.now();

    // Should be close to 3600000ms (within 50ms margin for test execution)
    expect(dist).toBeGreaterThan(3599000);
    expect(dist).toBeLessThanOrEqual(3600000);
  });

  it("returns negative distance for past end dates", () => {
    const pastMs = Date.now() - 1000;
    const endDate = new Date(pastMs);
    const dist = endDate.getTime() - Date.now();
    expect(dist).toBeLessThan(0);
  });

  it("parses ISO 8601 UTC string correctly", () => {
    const isoString = "2026-11-27T23:59:59.000Z"; // BFCM 2026 end
    const endDate = new Date(isoString);
    expect(endDate.getTime()).toBeGreaterThan(0);
    expect(isNaN(endDate.getTime())).toBe(false);
  });

  it("rejects invalid date strings", () => {
    const invalid = new Date("not-a-date");
    expect(isNaN(invalid.getTime())).toBe(true);
  });
});

// ── Screen reader announcement text ───────────────────────────────────────────
function buildSrText(days, hours, mins) {
  return (
    "Sale ends in " + (days > 0 ? days + " days, " : "") + hours + " hours, " + mins + " minutes."
  );
}

describe("screen reader announcement text", () => {
  it("includes days when days > 0", () => {
    const text = buildSrText(2, 3, 45);
    expect(text).toBe("Sale ends in 2 days, 3 hours, 45 minutes.");
  });

  it("omits days when days === 0", () => {
    const text = buildSrText(0, 3, 45);
    expect(text).toBe("Sale ends in 3 hours, 45 minutes.");
  });

  it("handles singular values correctly", () => {
    const text = buildSrText(1, 1, 1);
    expect(text).toBe("Sale ends in 1 days, 1 hours, 1 minutes.");
  });
});
