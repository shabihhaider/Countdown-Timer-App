import {
  Card,
  Page,
  Layout,
  FormLayout,
  TextField,
  BlockStack,
  Toast,
  Frame,
  Banner,
  Button,
  ContextualSaveBar,
} from "@shopify/polaris";
import { useState, useEffect, useCallback, useRef } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation, useRouteError } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import {
  BAR_DEFAULTS,
  PRODUCT_TIMER_DEFAULTS,
  CAMPAIGN_TYPES,
  CAMPAIGN_TYPE_LABELS,
  campaignToFormValues,
  formValuesToCampaignData,
  validateCampaignForm,
  isValidHex,
  getDefaultsForType,
} from "../utils/campaign";
import { TimerPreview } from "../components/TimerPreview";
import { ProductTimerPreview } from "../components/ProductTimerPreview";
import {
  TimerScheduleSection,
  EndActionSection,
  ProductTargetingSection,
  PageTargetingSection,
  BarDesignSection,
  BarContentSection,
  ProductTimerDesignSection,
} from "../components/CampaignFormSections";

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
    campaign: {
      id: campaign.id,
      name: campaign.name,
      isActive: campaign.isActive,
      type: campaign.type || CAMPAIGN_TYPES.BAR,
    },
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
    type: existing.type || CAMPAIGN_TYPES.BAR,
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
    barColor: String(formData.get("barColor") ?? "").trim(),
    textColor: String(
      formData.get("textColor") || getDefaultsForType(existing.type).textColor
    ).trim(),
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
    targetType: String(formData.get("targetType") || "all"),
    targetProductIds: String(formData.get("targetProductIds") || "[]"),
    targetCollectionIds: String(formData.get("targetCollectionIds") || "[]"),
    targetTags: String(formData.get("targetTags") || "[]"),
    priority: String(formData.get("priority") || "0"),
    productStyle: String(formData.get("productStyle") || "minimal"),
    accentColor: String(formData.get("accentColor") || "#dc2626"),
    labelText: String(formData.get("labelText") || "Sale ends in"),
  };

  const defaults = getDefaultsForType(existing.type);
  const errors = validateCampaignForm(raw, { isEditing: true });
  if (raw.barColor && !isValidHex(raw.barColor)) raw.barColor = defaults.barColor || "";
  if (!isValidHex(raw.textColor)) raw.textColor = defaults.textColor;
  if (!isValidHex(raw.buttonTextColor)) raw.buttonTextColor = BAR_DEFAULTS.buttonTextColor;
  if (!isValidHex(raw.buttonBgColor)) raw.buttonBgColor = BAR_DEFAULTS.buttonBgColor;
  if (!isValidHex(raw.accentColor)) raw.accentColor = PRODUCT_TIMER_DEFAULTS.accentColor;

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  await db.campaign.updateMany({
    where: { id: campaignId, shop },
    data: formValuesToCampaignData(raw),
  });

  return json({ success: true, settings: raw });
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
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function BarEditForm({ formState, handleChange, fieldErrors }) {
  return (
    <>
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
    </>
  );
}

function ProductTimerEditForm({ formState, handleChange, fieldErrors }) {
  return (
    <>
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
    </>
  );
}

export default function CampaignEditPage() {
  const { campaign, settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const formRef = useRef(null);

  const campaignType = campaign.type || CAMPAIGN_TYPES.BAR;
  // eslint-disable-next-line security/detect-object-injection -- lookup into a constant label map with fallback
  const typeLabel = CAMPAIGN_TYPE_LABELS[campaignType] || "Campaign";

  const initialState = { ...settings, name: campaign.name };
  const [formState, setFormState] = useState(initialState);
  const [savedState, setSavedState] = useState(initialState);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastIsError, setToastIsError] = useState(false);
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

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
      setSavedState({ ...formStateRef.current });
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
          discardAction={{ onAction: handleDiscard }}
        />
      )}
      <Page
        backAction={{ content: "Campaigns", url: "/app/campaigns" }}
        title={campaign.name}
        subtitle={typeLabel}
      >
        <TitleBar title={`Edit: ${campaign.name}`} />
        <Layout>
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

                {campaignType === CAMPAIGN_TYPES.PRODUCT_TIMER ? (
                  <ProductTimerEditForm
                    formState={formState}
                    handleChange={handleChange}
                    fieldErrors={fieldErrors}
                  />
                ) : (
                  <BarEditForm
                    formState={formState}
                    handleChange={handleChange}
                    fieldErrors={fieldErrors}
                  />
                )}
              </BlockStack>
            </Form>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {campaignType === CAMPAIGN_TYPES.PRODUCT_TIMER ? (
              <ProductTimerPreview formState={formState} />
            ) : (
              <TimerPreview formState={formState} />
            )}
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
