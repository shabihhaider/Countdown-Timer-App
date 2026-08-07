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
  ColorPicker,
  Select,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
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
  hexToHsb,
  hsbToHex,
} from "../utils/campaign";

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

  // Verify ownership
  const existing = await db.campaign.findFirst({
    where: { id: campaignId, shop },
  });

  if (!existing) {
    return json({ success: false, errors: { _form: "Campaign not found" } }, { status: 404 });
  }

  const formData = await request.formData();
  const raw = {
    name: String(formData.get("name") || "").trim() || "My Sale",
    barMessage: String(formData.get("barMessage") || "").trim(),
    buttonText: String(formData.get("buttonText") || "").trim(),
    buttonLink: String(formData.get("buttonLink") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    barColor: String(formData.get("barColor") || DEFAULT_CAMPAIGN_FORM.barColor).trim(),
    barPosition: String(formData.get("barPosition") || "top"),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
  };

  const errors = validateCampaignForm(raw);

  if (!isValidHex(raw.barColor)) {
    raw.barColor = DEFAULT_CAMPAIGN_FORM.barColor;
  }

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

  const [formState, setFormState] = useState({ ...settings, name: campaign.name });
  const [hexInput, setHexInput] = useState(settings.barColor || DEFAULT_CAMPAIGN_FORM.barColor);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastIsError, setToastIsError] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.errors || {};

  useEffect(() => {
    if (actionData?.errors && actionData.values) {
      setFormState({ ...actionData.values });
      setHexInput(actionData.values.barColor || DEFAULT_CAMPAIGN_FORM.barColor);
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.success) {
      setToastMessage("Campaign saved successfully!");
      setToastIsError(false);
      setShowToast(true);
    } else if (actionData?.success === false && !actionData?.errors) {
      setToastMessage("Failed to save campaign. Please try again.");
      setToastIsError(true);
      setShowToast(true);
    }
  }, [actionData]);

  const handleColorPickerChange = useCallback((hsb) => {
    const hex = hsbToHex(hsb);
    setFormState((s) => ({ ...s, barColor: hex }));
    setHexInput(hex);
  }, []);

  const handleHexInputChange = useCallback((value) => {
    setHexInput(value);
    const normalized = value.startsWith("#") ? value : `#${value}`;
    if (isValidHex(normalized)) {
      setFormState((s) => ({ ...s, barColor: normalized }));
    }
  }, []);

  const nowIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <Frame>
      <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }} title={campaign.name}>
        <TitleBar title={`Edit: ${campaign.name}`} />

        <Layout>
          <Layout.Section>
            <Form method="post">
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
                        onChange={(value) => setFormState((s) => ({ ...s, name: value }))}
                        name="name"
                        placeholder="My Sale"
                        helpText="Internal name to identify this campaign."
                        autoComplete="off"
                      />
                      <TextField
                        label="Bar Message Text"
                        value={formState.barMessage}
                        onChange={(value) => setFormState((s) => ({ ...s, barMessage: value }))}
                        name="barMessage"
                        placeholder="Flash Sale Ends In..."
                        helpText="The main message displayed in the countdown bar (max 200 characters)."
                        maxLength={200}
                        showCharacterCount
                        autoComplete="off"
                        error={fieldErrors.barMessage}
                      />
                      <TextField
                        label="Countdown End Date & Time"
                        value={formState.endDate}
                        onChange={(value) => setFormState((s) => ({ ...s, endDate: value }))}
                        type="datetime-local"
                        name="endDate"
                        helpText="When your sale ends. Must be in the future."
                        min={nowIso}
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
                        onChange={(value) => setFormState((s) => ({ ...s, buttonText: value }))}
                        name="buttonText"
                        placeholder="Shop Now"
                        helpText="Leave blank to hide the button."
                        autoComplete="off"
                      />
                      <TextField
                        label="Button Link"
                        value={formState.buttonLink}
                        onChange={(value) => setFormState((s) => ({ ...s, buttonLink: value }))}
                        name="buttonLink"
                        placeholder="/collections/all"
                        helpText="Relative path (e.g. /collections/sale) or full URL (https://...)."
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
                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="semibold" as="p">
                        Bar Background Color
                      </Text>
                      <InlineStack gap="300" blockAlign="center">
                        <ColorPicker
                          onChange={handleColorPickerChange}
                          color={hexToHsb(formState.barColor || DEFAULT_CAMPAIGN_FORM.barColor)}
                        />
                        <BlockStack gap="100">
                          <TextField
                            label="Hex code"
                            labelHidden
                            value={hexInput}
                            onChange={handleHexInputChange}
                            autoComplete="off"
                            prefix="#"
                            placeholder="288d40"
                            monospaced
                            maxLength={7}
                          />
                          <div
                            style={{
                              width: "80px",
                              height: "36px",
                              backgroundColor: formState.barColor,
                              borderRadius: "6px",
                              border: "1px solid var(--p-color-border)",
                            }}
                            aria-label={`Current color: ${formState.barColor}`}
                          />
                        </BlockStack>
                      </InlineStack>
                      <input type="hidden" name="barColor" value={formState.barColor} />
                    </BlockStack>

                    <Select
                      label="Bar Position"
                      options={[
                        { label: "Top of page", value: "top" },
                        { label: "Bottom of page", value: "bottom" },
                      ]}
                      value={formState.barPosition}
                      onChange={(value) => setFormState((s) => ({ ...s, barPosition: value }))}
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
                        onChange={(value) => setFormState((s) => ({ ...s, endAction: value }))}
                        helpText="What should happen when the countdown reaches zero?"
                      />
                      <input type="hidden" name="endAction" value={formState.endAction} />

                      {formState.endAction === "show_custom" && (
                        <TextField
                          label="Custom End Message"
                          value={formState.customEndMessage || ""}
                          onChange={(value) =>
                            setFormState((s) => ({ ...s, customEndMessage: value }))
                          }
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
                    {isSubmitting ? "Saving..." : "Save Campaign"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Form>
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
