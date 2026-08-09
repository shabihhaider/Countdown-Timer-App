/**
 * Unit tests for campaign utility functions.
 * Tests field mapping, status computation, and formatting.
 */

import {
  campaignToFormValues,
  formValuesToCampaignData,
  getCampaignStatus,
  formatNumber,
  DEFAULT_CAMPAIGN_FORM,
  FONT_OPTIONS,
  PAGE_TARGETING_MODES,
  TIMEZONE_OPTIONS,
} from "../../../app/utils/campaign";

describe("campaignToFormValues", () => {
  it("maps Campaign record to form field names", () => {
    const campaign = {
      name: "Test Sale",
      barMessage: "Big Sale!",
      buttonText: "Shop Now",
      buttonUrl: "/collections/sale",
      endDate: new Date("2026-12-31T23:59:59Z"),
      backgroundColor: "#e63946",
      textColor: "#ffffff",
      buttonTextColor: "#111111",
      buttonBackgroundColor: "#ffffff",
      position: "bottom",
      endAction: "show_custom",
      customEndMessage: "Sale ended!",
    };

    const form = campaignToFormValues(campaign);
    expect(form.name).toBe("Test Sale");
    expect(form.barMessage).toBe("Big Sale!");
    expect(form.buttonLink).toBe("/collections/sale"); // buttonUrl → buttonLink
    expect(form.barColor).toBe("#e63946"); // backgroundColor → barColor
    expect(form.textColor).toBe("#ffffff");
    expect(form.buttonTextColor).toBe("#111111");
    expect(form.buttonBgColor).toBe("#ffffff"); // buttonBackgroundColor → buttonBgColor
    expect(form.barPosition).toBe("bottom"); // position → barPosition
    expect(form.endDate).toBeTruthy(); // datetime-local string
  });

  it("handles null endDate", () => {
    const campaign = {
      name: "No Date",
      barMessage: "Sale",
      buttonText: "",
      buttonUrl: "/",
      endDate: null,
      backgroundColor: "#000",
      textColor: "#fff",
      buttonTextColor: "#000",
      buttonBackgroundColor: "#fff",
      position: "top",
      endAction: "hide",
      customEndMessage: "",
    };
    const form = campaignToFormValues(campaign);
    expect(form.endDate).toBe("");
  });
});

describe("formValuesToCampaignData", () => {
  it("maps form field names to Campaign column names", () => {
    const form = {
      name: "My Sale",
      barMessage: "Flash Sale!",
      buttonText: "Shop",
      buttonLink: "/collections/all",
      endDate: "2026-12-31T23:59",
      barColor: "#288d40",
      textColor: "#ffffff",
      buttonTextColor: "#111111",
      buttonBgColor: "#ffffff",
      barPosition: "top",
      endAction: "hide",
      customEndMessage: "",
    };

    const data = formValuesToCampaignData(form);
    expect(data.name).toBe("My Sale");
    expect(data.buttonUrl).toBe("/collections/all"); // buttonLink → buttonUrl
    expect(data.backgroundColor).toBe("#288d40"); // barColor → backgroundColor
    expect(data.buttonBackgroundColor).toBe("#ffffff"); // buttonBgColor → buttonBackgroundColor
    expect(data.position).toBe("top"); // barPosition → position
    expect(data.endDate).toBeInstanceOf(Date);
  });

  it("returns null endDate for empty string", () => {
    const data = formValuesToCampaignData({ ...DEFAULT_CAMPAIGN_FORM, endDate: "" });
    expect(data.endDate).toBeNull();
  });

  it("defaults name to 'My Sale' when empty", () => {
    const data = formValuesToCampaignData({ ...DEFAULT_CAMPAIGN_FORM, name: "" });
    expect(data.name).toBe("My Sale");
  });
});

describe("getCampaignStatus", () => {
  it("returns Inactive when isActive is false", () => {
    const status = getCampaignStatus({ isActive: false, startDate: null, endDate: null });
    expect(status.label).toBe("Inactive");
  });

  it("returns Active when isActive and no dates", () => {
    const status = getCampaignStatus({ isActive: true, startDate: null, endDate: null });
    expect(status.label).toBe("Active");
    expect(status.tone).toBe("success");
  });

  it("returns Scheduled when startDate is in the future", () => {
    const future = new Date(Date.now() + 86400000);
    const status = getCampaignStatus({ isActive: true, startDate: future, endDate: null });
    expect(status.label).toBe("Scheduled");
    expect(status.tone).toBe("info");
  });

  it("returns Ended when endDate is in the past", () => {
    const past = new Date(Date.now() - 86400000);
    const status = getCampaignStatus({ isActive: true, startDate: null, endDate: past });
    expect(status.label).toBe("Ended");
  });

  it("returns Active when between startDate and endDate", () => {
    const past = new Date(Date.now() - 86400000);
    const future = new Date(Date.now() + 86400000);
    const status = getCampaignStatus({ isActive: true, startDate: past, endDate: future });
    expect(status.label).toBe("Active");
    expect(status.tone).toBe("success");
  });
});

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats thousands with separators", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
});

