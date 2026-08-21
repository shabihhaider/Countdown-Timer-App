import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, Form, useRouteError } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  ProgressBar,
  Badge,
  Banner,
  List,
  Icon,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  ClockIcon,
  PaintBrushFlatIcon,
  AppExtensionIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/** @typedef {{ step1Complete: boolean, step2Complete: boolean, step3Complete: boolean, completedAt: string | null }} OnboardingData */

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const onboarding = await db.onboardingState.upsert({
    where: { shop },
    create: { shop },
    update: {},
    select: {
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      completedAt: true,
    },
  });

  return json({ shop, onboarding });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "complete_step1") {
    const updated = await db.onboardingState.update({
      where: { shop },
      data: { step1Complete: true, step2Complete: true },
    });

    const allDone = updated.step1Complete && updated.step2Complete && updated.step3Complete;

    if (allDone && !updated.completedAt) {
      await db.onboardingState.update({
        where: { shop },
        data: { completedAt: new Date() },
      });
    }

    return json({ success: true });
  }

  if (intent === "complete_step3") {
    const updated = await db.onboardingState.update({
      where: { shop },
      data: { step3Complete: true },
    });

    const allDone = updated.step1Complete && updated.step2Complete && updated.step3Complete;

    if (allDone && !updated.completedAt) {
      await db.onboardingState.update({
        where: { shop },
        data: { completedAt: new Date() },
      });
    }

    return json({ success: true });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

function countCompleted(onboarding) {
  let count = 0;
  if (onboarding.step1Complete) count += 1;
  if (onboarding.step2Complete) count += 1;
  if (onboarding.step3Complete) count += 1;
  return count;
}

function StepStatusBadge({ complete }) {
  if (complete) {
    return <Badge tone="success">Complete</Badge>;
  }
  return <Badge tone="attention">Pending</Badge>;
}

function StepIcon({ complete }) {
  return (
    <Icon source={complete ? CheckCircleIcon : ClockIcon} tone={complete ? "success" : "subdued"} />
  );
}

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

export default function OnboardingPage() {
  const { shop, onboarding } = useLoaderData();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting ? navigation.formData?.get("intent") : null;

  const completed = countCompleted(onboarding);
  const progressPercent = Math.round((completed / 3) * 100);
  const allDone = completed === 3;

  const themeEditorUrl = `https://${shop}/admin/themes/current/editor`;

  return (
    <Page narrowWidth>
      <TitleBar title="Setup Guide" />

      <BlockStack gap="600">
        {/* Completion banner */}
        {allDone && (
          <Banner
            title="Your countdown timer is live!"
            tone="success"
            action={{
              content: "Go to Settings",
              url: "/app",
            }}
          >
            <p>
              All setup steps are complete. Your countdown timer is active on your storefront. Head
              to settings to manage your campaigns.
            </p>
          </Banner>
        )}

        {/* Progress overview */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h2">
                Setup Progress
              </Text>
              <Text variant="bodySm" as="span" tone="subdued">
                {completed} of 3 steps complete
              </Text>
            </InlineStack>
            <ProgressBar progress={progressPercent} tone="primary" size="small" />
          </BlockStack>
        </Card>

        {/* Step 1: Configure Campaign */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <InlineStack gap="300" blockAlign="center">
                <StepIcon complete={onboarding.step1Complete} />
                <Text variant="headingMd" as="h3">
                  Step 1: Configure Your Campaign
                </Text>
              </InlineStack>
              <StepStatusBadge complete={onboarding.step1Complete} />
            </InlineStack>

            <Text as="p" tone="subdued">
              Set up your first countdown timer campaign. Choose a name, set the end date, and
              configure the bar message and call-to-action button.
            </Text>

            <List>
              <List.Item>Set your campaign end date and timezone</List.Item>
              <List.Item>Write a compelling bar message</List.Item>
              <List.Item>Configure the call-to-action button text and link</List.Item>
            </List>

            {onboarding.step1Complete ? (
              <InlineStack align="start">
                <Button url="/app" variant="plain">
                  Review settings
                </Button>
              </InlineStack>
            ) : (
              <InlineStack align="start">
                <Button url="/app" variant="primary">
                  Configure Campaign
                </Button>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        {/* Step 2: Customize Design */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <InlineStack gap="300" blockAlign="center">
                <Icon
                  source={PaintBrushFlatIcon}
                  tone={onboarding.step2Complete ? "success" : "subdued"}
                />
                <Text variant="headingMd" as="h3">
                  Step 2: Customize Your Design
                </Text>
              </InlineStack>
              <StepStatusBadge complete={onboarding.step2Complete} />
            </InlineStack>

            <Text as="p" tone="subdued">
              Pick a background color and bar position that match your store's branding. This is
              configured alongside your campaign in the settings page.
            </Text>

            <List>
              <List.Item>Choose the bar background color</List.Item>
              <List.Item>Select bar position (top or bottom of page)</List.Item>
              <List.Item>Preview the look on your store</List.Item>
            </List>

            {onboarding.step2Complete ? (
              <InlineStack align="start">
                <Button url="/app" variant="plain">
                  Review design
                </Button>
              </InlineStack>
            ) : (
              <InlineStack align="start">
                <Button url="/app" variant="primary">
                  Customize Design
                </Button>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        {/* Step 3: Install in Theme */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <InlineStack gap="300" blockAlign="center">
                <Icon
                  source={AppExtensionIcon}
                  tone={onboarding.step3Complete ? "success" : "subdued"}
                />
                <Text variant="headingMd" as="h3">
                  Step 3: Install in Your Theme
                </Text>
              </InlineStack>
              <StepStatusBadge complete={onboarding.step3Complete} />
            </InlineStack>

            <Text as="p" tone="subdued">
              Add the countdown timer app block to your theme. Open the Theme Editor, navigate to
              the App Embeds section, and enable the Countdown Timer extension.
            </Text>

            <List>
              <List.Item>
                Click "Open Theme Editor" to launch the Shopify theme customizer
              </List.Item>
              <List.Item>Go to App Embeds in the left sidebar</List.Item>
              <List.Item>Toggle on the Countdown Timer embed and save</List.Item>
            </List>

            <InlineStack gap="300" align="start">
              <Button
                variant="primary"
                onClick={() => window.open(themeEditorUrl, "_blank")}
                disabled={onboarding.step3Complete}
              >
                Open Theme Editor
              </Button>

              {!onboarding.step3Complete && (
                <Form method="post">
                  <input type="hidden" name="intent" value="complete_step3" />
                  <Button
                    submit
                    variant="secondary"
                    loading={submittingIntent === "complete_step3"}
                    disabled={isSubmitting}
                  >
                    Mark Extension as Installed
                  </Button>
                </Form>
              )}
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
