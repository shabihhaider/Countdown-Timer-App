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
  ChoiceList,
  Banner,
} from "@shopify/polaris";

import { useState, useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

const DEFAULT_SETTINGS = {
  barMessage: "Flash Sale Ends In...",
  buttonText: "Shop Now",
  buttonLink: "/collections/all",
  endDate: "",
  barColor: "#288d40",
  barPosition: ["top"],
  endAction: "hide",
  customEndMessage: "",
};

// --- Color helpers: HEX <-> HSB (Polaris ColorPicker expects {hue:0-360,saturation:0-1,brightness:0-1})
function hexToHsb(hex) {
  let h = (hex || "#000000").replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(h, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let hue = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        hue = ((g - b) / d) % 6;
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
      default:
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { hue, saturation: max === 0 ? 0 : d / max, brightness: max };
}

function hsbToHex({ hue = 0, saturation = 0, brightness = 0 }) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(Math.max(saturation, 0), 1);
  const v = Math.min(Math.max(brightness, 0), 1);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
    bp = 0;
  } else if (h < 120) {
    rp = x;
    gp = c;
    bp = 0;
  } else if (h < 180) {
    rp = 0;
    gp = c;
    bp = x;
  } else if (h < 240) {
    rp = 0;
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    gp = 0;
    bp = c;
  } else {
    rp = c;
    gp = 0;
    bp = x;
  }

  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`.toLowerCase();
}

function isValidButtonLink(link) {
  if (!link) return true; // optional field
  return /^(\/(?!\/)|https?:\/\/)/.test(link.trim());
}

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const savedSetting = await db.setting.findUnique({ where: { shop } });
  let settings = { ...DEFAULT_SETTINGS };

  if (savedSetting?.value) {
    try {
      const parsed = JSON.parse(savedSetting.value);
      const barPosition = Array.isArray(parsed.barPosition)
        ? parsed.barPosition
        : [parsed.barPosition || "top"];
      settings = { ...settings, ...parsed, barPosition };
    } catch {
      // corrupted settings — use defaults
    }
  }

  return json({ settings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const raw = {
    barMessage: String(formData.get("barMessage") || "").trim(),
    buttonText: String(formData.get("buttonText") || "").trim(),
    buttonLink: String(formData.get("buttonLink") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    barColor: String(formData.get("barColor") || DEFAULT_SETTINGS.barColor).trim(),
    barPosition: String(formData.get("barPosition") || "top"),
    endAction: String(formData.get("endAction") || "hide"),
    customEndMessage: String(formData.get("customEndMessage") || "").trim(),
  };

  // --- Server-side validation ---
  const errors = {};

  if (!raw.barMessage) {
    errors.barMessage = "Bar message is required.";
  } else if (raw.barMessage.length > 200) {
    errors.barMessage = "Bar message must be 200 characters or fewer.";
  }

  if (!raw.endDate) {
    errors.endDate = "End date is required.";
  } else {
    const endMs = new Date(raw.endDate).getTime();
    if (isNaN(endMs)) {
      errors.endDate = "End date is not a valid date.";
    } else if (endMs <= Date.now()) {
      errors.endDate = "End date must be in the future.";
    }
  }

  if (raw.buttonLink && !isValidButtonLink(raw.buttonLink)) {
    errors.buttonLink =
      "Button link must be a relative path (e.g. /collections/all) or a full URL starting with https://.";
  }

  if (!isValidHex(raw.barColor)) {
    raw.barColor = DEFAULT_SETTINGS.barColor;
  }

  if (raw.endAction === "show_custom" && !raw.customEndMessage) {
    errors.customEndMessage = "Custom end message is required when this action is selected.";
  }

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors, values: raw }, { status: 422 });
  }

  await db.setting.upsert({
    where: { shop },
    update: { value: JSON.stringify(raw) },
    create: { shop, value: JSON.stringify(raw) },
  });

  return json({ success: true, settings: raw });
};

export default function Index() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const [formState, setFormState] = useState(settings);
  const [hexInput, setHexInput] = useState(settings.barColor || DEFAULT_SETTINGS.barColor);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastIsError, setToastIsError] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const fieldErrors = actionData?.errors || {};

  // Sync server validation values back into form on error
  useEffect(() => {
    if (actionData?.errors && actionData.values) {
      const pos = Array.isArray(actionData.values.barPosition)
        ? actionData.values.barPosition
        : [actionData.values.barPosition || "top"];
      setFormState({ ...actionData.values, barPosition: pos });
      setHexInput(actionData.values.barColor || DEFAULT_SETTINGS.barColor);
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.success) {
      setToastMessage("Settings saved successfully!");
      setToastIsError(false);
      setShowToast(true);
    } else if (actionData?.success === false && !actionData?.errors) {
      setToastMessage("Failed to save settings. Please try again.");
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
      <Page>
        <TitleBar title="Countdown & CTA Bar" />

        <Layout>
          <Layout.Section>
            <Form method="post">
              <BlockStack gap="400">
                {Object.keys(fieldErrors).length > 0 && (
                  <Banner tone="critical" title="Please fix the following errors before saving:">
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
                      Campaign Message
                    </Text>
                    <FormLayout>
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
                          color={hexToHsb(formState.barColor || DEFAULT_SETTINGS.barColor)}
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

                    <ChoiceList
                      title="Bar Position"
                      choices={[
                        { label: "Top of page", value: "top" },
                        { label: "Bottom of page", value: "bottom" },
                      ]}
                      selected={formState.barPosition}
                      onChange={(value) => setFormState((s) => ({ ...s, barPosition: value }))}
                    />
                    <input type="hidden" name="barPosition" value={formState.barPosition[0]} />
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

                <InlineStack distribution="trailing">
                  <Button
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    submit
                    size="large"
                  >
                    {isSubmitting ? "Saving..." : "Save Settings"}
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