describe("DEFAULT_CAMPAIGN_FORM", () => {
  it("has all required fields", () => {
    expect(DEFAULT_CAMPAIGN_FORM.name).toBe("My Sale");
    expect(DEFAULT_CAMPAIGN_FORM.discountCode).toBe("");
    expect(DEFAULT_CAMPAIGN_FORM.fontFamily).toBe("system");
    expect(DEFAULT_CAMPAIGN_FORM.timerType).toBe("one_time");
    expect(DEFAULT_CAMPAIGN_FORM.dailyResetTime).toBe("00:00");
    expect(DEFAULT_CAMPAIGN_FORM.evergreenMinutes).toBe("30");
  });
});

describe("FONT_OPTIONS", () => {
  it("has system default as first option", () => {
    expect(FONT_OPTIONS[0].value).toBe("system");
  });

  it("has theme inherit option", () => {
    expect(FONT_OPTIONS.find((f) => f.value === "inherit")).toBeTruthy();
  });

  it("has at least 6 font options", () => {
    expect(FONT_OPTIONS.length).toBeGreaterThanOrEqual(6);
  });
});

describe("PAGE_TARGETING_MODES", () => {
  it("has 3 modes", () => {
    expect(PAGE_TARGETING_MODES).toHaveLength(3);
  });

  it("includes all, include, exclude", () => {
    const values = PAGE_TARGETING_MODES.map((m) => m.value);
    expect(values).toContain("all");
    expect(values).toContain("include");
    expect(values).toContain("exclude");
  });
});

describe("TIMEZONE_OPTIONS", () => {
  it("has UTC as first option", () => {
    expect(TIMEZONE_OPTIONS[0].value).toBe("UTC");
  });

  it("has at least 20 timezone options", () => {
    const nonDisabled = TIMEZONE_OPTIONS.filter((t) => !t.disabled);
    expect(nonDisabled.length).toBeGreaterThanOrEqual(20);
  });
});

describe("campaignToFormValues — new fields", () => {
  it("maps discountCode and fontFamily", () => {
    const campaign = {
      name: "Test",
      barMessage: "Sale",
      buttonText: "Shop",
      buttonUrl: "/",
      discountCode: "SAVE20",
      timerType: "one_time",
      startDate: null,
      endDate: null,
      timezone: "UTC",
      dailyResetTime: "00:00",
      evergreenMinutes: 30,
      fontFamily: "Georgia, serif",
      backgroundColor: "#000",
      textColor: "#fff",
      buttonTextColor: "#000",
      buttonBackgroundColor: "#fff",
      position: "top",
      endAction: "hide",
      customEndMessage: "",
      pageTargeting: '{"mode":"include","patterns":["/collections/*"]}',
    };
    const form = campaignToFormValues(campaign);
    expect(form.discountCode).toBe("SAVE20");
    expect(form.fontFamily).toBe("Georgia, serif");
    expect(form.pageTargeting).toBe('{"mode":"include","patterns":["/collections/*"]}');
  });
});

describe("formValuesToCampaignData — new fields", () => {
  it("maps discountCode, fontFamily, and pageTargeting", () => {
    const data = formValuesToCampaignData({
      ...DEFAULT_CAMPAIGN_FORM,
      discountCode: "SUMMER50",
      fontFamily: "Georgia, serif",
      pageTargeting: '{"mode":"exclude","patterns":["/pages/about"]}',
    });
    expect(data.discountCode).toBe("SUMMER50");
    expect(data.fontFamily).toBe("Georgia, serif");
    expect(data.pageTargeting).toBe('{"mode":"exclude","patterns":["/pages/about"]}');
  });

  it("defaults empty discountCode", () => {
    const data = formValuesToCampaignData(DEFAULT_CAMPAIGN_FORM);
    expect(data.discountCode).toBe("");
  });

  it("defaults system fontFamily", () => {
    const data = formValuesToCampaignData(DEFAULT_CAMPAIGN_FORM);
    expect(data.fontFamily).toBe("system");
  });
});
