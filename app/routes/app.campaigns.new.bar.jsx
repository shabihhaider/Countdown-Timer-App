import { Page, Layout, BlockStack, Banner, Card, FormLayout, TextField } from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation, useRouteError } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { canCreateCampaign } from "../utils/billing.server";
import {
  BAR_DEFAULTS,
  formValuesToCampaignData,
  validateCampaignForm,
  isValidHex,
  CAMPAIGN_TYPES,
} from "../utils/campaign";
import { TimerPreview } from "../components/TimerPreview";
import {
  TimerScheduleSection,
  EndActionSection,
  PageTargetingSection,
  BarDesignSection,
  BarContentSection,
} from "../components/CampaignFormSections";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ settings: { ...BAR_DEFAULTS } });
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const activeCampaigns = await db.campaign.count({ where: { shop, isActive: true } });
  const { allowed, reason } = await canCreateCampaign(billing, activeCampaigns);

  if (!allowed) {
    return json({ success: false, errors: { _form: reason }, values: null }, { status: 403 });
  }

  const formData = await request.formData();
  const raw = {
    type: CAMPAIGN_TYPES.BAR,
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
    barColor: String(formData.get("barColor") || BAR_DEFAULTS.barColor).trim(),
    textColor: String(formData.get("textColor") || BAR_DEFAULTS.textColor).trim(),
    buttonTextColor: String(formData.get("buttonTextColor") || BAR_DEFAULTS.buttonTextColor).trim(),
    buttonBgColor: String(formData.get("buttonBgColor") || BAR_DEFAULTS.buttonBgColor).trim(),
    barIcon: String(formData.get("barIcon") || ""),
    fontFamily: String(formData.get("fontFamily") || "system"),
    animationStyle: String(formData.get("animationStyle") || "none"),
    bgType: String(formData.get("bgType") || "solid"),
    gradientDirection: String(formData.get("gradientDirection") || "to right"),
    gradientColor1: String(formData.get("gradientColor1") || "#667eea"),
    gradientColor2: String(formData.get("gradientColor2") || "#764ba2"),
    barPosition: String(formData.get("barPosition") || "top"),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
    pageTargeting: String(formData.get("pageTargeting") || '{"mode":"all"}'),
    targetType: "all",
    targetProductIds: "[]",
    targetCollectionIds: "[]",
    targetTags: "[]",
    priority: String(formData.get("priority") || "0"),
  };

  const errors = validateCampaignForm(raw);
  if (!isValidHex(raw.barColor)) raw.barColor = BAR_DEFAULTS.barColor;
  if (!isValidHex(raw.textColor)) raw.textColor = BAR_DEFAULTS.textColor;
  if (!isValidHex(raw.buttonTextColor)) raw.buttonTextColor = BAR_DEFAULTS.buttonTextColor;
  if (!isValidHex(raw.buttonBgColor)) raw.buttonBgColor = BAR_DEFAULTS.buttonBgColor;

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  const campaignData = formValuesToCampaignData(raw);
  campaignData.type = CAMPAIGN_TYPES.BAR;

  const campaign = await db.campaign.create({
    data: { ...campaignData, shop, isActive: true },
  });

  await db.onboardingState.upsert({
    where: { shop },
    create: { shop, step1Complete: true, step2Complete: true },
    update: { step1Complete: true, step2Complete: true },
  });

  return redirect(`/app/campaigns/${campaign.id}`);
};

export function ErrorBoundary() {
  useRouteError();
  return (
    <Page title="Error">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Banner tone="critical">
                <p>Something went wrong loading this page. Please try again.</p>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default function NewBarCampaignPage() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const formRef = useRef(null);

  const [formState, setFormState] = useState(settings);

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.errors || {};

  useEffect(() => {
    if (formState.timezone === "UTC") {
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz && browserTz !== "UTC") {
          setFormState((s) => ({ ...s, timezone: browserTz }));
        }
      } catch {}
    }
    // Run once on mount only: re-running when timezone changes would override
    // an explicit merchant choice of UTC with the browser timezone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (actionData?.errors && actionData.values) {
      setFormState({ ...actionData.values });
    }
  }, [actionData]);

  const handleChange = useCallback((field, value) => {
    setFormState((s) => ({ ...s, [field]: value }));
  }, []);

  return (
    <Page
      backAction={{ content: "Choose Type", url: "/app/campaigns/new" }}
      title="New Announcement Bar"
    >
      <TitleBar title="Create Announcement Bar">
        <button
          variant="primary"
          disabled={isSubmitting}
          onClick={() => formRef.current?.requestSubmit()}
        >
          {isSubmitting ? "Creating..." : "Create Campaign"}
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Form method="post" ref={formRef}>
            <BlockStack gap="400">
              {Object.keys(fieldErrors).length > 0 && (
                <Banner tone="critical" title="Please fix the following errors:">
                  <ul>
                    {Object.values(fieldErrors).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
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
                  </FormLayout>
                </BlockStack>
              </Card>

              <BarContentSection
                formState={formState}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
              />
              <TimerScheduleSection
                formState={formState}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
              />
              <BarDesignSection formState={formState} handleChange={handleChange} />
              <PageTargetingSection formState={formState} handleChange={handleChange} />
              <EndActionSection
                formState={formState}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
              />
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <TimerPreview formState={formState} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
