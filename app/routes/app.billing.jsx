import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  List,
  Divider,
  Banner,
  Modal,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
  useRouteError,
} from "@remix-run/react";
import { authenticate, PLAN_PRO } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { getPlanInfo } from "../utils/billing.server";
import { logger } from "../utils/logger.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const planInfo = await getPlanInfo(billing);
  return json({ planInfo });
};

/**
 * Development stores can only approve test charges. Shopify reviewers test on
 * dev stores, so a real-charge request there would block app review.
 */
async function isTestCharge(admin) {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const response = await admin.graphql(
      `#graphql
      query shopPlan {
        shop { plan { partnerDevelopment } }
      }`
    );
    const data = await response.json();
    return Boolean(data?.data?.shop?.plan?.partnerDevelopment);
  } catch {
    return false;
  }
}

function logBillingError(shop, error, event) {
  logger.error(
    {
      shop,
      error: error?.message || String(error),
      errorName: error?.name,
      errorDetail: error?.errorData ?? null,
    },
    event
  );
}

async function handleUpgrade({ billing, session, admin }) {
  try {
    const returnUrl = `https://admin.shopify.com/store/${session.shop.replace(".myshopify.com", "")}/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;

    // billing.request() makes a GraphQL call to create the subscription,
    // then throws a Response (302 redirect) to Shopify's billing approval page.
    await billing.request({
      plan: PLAN_PRO,
      isTest: await isTestCharge(admin),
      returnUrl,
    });

    // If we reach here without a thrown redirect, something unexpected happened
    return json({ success: true });
  } catch (error) {
    // Success case: billing.request() throws a redirect Response
    if (error instanceof Response) {
      throw error;
    }

    logBillingError(session.shop, error, "billing.upgrade_failed");

    // Unpublished apps can't use the Billing API — only show the development
    // explanation for that specific rejection, never for real merchant errors.
    const message = String(error?.message || "");
    // BillingError buries the GraphQL userErrors in errorData, so check both
    const detail = JSON.stringify(error?.errorData ?? "");
    const isDistributionError =
      message.includes("public distribution") ||
      message.includes("not approved") ||
      detail.includes("public distribution");

    return json({
      success: false,
      billingError: isDistributionError
        ? "Billing is not available during development. The Shopify Billing API requires the app to be publicly listed on the App Store. Once published, this button will redirect to Shopify's payment confirmation page."
        : "We couldn't start your upgrade. Please try again in a moment, or contact support if the problem persists.",
    });
  }
}

async function handleCancel({ billing, session }) {
  try {
    // Re-check instead of trusting client state: we need the live
    // subscription id and its test flag to cancel the right charge.
    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: [PLAN_PRO],
      isTest: true,
    });
    const subscription = appSubscriptions?.[0];

    if (!hasActivePayment || !subscription) {
      return json({
        success: false,
        billingError: "No active subscription found — you're already on the Free plan.",
      });
    }

    await billing.cancel({
      subscriptionId: subscription.id,
      isTest: Boolean(subscription.test),
      prorate: true,
    });

    logger.info({ shop: session.shop, subscriptionId: subscription.id }, "billing.cancelled");

    return json({ success: true, cancelled: true });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    logBillingError(session.shop, error, "billing.cancel_failed");

    return json({
      success: false,
      billingError:
        "We couldn't cancel your subscription. Please try again in a moment, or contact support if the problem persists.",
    });
  }
}

export const action = async ({ request }) => {
  const context = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upgrade") return handleUpgrade(context);
  if (intent === "cancel") return handleCancel(context);

  return json({ success: false }, { status: 400 });
};

function PlanCard({ name, price, features, current, onUpgrade, loading, onCancel, cancelLoading }) {
  const isCurrent = current;
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text variant="headingLg" as="h2">
                {name}
              </Text>
              {isCurrent && <Badge tone="success">Current Plan</Badge>}
            </InlineStack>
            <Text variant="headingXl" as="p" fontWeight="bold">
              {price}
            </Text>
          </BlockStack>
        </InlineStack>

        <Divider />

        <List>
          {features.map((feature, i) => (
            <List.Item key={i}>{feature}</List.Item>
          ))}
        </List>

        {!isCurrent && onUpgrade && (
          <Button variant="primary" size="large" onClick={onUpgrade} loading={loading}>
            Start 14-day free trial
          </Button>
        )}

        {isCurrent && (
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="bodySm" tone="subdued" as="p">
              You're on this plan.
            </Text>
            {onCancel && (
              <Button variant="plain" tone="critical" onClick={onCancel} loading={cancelLoading}>
                Cancel subscription
              </Button>
            )}
          </InlineStack>
        )}
      </BlockStack>
    </Card>
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

export default function BillingPage() {
  const { planInfo } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Discriminate by intent so the cancel submit doesn't spin the upgrade button
  const submittingIntent =
    navigation.state === "submitting" ? navigation.formData?.get("intent") : null;
  const isUpgrading = submittingIntent === "upgrade";
  const isCancelling = submittingIntent === "cancel";

  const handleUpgrade = () => {
    const formData = new FormData();
    formData.set("intent", "upgrade");
    submit(formData, { method: "post" });
  };

  const handleCancelConfirm = () => {
    const formData = new FormData();
    formData.set("intent", "cancel");
    submit(formData, { method: "post" });
    setShowCancelModal(false);
  };

  return (
    <Page>
      <TitleBar title="Plan & Billing" />

      <BlockStack gap="500">
        {actionData?.billingError && (
          <Banner tone="warning" title="Billing not available">
            <p>{actionData.billingError}</p>
          </Banner>
        )}

        {actionData?.cancelled && (
          <Banner tone="success" title="Subscription cancelled">
            <p>
              You're back on the Free plan. Unused time on your billing period has been credited on
              a prorated basis. You can re-upgrade anytime.
            </p>
          </Banner>
        )}

        {planInfo.isPro && (
          <Banner tone="success" title="You're on the Pro plan">
            <p>You have access to all features. Thank you for your support!</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section variant="oneHalf">
            <PlanCard
              name="Free"
              price="$0/mo"
              current={!planInfo.isPro}
              features={[
                "1 active campaign",
                "All timer types: announcement bar, product page, cart",
                "Honest server-side timers — never reset on refresh",
                "All templates and full design customization",
                "Impressions analytics",
                "No traffic or view limits, ever",
              ]}
            />
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <PlanCard
              name="Pro"
              price="$6.99/mo"
              current={planInfo.isPro}
              onUpgrade={handleUpgrade}
              loading={isUpgrading}
              onCancel={() => setShowCancelModal(true)}
              cancelLoading={isCancelling}
              features={[
                "Everything in Free, plus:",
                "Unlimited active campaigns",
                "Full analytics (impressions, clicks, CTR)",
                "Run bar + product + cart timers simultaneously",
                "Priority email support",
                "14-day free trial — cancel anytime",
              ]}
            />
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Pro subscription?"
        primaryAction={{
          content: "Cancel subscription",
          destructive: true,
          onAction: handleCancelConfirm,
        }}
        secondaryActions={[{ content: "Keep Pro", onAction: () => setShowCancelModal(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text as="p">
              Your subscription ends immediately and unused time on the current billing period is
              credited back on a prorated basis.
            </Text>
            <Text as="p" tone="subdued">
              You'll move to the Free plan: 1 active campaign and impressions-only analytics. If you
              have multiple active campaigns, all but one will need to be paused.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
