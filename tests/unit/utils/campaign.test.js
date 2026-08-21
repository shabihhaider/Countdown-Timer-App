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
  ANIMATION_OPTIONS,
  GRADIENT_DIRECTIONS,
  PAGE_TARGETING_MODES,
  TIMEZONE_OPTIONS,
  ICON_OPTIONS,
  CAMPAIGN_TYPES,
  CAMPAIGN_TYPE_LABELS,
  validateCampaignForm,
  isLightColor,
  PRODUCT_TIMER_DEFAULTS,
  BAR_DEFAULTS,
  getDefaultsForType,
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
  it("has system default as first selectable option", () => {
    const firstSelectable = FONT_OPTIONS.find((f) => f.value && !f.disabled);
    expect(firstSelectable.value).toBe("system");
  });

  it("has theme inherit option", () => {
    expect(FONT_OPTIONS.find((f) => f.value === "inherit")).toBeTruthy();
  });

  it("has at least 30 font options including Google Fonts", () => {
    expect(FONT_OPTIONS.length).toBeGreaterThanOrEqual(30);
  });

  it("includes Google Fonts grouped by category", () => {
    const hasInter = FONT_OPTIONS.find((f) => f.value === "Inter");
    const hasBebas = FONT_OPTIONS.find((f) => f.value === "Bebas Neue");
    const hasOrbitron = FONT_OPTIONS.find((f) => f.value === "Orbitron");
    expect(hasInter).toBeTruthy();
    expect(hasBebas).toBeTruthy();
    expect(hasOrbitron).toBeTruthy();
  });
});

describe("ICON_OPTIONS", () => {
  it("has empty string as first option (no icon)", () => {
    expect(ICON_OPTIONS[0].value).toBe("");
  });

  it("includes urgency emojis", () => {
    const values = ICON_OPTIONS.map((o) => o.value);
    expect(values).toContain("🔥");
    expect(values).toContain("⚡");
    expect(values).toContain("⏰");
  });

  it("includes shopping emojis", () => {
    const values = ICON_OPTIONS.map((o) => o.value);
    expect(values).toContain("🛒");
    expect(values).toContain("🏷️");
  });

  it("has at least 20 icon options", () => {
    const selectable = ICON_OPTIONS.filter((o) => o.value && !o.disabled);
    expect(selectable.length).toBeGreaterThanOrEqual(20);
  });
});

