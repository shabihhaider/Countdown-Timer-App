import {
  Card,
  Page,
  Layout,
  FormLayout,
  TextField,
  Text,
  LegacyStack,
  Button,
  Toast,
  Frame,
  ColorPicker,
  Select,
  ChoiceList,
} from "@shopify/polaris";

import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

// --- Color helpers: HEX <-> HSB (Polaris expects {hue:0-360,saturation:0-1,brightness:0-1})
function hexToHsb(hex) {
  if (!hex) hex = '#000000';
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  let r = ((num >> 16) & 255) / 255;
  let g = ((num >> 8) & 255) / 255;
  let b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let hue = 0;
  if (d !== 0) {
    switch (max) {
      case r: hue = ((g - b) / d) % 6; break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
      default: break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const brightness = max;
  const saturation = max === 0 ? 0 : d / max;

  return { hue, saturation, brightness };
}

function hsbToHex({ hue = 0, saturation = 0, brightness = 0 }) {
  const h = (hue % 360 + 360) % 360; // normalize
  const s = Math.min(Math.max(saturation, 0), 1);
  const v = Math.min(Math.max(brightness, 0), 1);

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0, gp = 0, bp = 0;
  if (h < 60)       { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else              { rp = c; gp = 0; bp = x; }

  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);

  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Get saved settings from dedicated settings table
    const savedSetting = await db.setting.findUnique({
      where: { shop: shop }
    });

    let settings = {
      barMessage: "Flash Sale Ends In...",
      buttonText: "Shop Now",
      buttonLink: "/collections/all",
      endDate: "",
      barColor: '#288d40',
      barPosition: ['top'],
      endAction: 'hide',
      customEndMessage: '',
    };

    if (savedSetting && savedSetting.value) {
      try {
        const parsedSettings = JSON.parse(savedSetting.value);
        const normalizedBarPosition = Array.isArray(parsedSettings.barPosition)
          ? parsedSettings.barPosition
          : [parsedSettings.barPosition || 'top'];
        settings = { ...settings, ...parsedSettings, barPosition: normalizedBarPosition };
      } catch (e) {
        console.error("Error parsing saved settings:", e);
      }
    }

    return json({ settings });
  } catch (error) {
    console.error("Authentication error:", error);
    throw new Response("Authentication failed", { status: 401 });
  }
};

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    const formData = await request.formData();
    const settingsData = {
      barMessage: formData.get("barMessage"),
      buttonText: formData.get("buttonText"),
      buttonLink: formData.get("buttonLink"),
      endDate: formData.get("endDate"),
      barColor: formData.get("barColor"),
      barPosition: formData.get("barPosition"),
      endAction: formData.get("endAction"),
      customEndMessage: formData.get("customEndMessage") || '',
    };
    
    // Save to database only
    await db.setting.upsert({
      where: { shop: shop },
      update: { value: JSON.stringify(settingsData) },
      create: { shop: shop, value: JSON.stringify(settingsData) }
    });
    
    return json({
      success: true,
      settings: settingsData
    });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function Index() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  
  const [formState, setFormState] = useState(settings);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const isSubmitting = navigation.state === 'submitting';
  
  useEffect(() => {
    if (actionData?.success) {
      setToastMessage('Settings saved successfully!');
      setToastError(false);
      setShowToast(true);
    } else if (actionData?.error) {
      setToastMessage(`Error: ${actionData.error}`);
      setToastError(true);
      setShowToast(true);
    }
  }, [actionData]);
  
  const handleToastDismiss = () => {
    setShowToast(false);
  };

  return (
    <Frame>
      <Page>
        <TitleBar title="Countdown & Call-to-Action Bar" />
        
        <Layout>
          <Layout.Section>
            <Form method="post">
              <Card sectioned>
                <LegacyStack vertical spacing="loose">
                  <Text variant="headingXl">
                    Countdown & Call-to-Action Bar Settings
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Create urgency and drive sales with a customizable countdown timer on your store.
                  </Text>
                  
                  <FormLayout>
                    <TextField
                      label="Bar Message Text"
                      value={formState.barMessage}
                      onChange={(value) => setFormState({ ...formState, barMessage: value })}
                      name="barMessage"
                      placeholder="Flash Sale Ends In..."
                      helpText="The main message displayed in the countdown bar."
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Call-to-Action Button Text"
                      value={formState.buttonText}
                      onChange={(value) => setFormState({ ...formState, buttonText: value })}
                      name="buttonText"
                      placeholder="Shop Now"
                      helpText="The text for the button inside the bar."
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Button Link"
                      value={formState.buttonLink}
                      onChange={(value) => setFormState({ ...formState, buttonLink: value })}
                      name="buttonLink"
                      placeholder="/collections/all"
                      helpText="The URL the button will lead to (e.g., /collections/sale)."
                      autoComplete="off"
                    />
                    
                    <TextField
                      label="Countdown End Date & Time"
                      value={formState.endDate}
                      onChange={(value) => setFormState({ ...formState, endDate: value })}
                      type="datetime-local"
                      name="endDate"
                      helpText="When your sale ends. The countdown will automatically stop at this time."
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    />

                    <div style={{ marginTop: '20px' }}>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Bar Background Color
                      </Text>
                      <div style={{ marginTop: '8px' }}>
                        <ColorPicker
                          onChange={(hsb) => {
                            const hex = hsbToHex(hsb);
                            setFormState((s) => ({ ...s, barColor: hex }));
                          }}
                          color={hexToHsb(formState.barColor || '#288d40')}
                        />
                        <input type="hidden" name="barColor" value={formState.barColor} />
                      </div>
                      <div style={{ marginTop: '8px', padding: '12px', backgroundColor: formState.barColor, borderRadius: '4px', textAlign: 'center' }}>
                        <Text variant="bodyMd" as="p" style={{ color: '#ffffff' }}>
                          Preview: {formState.barColor}
                        </Text>
                      </div>
                      <Text variant="bodySm" as="p" color="subdued" style={{ marginTop: '8px' }}>
                        Choose a background color that matches your brand and grabs attention.
                      </Text>
                    </div>

                    <ChoiceList
                      title="Bar Position"
                      choices={[
                        { label: 'Top of page', value: 'top' },
                        { label: 'Bottom of page', value: 'bottom' },
                      ]}
                      selected={formState.barPosition}
                      onChange={(value) => setFormState({ ...formState, barPosition: value })}
                    />
                    <input type="hidden" name="barPosition" value={formState.barPosition[0]} />

                    <Select
                      label="Action When Countdown Ends"
                      options={[
                        { label: 'Hide the bar', value: 'hide' },
                        { label: 'Show "Sale Ended" message', value: 'show_ended' },
                        { label: 'Show custom message', value: 'show_custom' },
                      ]}
                      value={formState.endAction}
                      onChange={(value) => setFormState({ ...formState, endAction: value })}
                      helpText="What happens when the countdown reaches zero?"
                    />
                    <input type="hidden" name="endAction" value={formState.endAction} />

                    {formState.endAction === 'show_custom' && (
                      <TextField
                        label="Custom End Message"
                        value={formState.customEndMessage || ''}
                        onChange={(value) => setFormState({ ...formState, customEndMessage: value })}
                        name="customEndMessage"
                        placeholder="Thanks for shopping with us!"
                        helpText="This message will display when the countdown ends."
                        autoComplete="off"
                      />
                    )}
                    
                    <LegacyStack distribution="trailing">
                        <Button
                          variant="primary"
                          loading={isSubmitting}
                          disabled={isSubmitting}
                          submit
                          size="large"
                        >
                        {navigation.state === 'submitting' ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </LegacyStack>
                  </FormLayout>
                </LegacyStack>
              </Card>
            </Form>
          </Layout.Section>
        </Layout>
        
        {showToast && (
          <Toast
            content={toastMessage}
            error={toastError}
            onDismiss={handleToastDismiss}
            duration={4000}
          />
        )}
      </Page>
    </Frame>
  );
}