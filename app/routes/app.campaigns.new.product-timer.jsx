import { Page, Layout, BlockStack, Banner, Card, FormLayout, TextField } from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation, useRouteError } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { canCreateCampaign } from "../utils/billing.server";
import {
  PRODUCT_TIMER_DEFAULTS,
  DEFAULT_CAMPAIGN_FORM,
  formValuesToCampaignData,
  validateCampaignForm,
  isValidHex,
  CAMPAIGN_TYPES,
} from "../utils/campaign";
import { ProductTimerPreview } from "../components/ProductTimerPreview";
import {
  TimerScheduleSection,
  EndActionSection,
  ProductTargetingSection,
  ProductTimerDesignSection,
} from "../components/CampaignFormSections";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ settings: { ...PRODUCT_TIMER_DEFAULTS } });
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
    type: CAMPAIGN_TYPES.PRODUCT_TIMER,
    name: String(formData.get("name") || "").trim() || "My Sale",
    timerType: String(formData.get("timerType") || "one_time"),
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    timezone: String(formData.get("timezone") || "UTC").trim(),
    dailyResetTime: String(formData.get("dailyResetTime") || "00:00").trim(),
    evergreenMinutes: String(formData.get("evergreenMinutes") || "30").trim(),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
    targetType: String(formData.get("targetType") || "all"),
    targetProductIds: String(formData.get("targetProductIds") || "[]"),
    targetCollectionIds: String(formData.get("targetCollectionIds") || "[]"),
    targetTags: String(formData.get("targetTags") || "[]"),
    priority: String(formData.get("priority") || "0"),
    productStyle: String(formData.get("productStyle") || "minimal"),
    accentColor: String(formData.get("accentColor") || "#dc2626"),
    labelText: String(formData.get("labelText") || "Sale ends in"),
    barIcon: String(formData.get("barIcon") || ""),
    barColor: String(formData.get("barColor") || "").trim(),
    textColor: String(formData.get("textColor") || "#333333").trim(),
    barMessage: "",
    buttonText: "",
    buttonLink: "",
    discountCode: "",
    buttonTextColor: DEFAULT_CAMPAIGN_FORM.buttonTextColor,
    buttonBgColor: DEFAULT_CAMPAIGN_FORM.buttonBgColor,
    fontFamily: String(formData.get("fontFamily") || "system"),
    animationStyle: "none",
    bgType: "solid",
    gradientDirection: "to right",
    gradientColor1: "#667eea",
    gradientColor2: "#764ba2",
    barPosition: "top",
    pageTargeting: '{"mode":"all"}',
  };

  const errors = validateCampaignForm(raw);
  if (!isValidHex(raw.accentColor)) raw.accentColor = "#dc2626";
  if (raw.textColor && !isValidHex(raw.textColor)) raw.textColor = "#333333";
  if (raw.barColor && !isValidHex(raw.barColor)) raw.barColor = "";

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  const campaignData = formValuesToCampaignData(raw);
  campaignData.type = CAMPAIGN_TYPES.PRODUCT_TIMER;

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

export default function NewProductTimerCampaignPage() {
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
      title="New Product Timer"
    >
      <TitleBar title="Create Product Timer">
        <button
          variant="primary"
          loading={isSubmitting ? "" : undefined}
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
                      placeholder="Summer Product Sale"
                      helpText="Internal name to identify this campaign."
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <TimerScheduleSection
                formState={formState}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
              />
              <ProductTimerDesignSection formState={formState} handleChange={handleChange} />
              <ProductTargetingSection formState={formState} handleChange={handleChange} />
              <EndActionSection
                formState={formState}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
              />
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <ProductTimerPreview formState={formState} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
