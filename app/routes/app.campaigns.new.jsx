import {
  Card,
  Page,
  Layout,
  FormLayout,
  TextField,
  Text,
  InlineStack,
  BlockStack,
  Button,
  Toast,
  Frame,
  Select,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import {
  DEFAULT_CAMPAIGN_FORM,
  formValuesToCampaignData,
  validateCampaignForm,
  isValidHex,
  TIMEZONE_OPTIONS,
} from "../utils/campaign";
import { ColorPickerField } from "../components/ColorPickerField";
import { TimerPreview } from "../components/TimerPreview";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ settings: { ...DEFAULT_CAMPAIGN_FORM } });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const raw = {
    name: String(formData.get("name") || "").trim() || "My Sale",
    barMessage: String(formData.get("barMessage") || "").trim(),
    buttonText: String(formData.get("buttonText") || "").trim(),
    buttonLink: String(formData.get("buttonLink") || "").trim(),
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    timezone: String(formData.get("timezone") || "UTC").trim(),
    barColor: String(formData.get("barColor") || DEFAULT_CAMPAIGN_FORM.barColor).trim(),
    textColor: String(formData.get("textColor") || DEFAULT_CAMPAIGN_FORM.textColor).trim(),
    buttonTextColor: String(
      formData.get("buttonTextColor") || DEFAULT_CAMPAIGN_FORM.buttonTextColor
    ).trim(),
    buttonBgColor: String(
      formData.get("buttonBgColor") || DEFAULT_CAMPAIGN_FORM.buttonBgColor
    ).trim(),
    barPosition: String(formData.get("barPosition") || "top"),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
  };

  const errors = validateCampaignForm(raw);
  if (!isValidHex(raw.barColor)) raw.barColor = DEFAULT_CAMPAIGN_FORM.barColor;
  if (!isValidHex(raw.textColor)) raw.textColor = DEFAULT_CAMPAIGN_FORM.textColor;
  if (!isValidHex(raw.buttonTextColor)) raw.buttonTextColor = DEFAULT_CAMPAIGN_FORM.buttonTextColor;
  if (!isValidHex(raw.buttonBgColor)) raw.buttonBgColor = DEFAULT_CAMPAIGN_FORM.buttonBgColor;

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  const campaign = await db.campaign.create({
    data: { ...formValuesToCampaignData(raw), shop, isActive: true },
  });

  await db.onboardingState.upsert({
    where: { shop },
    create: { shop, step1Complete: true, step2Complete: true },
    update: { step1Complete: true, step2Complete: true },
  });

  return redirect(`/app/campaigns/${campaign.id}`);
};

export default function CampaignNewPage() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const [formState, setFormState] = useState(settings);
  const [showToast, setShowToast] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.errors || {};

  useEffect(() => {
    if (actionData?.errors && actionData.values) {
      setFormState({ ...actionData.values });
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.success === false && !actionData?.errors) {
      setShowToast(true);
    }
  }, [actionData]);

  const handleChange = useCallback((field, value) => {
    setFormState((s) => ({ ...s, [field]: value }));
  }, []);

  return (
    <Frame>
      <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }} title="New Campaign">
        <TitleBar title="Create Campaign" />

        <Layout>
          {/* Editor — Primary */}
          <Layout.Section>
            <Form method="post">
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
                        label="Timezone"
                        options={TIMEZONE_OPTIONS}
                        value={formState.timezone}
                        onChange={(v) => handleChange("timezone", v)}
                        name="timezone"
                        helpText="Dates are interpreted in this timezone and stored as UTC."
                      />
                      <TextField
                        label="Start Date & Time (optional)"
                        value={formState.startDate}
                        onChange={(v) => handleChange("startDate", v)}
                        type="datetime-local"
                        name="startDate"
                        helpText="Leave empty to start immediately when active. Use this to schedule campaigns in advance."
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
                    </FormLayout>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Design
                    </Text>
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

                <InlineStack align="end">
                  <Button
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    submit
                    size="large"
                  >
                    {isSubmitting ? "Creating..." : "Create Campaign"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Form>
          </Layout.Section>

          {/* Live Preview — Secondary */}
          <Layout.Section variant="oneThird">
            <div style={{ position: "sticky", top: "20px" }}>
              <TimerPreview formState={formState} />
            </div>
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast
            content="Failed to create campaign. Please try again."
            error
            onDismiss={() => setShowToast(false)}
            duration={4000}
          />
        )}
      </Page>
    </Frame>
  );
}
