import {
  Card,
  Page,
  Layout,
  FormLayout,
  TextField,
  Text,
  BlockStack,
  Toast,
  Frame,
  Select,
  Banner,
  ContextualSaveBar,
} from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import {
  DEFAULT_CAMPAIGN_FORM,
  campaignToFormValues,
  formValuesToCampaignData,
  validateCampaignForm,
  isValidHex,
  TIMEZONE_OPTIONS,
  FONT_OPTIONS,
  ANIMATION_OPTIONS,
  GRADIENT_DIRECTIONS,
  PAGE_TARGETING_MODES,
} from "../utils/campaign";
import { ColorPickerField } from "../components/ColorPickerField";
import { TimerPreview } from "../components/TimerPreview";
import { TemplateSelector } from "../components/TemplateSelector";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const campaignId = Number(params.id);

  if (isNaN(campaignId)) {
    throw new Response("Invalid campaign ID", { status: 400 });
  }

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, shop },
  });

  if (!campaign) {
    throw new Response("Campaign not found", { status: 404 });
  }

  return json({
    campaign: { id: campaign.id, name: campaign.name, isActive: campaign.isActive },
    settings: campaignToFormValues(campaign),
  });
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const campaignId = Number(params.id);

  if (isNaN(campaignId)) {
    return json({ success: false, errors: { _form: "Invalid campaign ID" } }, { status: 400 });
  }

  const existing = await db.campaign.findFirst({ where: { id: campaignId, shop } });
  if (!existing) {
    return json({ success: false, errors: { _form: "Campaign not found" } }, { status: 404 });
  }

  const formData = await request.formData();
  const raw = {
    name: String(formData.get("name") || "").trim() || "My Sale",
    barMessage: String(formData.get("barMessage") || "").trim(),
    buttonText: String(formData.get("buttonText") || "").trim(),
    buttonLink: String(formData.get("buttonLink") || "").trim(),
    discountCode: String(formData.get("discountCode") || "").trim(),
    timerType: String(formData.get("timerType") || "one_time"),
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    timezone: String(formData.get("timezone") || "UTC").trim(),
    dailyResetTime: String(formData.get("dailyResetTime") || "00:00").trim(),
    evergreenMinutes: String(formData.get("evergreenMinutes") || "30").trim(),
    barColor: String(formData.get("barColor") || DEFAULT_CAMPAIGN_FORM.barColor).trim(),
    textColor: String(formData.get("textColor") || DEFAULT_CAMPAIGN_FORM.textColor).trim(),
    buttonTextColor: String(
      formData.get("buttonTextColor") || DEFAULT_CAMPAIGN_FORM.buttonTextColor
    ).trim(),
    buttonBgColor: String(
      formData.get("buttonBgColor") || DEFAULT_CAMPAIGN_FORM.buttonBgColor
    ).trim(),
    fontFamily: String(formData.get("fontFamily") || "system"),
    animationStyle: String(formData.get("animationStyle") || "none"),
    bgType: String(formData.get("bgType") || "solid"),
    gradientDirection: String(formData.get("gradientDirection") || "to right"),
    gradientColor1: String(formData.get("gradientColor1") || "#667eea"),
    gradientColor2: String(formData.get("gradientColor2") || "#764ba2"),
    barPosition: String(formData.get("barPosition") || "top"),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
    pageTargeting: String(formData.get("pageTargeting") || "[]"),
  };

  const errors = validateCampaignForm(raw);
  if (!isValidHex(raw.barColor)) raw.barColor = DEFAULT_CAMPAIGN_FORM.barColor;
  if (!isValidHex(raw.textColor)) raw.textColor = DEFAULT_CAMPAIGN_FORM.textColor;
  if (!isValidHex(raw.buttonTextColor)) raw.buttonTextColor = DEFAULT_CAMPAIGN_FORM.buttonTextColor;
  if (!isValidHex(raw.buttonBgColor)) raw.buttonBgColor = DEFAULT_CAMPAIGN_FORM.buttonBgColor;

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: formValuesToCampaignData(raw),
  });

  return json({ success: true, settings: raw });
};

