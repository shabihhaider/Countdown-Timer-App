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

export const action = async ({ request }) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upgrade") {
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

      logger.error({ shop: session.shop, error: error?.message }, "billing.upgrade_failed");

      // Unpublished apps can't use the Billing API — only show the development
      // explanation for that specific rejection, never for real merchant errors.
      const message = String(error?.message || "");
      const isDistributionError =
        message.includes("public distribution") || message.includes("not approved");

      return json({
        success: false,
        billingError: isDistributionError
          ? "Billing is not available during development. The Shopify Billing API requires the app to be publicly listed on the App Store. Once published, this button will redirect to Shopify's payment confirmation page."
          : "We couldn't start your upgrade. Please try again in a moment, or contact support if the problem persists.",
      });
    }
  }

  return json({ success: false }, { status: 400 });
};

function PlanCard({ name, price, features, current, onUpgrade, loading }) {
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
          <Text variant="bodySm" tone="subdued" as="p">
            You're on this plan.
          </Text>
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

  const isUpgrading = navigation.state === "submitting";

  const handleUpgrade = () => {
    const formData = new FormData();
    formData.set("intent", "upgrade");
    submit(formData, { method: "post" });
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
    </Page>
  );
}
