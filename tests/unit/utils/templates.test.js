import { TIMER_TEMPLATES } from "../../../app/utils/templates";

describe("TIMER_TEMPLATES", () => {
  it("has 8 templates", () => {
    expect(TIMER_TEMPLATES).toHaveLength(8);
  });

  it("each template has required fields", () => {
    TIMER_TEMPLATES.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.barColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.textColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.buttonBgColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.buttonTextColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("has unique IDs", () => {
    const ids = TIMER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes classic, urgent-red, and bfcm templates", () => {
    const ids = TIMER_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("classic");
    expect(ids).toContain("urgent-red");
    expect(ids).toContain("bfcm");
  });
});