describe("DEFAULT_CAMPAIGN_FORM — barIcon", () => {
  it("defaults barIcon to empty string", () => {
    expect(DEFAULT_CAMPAIGN_FORM.barIcon).toBe("");
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

  it("maps barIcon field", () => {
    const campaign = {
      name: "Test",
      barMessage: "Sale",
      buttonText: "Shop",
      buttonUrl: "/",
      barIcon: "🔥",
      backgroundColor: "#000",
      textColor: "#fff",
      buttonTextColor: "#000",
      buttonBackgroundColor: "#fff",
      position: "top",
      endAction: "hide",
      customEndMessage: "",
    };
    const form = campaignToFormValues(campaign);
    expect(form.barIcon).toBe("🔥");
  });

  it("defaults barIcon to empty string when missing", () => {
    const campaign = {
      name: "Test",
      barMessage: "Sale",
      buttonText: "Shop",
      buttonUrl: "/",
      backgroundColor: "#000",
      textColor: "#fff",
      buttonTextColor: "#000",
      buttonBackgroundColor: "#fff",
      position: "top",
      endAction: "hide",
      customEndMessage: "",
    };
    const form = campaignToFormValues(campaign);
    expect(form.barIcon).toBe("");
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

  it("creates gradient backgroundStyle JSON", () => {
    const data = formValuesToCampaignData({
      ...DEFAULT_CAMPAIGN_FORM,
      bgType: "gradient",
      gradientDirection: "135deg",
      gradientColor1: "#ff0000",
      gradientColor2: "#0000ff",
    });
    const parsed = JSON.parse(data.backgroundStyle);
    expect(parsed.type).toBe("gradient");
    expect(parsed.direction).toBe("135deg");
    expect(parsed.colorStops).toEqual(["#ff0000", "#0000ff"]);
  });

  it("returns empty backgroundStyle for solid", () => {
    const data = formValuesToCampaignData({ ...DEFAULT_CAMPAIGN_FORM, bgType: "solid" });
    expect(data.backgroundStyle).toBe("");
  });

  it("sets animationStyle", () => {
    const data = formValuesToCampaignData({ ...DEFAULT_CAMPAIGN_FORM, animationStyle: "fade" });
    expect(data.animationStyle).toBe("fade");
  });
});

describe("campaignToFormValues — gradient parsing", () => {
  const baseCampaign = {
    name: "Test",
    barMessage: "Sale",
    buttonText: "Shop",
    buttonUrl: "/",
    discountCode: "",
    timerType: "one_time",
    startDate: null,
    endDate: null,
    timezone: "UTC",
    dailyResetTime: "00:00",
    evergreenMinutes: 30,
    fontFamily: "system",
    animationStyle: "slide",
    backgroundColor: "#000",
    textColor: "#fff",
    buttonTextColor: "#000",
    buttonBackgroundColor: "#fff",
    position: "top",
    endAction: "hide",
    customEndMessage: "",
    pageTargeting: "[]",
  };

  it("parses gradient backgroundStyle", () => {
    const form = campaignToFormValues({
      ...baseCampaign,
      backgroundStyle: JSON.stringify({
        type: "gradient",
        direction: "45deg",
        colorStops: ["#aaa", "#bbb"],
      }),
    });
    expect(form.bgType).toBe("gradient");
    expect(form.gradientDirection).toBe("45deg");
    expect(form.gradientColor1).toBe("#aaa");
    expect(form.gradientColor2).toBe("#bbb");
    expect(form.animationStyle).toBe("slide");
  });

  it("defaults to solid when backgroundStyle is empty", () => {
    const form = campaignToFormValues({ ...baseCampaign, backgroundStyle: "" });
    expect(form.bgType).toBe("solid");
  });

  it("handles invalid JSON in backgroundStyle", () => {
    const form = campaignToFormValues({ ...baseCampaign, backgroundStyle: "not-json" });
    expect(form.bgType).toBe("solid");
  });
});

describe("ANIMATION_OPTIONS", () => {
  it("has none, fade, slide", () => {
    const values = ANIMATION_OPTIONS.map((a) => a.value);
    expect(values).toContain("none");
    expect(values).toContain("fade");
    expect(values).toContain("slide");
  });
});

describe("GRADIENT_DIRECTIONS", () => {
  it("has at least 4 directions", () => {
    expect(GRADIENT_DIRECTIONS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("product timer fields", () => {
  it("DEFAULT_CAMPAIGN_FORM includes product timer defaults", () => {
    expect(DEFAULT_CAMPAIGN_FORM.productStyle).toBe("minimal");
    expect(DEFAULT_CAMPAIGN_FORM.accentColor).toBe("#dc2626");
    expect(DEFAULT_CAMPAIGN_FORM.labelText).toBe("Sale ends in");
  });

  it("campaignToFormValues maps product timer fields", () => {
    const campaign = {
      name: "Test",
      barMessage: "Sale!",
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
      productStyle: "badge",
      accentColor: "#2563eb",
      labelText: "Limited offer",
    };
    const form = campaignToFormValues(campaign);
    expect(form.productStyle).toBe("badge");
    expect(form.accentColor).toBe("#2563eb");
    expect(form.labelText).toBe("Limited offer");
  });

  it("formValuesToCampaignData maps product timer fields", () => {
    const form = {
      ...DEFAULT_CAMPAIGN_FORM,
      productStyle: "card",
      accentColor: "#7c3aed",
      labelText: "Hurry!",
    };
    const data = formValuesToCampaignData(form);
    expect(data.productStyle).toBe("card");
    expect(data.accentColor).toBe("#7c3aed");
    expect(data.labelText).toBe("Hurry!");
  });

  it("defaults product timer fields when missing from campaign", () => {
    const campaign = {
      name: "Test",
      barMessage: "Sale!",
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
    expect(form.productStyle).toBe("minimal");
    expect(form.accentColor).toBe("#dc2626");
    expect(form.labelText).toBe("Sale ends in");
  });

  it("PRODUCT_TIMER_DEFAULTS includes textColor", () => {
    expect(PRODUCT_TIMER_DEFAULTS.textColor).toBe("#333333");
  });
});

describe("CAMPAIGN_TYPES", () => {
  it("has correct BAR value", () => {
    expect(CAMPAIGN_TYPES.BAR).toBe("bar");
  });

  it("has correct PRODUCT_TIMER value", () => {
    expect(CAMPAIGN_TYPES.PRODUCT_TIMER).toBe("product_timer");
  });

  it("has labels for all types", () => {
    expect(CAMPAIGN_TYPE_LABELS[CAMPAIGN_TYPES.BAR]).toBeDefined();
    expect(CAMPAIGN_TYPE_LABELS[CAMPAIGN_TYPES.PRODUCT_TIMER]).toBeDefined();
  });
});

describe("formValuesToCampaignData type field", () => {
  it("preserves type product_timer when passed", () => {
    const form = { ...DEFAULT_CAMPAIGN_FORM, type: "product_timer" };
    const data = formValuesToCampaignData(form);
    expect(data.type).toBe("product_timer");
  });

  it("defaults type to bar when missing", () => {
    const form = { ...DEFAULT_CAMPAIGN_FORM };
    delete form.type;
    const data = formValuesToCampaignData(form);
    expect(data.type).toBe("bar");
  });
});

describe("validateCampaignForm type-aware", () => {
  const validBarForm = {
    type: "bar",
    barMessage: "Sale!",
    timerType: "daily",
    endAction: "hide",
  };

  const validProductTimerForm = {
    type: "product_timer",
    barMessage: "",
    timerType: "daily",
    endAction: "hide",
    productStyle: "badge",
    labelText: "Sale ends in",
  };

  it("requires barMessage for bar campaigns", () => {
    const errors = validateCampaignForm({ ...validBarForm, barMessage: "" });
    expect(errors.barMessage).toBeDefined();
  });

  it("does NOT require barMessage for product_timer campaigns", () => {
    const errors = validateCampaignForm(validProductTimerForm);
    expect(errors.barMessage).toBeUndefined();
  });

  it("validates productStyle enum for product_timer", () => {
    const errors = validateCampaignForm({
      ...validProductTimerForm,
      productStyle: "invalid_style",
    });
    expect(errors.productStyle).toBeDefined();
  });

  it("accepts valid productStyle values", () => {
    for (const style of ["minimal", "card", "badge", "banner", "floating"]) {
      const errors = validateCampaignForm({
        ...validProductTimerForm,
        productStyle: style,
      });
      expect(errors.productStyle).toBeUndefined();
    }
  });

  it("validates labelText max length", () => {
    const errors = validateCampaignForm({
      ...validProductTimerForm,
      labelText: "x".repeat(101),
    });
    expect(errors.labelText).toBeDefined();
  });

  it("accepts labelText within limit", () => {
    const errors = validateCampaignForm({
      ...validProductTimerForm,
      labelText: "x".repeat(100),
    });
    expect(errors.labelText).toBeUndefined();
  });

  it("catches start date after end date", () => {
    const errors = validateCampaignForm({
      ...validBarForm,
      timerType: "one_time",
      startDate: "2030-12-31T23:59",
      endDate: "2030-01-01T00:00",
    });
    expect(errors.startDate).toBeDefined();
  });
});

describe("PRODUCT_TIMER_DEFAULTS completeness", () => {
  it("includes barColor and fontFamily", () => {
    expect(PRODUCT_TIMER_DEFAULTS.barColor).toBe("");
    expect(PRODUCT_TIMER_DEFAULTS.fontFamily).toBe("system");
  });

  it("includes all required fields", () => {
    expect(PRODUCT_TIMER_DEFAULTS.productStyle).toBe("minimal");
    expect(PRODUCT_TIMER_DEFAULTS.accentColor).toBe("#dc2626");
    expect(PRODUCT_TIMER_DEFAULTS.labelText).toBe("Sale ends in");
    expect(PRODUCT_TIMER_DEFAULTS.barIcon).toBe("");
    expect(PRODUCT_TIMER_DEFAULTS.textColor).toBe("#333333");
  });
});

describe("validateCampaignForm hex validation", () => {
  const base = {
    type: "product_timer",
    timerType: "daily",
    endAction: "hide",
    productStyle: "minimal",
  };

  it("rejects invalid accentColor", () => {
    const errors = validateCampaignForm({ ...base, accentColor: "not-a-hex" });
    expect(errors.accentColor).toBeDefined();
  });

  it("accepts valid accentColor", () => {
    const errors = validateCampaignForm({ ...base, accentColor: "#dc2626" });
    expect(errors.accentColor).toBeUndefined();
  });

  it("rejects invalid textColor", () => {
    const errors = validateCampaignForm({ ...base, textColor: "rgb(0,0,0)" });
    expect(errors.textColor).toBeDefined();
  });

  it("rejects invalid barColor when provided", () => {
    const errors = validateCampaignForm({ ...base, barColor: "blue" });
    expect(errors.barColor).toBeDefined();
  });

  it("allows empty barColor", () => {
    const errors = validateCampaignForm({ ...base, barColor: "" });
    expect(errors.barColor).toBeUndefined();
  });
});

describe("validateCampaignForm dailyResetTime", () => {
  const base = {
    type: "bar",
    barMessage: "Sale!",
    timerType: "daily",
    endAction: "hide",
  };

  it("accepts valid HH:MM format", () => {
    const errors = validateCampaignForm({ ...base, dailyResetTime: "14:30" });
    expect(errors.dailyResetTime).toBeUndefined();
  });

  it("rejects invalid format", () => {
    const errors = validateCampaignForm({ ...base, dailyResetTime: "2pm" });
    expect(errors.dailyResetTime).toBeDefined();
  });
});

describe("validateCampaignForm isEditing flag", () => {
  it("skips end-date-in-future check when isEditing is true", () => {
    const errors = validateCampaignForm(
      {
        type: "bar",
        barMessage: "Sale!",
        timerType: "one_time",
        endDate: "2020-01-01T00:00",
        endAction: "hide",
      },
      { isEditing: true }
    );
    expect(errors.endDate).toBeUndefined();
  });

  it("enforces end-date-in-future check when isEditing is false", () => {
    const errors = validateCampaignForm(
      {
        type: "bar",
        barMessage: "Sale!",
        timerType: "one_time",
        endDate: "2020-01-01T00:00",
        endAction: "hide",
      },
      { isEditing: false }
    );
    expect(errors.endDate).toBeDefined();
  });
});

describe("isLightColor", () => {
  it("returns true for white", () => {
    expect(isLightColor("#ffffff")).toBe(true);
  });

  it("returns false for black", () => {
    expect(isLightColor("#000000")).toBe(false);
  });

  it("returns true for null/empty", () => {
    expect(isLightColor(null)).toBe(true);
    expect(isLightColor("")).toBe(true);
  });
});

describe("getDefaultsForType", () => {
  it("returns BAR_DEFAULTS with white text for bar type", () => {
    const defaults = getDefaultsForType("bar");
    expect(defaults.textColor).toBe(BAR_DEFAULTS.textColor);
    expect(defaults.textColor).toBe("#ffffff");
    expect(defaults.barColor).toBe(BAR_DEFAULTS.barColor);
  });

  it("returns PRODUCT_TIMER_DEFAULTS with dark text for product_timer type", () => {
    const defaults = getDefaultsForType("product_timer");
    expect(defaults.textColor).toBe(PRODUCT_TIMER_DEFAULTS.textColor);
    expect(defaults.textColor).toBe("#333333");
    expect(defaults.accentColor).toBe(PRODUCT_TIMER_DEFAULTS.accentColor);
  });

  it("defaults to bar when type is undefined", () => {
    const defaults = getDefaultsForType(undefined);
    expect(defaults.textColor).toBe("#ffffff");
  });
});

describe("validateCampaignForm gradient colors", () => {
  const base = {
    type: "bar",
    barMessage: "Sale!",
    timerType: "daily",
    endAction: "hide",
    bgType: "gradient",
  };

  it("rejects invalid gradientColor1", () => {
    const errors = validateCampaignForm({ ...base, gradientColor1: "not-hex" });
    expect(errors.gradientColor1).toBeDefined();
  });

  it("rejects invalid gradientColor2", () => {
    const errors = validateCampaignForm({ ...base, gradientColor2: "rgb(0,0,0)" });
    expect(errors.gradientColor2).toBeDefined();
  });

  it("accepts valid gradient colors", () => {
    const errors = validateCampaignForm({
      ...base,
      gradientColor1: "#ff0000",
      gradientColor2: "#0000ff",
    });
    expect(errors.gradientColor1).toBeUndefined();
    expect(errors.gradientColor2).toBeUndefined();
  });

  it("skips gradient validation when bgType is solid", () => {
    const errors = validateCampaignForm({
      ...base,
      bgType: "solid",
      gradientColor1: "not-hex",
    });
    expect(errors.gradientColor1).toBeUndefined();
  });
});

describe("validateCampaignForm evergreenMinutes range", () => {
  const base = {
    type: "bar",
    barMessage: "Sale!",
    timerType: "evergreen",
    endAction: "hide",
  };

  it("rejects 0 minutes", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "0" });
    expect(errors.evergreenMinutes).toBeDefined();
  });

  it("rejects negative minutes", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "-10" });
    expect(errors.evergreenMinutes).toBeDefined();
  });

  it("rejects over 1440 minutes", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "1441" });
    expect(errors.evergreenMinutes).toBeDefined();
  });

  it("accepts 1 minute", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "1" });
    expect(errors.evergreenMinutes).toBeUndefined();
  });

  it("accepts 1440 minutes", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "1440" });
    expect(errors.evergreenMinutes).toBeUndefined();
  });

  it("rejects non-numeric value", () => {
    const errors = validateCampaignForm({ ...base, evergreenMinutes: "abc" });
    expect(errors.evergreenMinutes).toBeDefined();
  });
});

describe("validateCampaignForm field length limits", () => {
  const base = {
    type: "bar",
    barMessage: "Sale!",
    timerType: "daily",
    endAction: "hide",
  };

  it("rejects buttonText over 60 characters", () => {
    const errors = validateCampaignForm({ ...base, buttonText: "x".repeat(61) });
    expect(errors.buttonText).toBeDefined();
  });

  it("accepts buttonText at 60 characters", () => {
    const errors = validateCampaignForm({ ...base, buttonText: "x".repeat(60) });
    expect(errors.buttonText).toBeUndefined();
  });

  it("rejects discountCode over 30 characters", () => {
    const errors = validateCampaignForm({ ...base, discountCode: "x".repeat(31) });
    expect(errors.discountCode).toBeDefined();
  });

  it("accepts discountCode at 30 characters", () => {
    const errors = validateCampaignForm({ ...base, discountCode: "x".repeat(30) });
    expect(errors.discountCode).toBeUndefined();
  });
});