export default function CampaignEditPage() {
  const { campaign, settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const formRef = useRef(null);

  const initialState = { ...settings, name: campaign.name };
  const [formState, setFormState] = useState(initialState);
  const [savedState, setSavedState] = useState(initialState);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastIsError, setToastIsError] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.errors || {};
  const isDirty = JSON.stringify(formState) !== JSON.stringify(savedState);

  useEffect(() => {
    if (actionData?.errors && actionData.values) {
      setFormState({ ...actionData.values });
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.success) {
      setSavedState({ ...formState });
      setToastMessage("Campaign saved!");
      setToastIsError(false);
      setShowToast(true);
    } else if (actionData?.success === false && !actionData?.errors) {
      setToastMessage("Failed to save. Please try again.");
      setToastIsError(true);
      setShowToast(true);
    }
  }, [actionData]);

  const handleChange = useCallback((field, value) => {
    setFormState((s) => ({ ...s, [field]: value }));
  }, []);

  const handleDiscard = useCallback(() => {
    setFormState({ ...savedState });
  }, [savedState]);

  return (
    <Frame>
      {isDirty && (
        <ContextualSaveBar
          message="Unsaved changes"
          saveAction={{
            onAction: () => formRef.current?.requestSubmit(),
            loading: isSubmitting,
            disabled: isSubmitting,
          }}
          discardAction={{
            onAction: handleDiscard,
          }}
        />
      )}
      <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }} title={campaign.name}>
        <TitleBar title={`Edit: ${campaign.name}`} />

        <Layout>
          {/* Editor — Primary */}
          <Layout.Section>
            <Form method="post" ref={formRef}>
              <BlockStack gap="400">
                {fieldErrors._form && (
                  <Banner tone="critical">
                    <p>{fieldErrors._form}</p>
                  </Banner>
                )}

                {Object.keys(fieldErrors).filter((k) => k !== "_form").length > 0 && (
                  <Banner tone="critical" title="Please fix the following errors:">
                    <ul>
                      {Object.entries(fieldErrors)
                        .filter(([k]) => k !== "_form")
                        .map(([, msg], i) => (
                          <li key={i}>{msg}</li>
                        ))}
                    </ul>
                  </Banner>
                )}

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Campaign Details
                    </Text>
                    <FormLayout>
                      <TextField
                        label="Campaign Name"
                        value={formState.name}
                        onChange={(v) => handleChange("name", v)}
                        name="name"
                        placeholder="My Sale"
                        helpText="Internal name to identify this campaign."
                        autoComplete="off"
                      />
                      <TextField
                        label="Bar Message Text"
                        value={formState.barMessage}
                        onChange={(v) => handleChange("barMessage", v)}
                        name="barMessage"
                        placeholder="Flash Sale Ends In..."
                        helpText="The main message displayed in the countdown bar (max 200 characters)."
                        maxLength={200}
                        showCharacterCount
                        autoComplete="off"
                        error={fieldErrors.barMessage}
                      />
                      <Select
                        label="Timer Type"
                        options={[
                          { label: "One-time countdown (fixed end date)", value: "one_time" },
                          { label: "Daily recurring (resets every day)", value: "daily" },
                          { label: "Evergreen (per-visitor timer)", value: "evergreen" },
                        ]}
                        value={formState.timerType}
                        onChange={(v) => handleChange("timerType", v)}
                        name="timerType"
                        helpText="Choose how the countdown timer behaves."
                      />
                      <Select
                        label="Timezone"
                        options={TIMEZONE_OPTIONS}
                        value={formState.timezone}
                        onChange={(v) => handleChange("timezone", v)}
                        name="timezone"
                        helpText="Dates are interpreted in this timezone and stored as UTC."
                      />
                      {formState.timerType === "one_time" && (
                        <>
                          <TextField
                            label="Start Date & Time (optional)"
                            value={formState.startDate}
                            onChange={(v) => handleChange("startDate", v)}
                            type="datetime-local"
                            name="startDate"
                            helpText="Leave empty to start immediately. Use this to schedule campaigns in advance."
                            error={fieldErrors.startDate}
                          />
                          <TextField
                            label="End Date & Time"
                            value={formState.endDate}
                            onChange={(v) => handleChange("endDate", v)}
                            type="datetime-local"
                            name="endDate"
                            helpText="When your sale ends. Must be in the future."
                            error={fieldErrors.endDate}
                          />
                        </>
                      )}
                      {formState.timerType === "daily" && (
                        <TextField
                          label="Daily Reset Time"
                          value={formState.dailyResetTime}
                          onChange={(v) => handleChange("dailyResetTime", v)}
                          type="time"
                          name="dailyResetTime"
                          helpText="The timer resets at this time every day in the selected timezone."
                        />
                      )}
                      {formState.timerType === "evergreen" && (
                        <TextField
                          label="Timer Duration (minutes)"
                          value={formState.evergreenMinutes}
                          onChange={(v) => handleChange("evergreenMinutes", v)}
                          type="number"
                          name="evergreenMinutes"
                          min="1"
                          max="1440"
                          helpText="Each visitor gets a personal countdown starting from their first visit. Timer only shows once per visitor."
                        />
                      )}
                    </FormLayout>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Call-to-Action Button
                    </Text>
                    <FormLayout>
                      <TextField
                        label="Button Text"
                        value={formState.buttonText}
                        onChange={(v) => handleChange("buttonText", v)}
                        name="buttonText"
                        placeholder="Shop Now"
                        helpText="Leave blank to hide the button."
                        autoComplete="off"
                      />
                      <TextField
                        label="Button Link"
                        value={formState.buttonLink}
                        onChange={(v) => handleChange("buttonLink", v)}
                        name="buttonLink"
                        placeholder="/collections/all"
                        helpText="Relative path (e.g. /collections/sale) or full URL."
                        autoComplete="off"
                        error={fieldErrors.buttonLink}
                      />
                      <TextField
                        label="Discount Code (optional)"
                        value={formState.discountCode}
                        onChange={(v) => handleChange("discountCode", v)}
                        name="discountCode"
                        placeholder="SAVE20"
                        helpText="Display a promo code with a copy button. Leave empty to hide."
                        autoComplete="off"
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Design
                    </Text>
                    <TemplateSelector
                      onSelect={(t) => {
                        handleChange("barColor", t.barColor);
                        handleChange("textColor", t.textColor);
                        handleChange("buttonBgColor", t.buttonBgColor);
                        handleChange("buttonTextColor", t.buttonTextColor);
                      }}
                    />
                    <ColorPickerField
                      label="Bar Background Color"
                      value={formState.barColor}
                      onChange={(v) => handleChange("barColor", v)}
                      name="barColor"
                    />
                    <ColorPickerField
                      label="Text Color"
                      value={formState.textColor}
                      onChange={(v) => handleChange("textColor", v)}
                      name="textColor"
                    />
                    <ColorPickerField
                      label="Button Background Color"
                      value={formState.buttonBgColor}
                      onChange={(v) => handleChange("buttonBgColor", v)}
                      name="buttonBgColor"
                    />
                    <ColorPickerField
                      label="Button Text Color"
                      value={formState.buttonTextColor}
                      onChange={(v) => handleChange("buttonTextColor", v)}
                      name="buttonTextColor"
                    />
                    <Select
                      label="Bar Position"
                      options={[
                        { label: "Top of page", value: "top" },
                        { label: "Bottom of page", value: "bottom" },
                      ]}
                      value={formState.barPosition}
                      onChange={(v) => handleChange("barPosition", v)}
                      name="barPosition"
                    />
                    <Select
                      label="Font Family"
                      options={FONT_OPTIONS}
                      value={formState.fontFamily}
                      onChange={(v) => handleChange("fontFamily", v)}
                      name="fontFamily"
                      helpText="Web-safe fonts — no external loading, zero performance impact."
                    />
                    <Select
                      label="Digit Animation"
                      options={ANIMATION_OPTIONS}
                      value={formState.animationStyle}
                      onChange={(v) => handleChange("animationStyle", v)}
                      name="animationStyle"
                      helpText="Animation effect when countdown digits change."
                    />
                    <Select
                      label="Background Type"
                      options={[
                        { label: "Solid color", value: "solid" },
                        { label: "Gradient", value: "gradient" },
                      ]}
                      value={formState.bgType}
                      onChange={(v) => handleChange("bgType", v)}
                      name="bgType"
                    />
                    {formState.bgType === "gradient" && (
                      <>
                        <Select
                          label="Gradient Direction"
                          options={GRADIENT_DIRECTIONS}
                          value={formState.gradientDirection}
                          onChange={(v) => handleChange("gradientDirection", v)}
                          name="gradientDirection"
                        />
                        <ColorPickerField
                          label="Gradient Start Color"
                          value={formState.gradientColor1}
                          onChange={(v) => handleChange("gradientColor1", v)}
                          name="gradientColor1"
                        />
                        <ColorPickerField
                          label="Gradient End Color"
                          value={formState.gradientColor2}
                          onChange={(v) => handleChange("gradientColor2", v)}
                          name="gradientColor2"
                        />
                      </>
                    )}
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Page Targeting
                    </Text>
                    <Select
                      label="Display mode"
                      options={PAGE_TARGETING_MODES}
                      value={(() => {
                        try {
                          const parsed = JSON.parse(formState.pageTargeting || "{}");
                          return parsed.mode || "all";
                        } catch {
                          return "all";
                        }
                      })()}
                      onChange={(mode) => {
                        if (mode === "all") {
                          handleChange("pageTargeting", JSON.stringify({ mode: "all" }));
                        } else {
                          const current = (() => {
                            try {
                              return JSON.parse(formState.pageTargeting || "{}");
                            } catch {
                              return {};
                            }
                          })();
                          handleChange(
                            "pageTargeting",
                            JSON.stringify({ mode, patterns: current.patterns || [] })
                          );
                        }
                      }}
                      helpText="Control which pages show the countdown timer."
                    />
                    {(() => {
                      try {
                        const parsed = JSON.parse(formState.pageTargeting || "{}");
                        if (parsed.mode === "include" || parsed.mode === "exclude") {
                          return (
                            <TextField
                              label={
                                parsed.mode === "include"
                                  ? "Show only on these URLs"
                                  : "Hide on these URLs"
                              }
                              value={(parsed.patterns || []).join("\n")}
                              onChange={(v) => {
                                const patterns = v
                                  .split("\n")
                                  .map((p) => p.trim())
                                  .filter(Boolean);
                                handleChange(
                                  "pageTargeting",
                                  JSON.stringify({ mode: parsed.mode, patterns })
                                );
                              }}
                              multiline={3}
                              placeholder={"/collections/*\n/products/sale-item\n/pages/deals"}
                              helpText="One URL pattern per line. Use * as wildcard (e.g. /collections/* matches all collections)."
                              autoComplete="off"
                            />
                          );
                        }
                        return null;
                      } catch {
                        return null;
                      }
                    })()}
                    <input
                      type="hidden"
                      name="pageTargeting"
                      value={formState.pageTargeting || '{"mode":"all"}'}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      When the Countdown Ends
                    </Text>
                    <FormLayout>
                      <Select
                        label="Action"
                        options={[
                          { label: "Hide the bar", value: "hide" },
                          { label: 'Show "Sale Ended" message', value: "show_ended" },
                          { label: "Show custom message", value: "show_custom" },
                        ]}
                        value={formState.endAction}
                        onChange={(v) => handleChange("endAction", v)}
                        helpText="What should happen when the countdown reaches zero?"
                      />
                      <input type="hidden" name="endAction" value={formState.endAction} />
                      {formState.endAction === "show_custom" && (
                        <TextField
                          label="Custom End Message"
                          value={formState.customEndMessage || ""}
                          onChange={(v) => handleChange("customEndMessage", v)}
                          name="customEndMessage"
                          placeholder="Thanks for shopping with us!"
                          helpText="This message will replace the countdown when it ends."
                          autoComplete="off"
                          error={fieldErrors.customEndMessage}
                        />
                      )}
                    </FormLayout>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Form>
          </Layout.Section>

          {/* Live Preview — Secondary */}
          <Layout.Section variant="oneThird">
            <div
              style={{
                position: "sticky",
                top: "0px",
                alignSelf: "flex-start",
                maxHeight: "100vh",
                overflowY: "auto",
              }}
            >
              <TimerPreview formState={formState} />
            </div>
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast
            content={toastMessage}
            error={toastIsError}
            onDismiss={() => setShowToast(false)}
            duration={4000}
          />
        )}
      </Page>
    </Frame>
  );
}
