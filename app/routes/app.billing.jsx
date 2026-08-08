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
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { authenticate, PLAN_PRO } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { getPlanInfo } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const planInfo = await getPlanInfo(billing);
  return json({ planInfo });
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upgrade") {
    try {
      const returnUrl = `https://admin.shopify.com/store/${session.shop.replace(".myshopify.com", "")}/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;

      await billing.request({
        plan: PLAN_PRO,
        isTest: true,
        returnUrl,
      });
    } catch (error) {
      // billing.request() throws a Response (redirect) on success — re-throw it
      if (error instanceof Response) {
        throw error;
      }

      // Shopify rejects billing API calls for apps not yet publicly distributed.
      // Handle gracefully instead of crashing.
      const errorMessage =
        error?.errorData?.[0]?.message || error?.message || "Unknown billing error";

      if (errorMessage.includes("public distribution")) {
        return json({
          success: false,
          billingError:
            "Billing is not available yet. The app must be published on the Shopify App Store before subscriptions can be created. All Pro features will work once the app is listed.",
        });
      }

      return json({ success: false, billingError: errorMessage }, { status: 500 });
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
            Start 7-day free trial
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
                "Announcement bar timer",
                "Basic analytics (impressions)",
                "Color customization",
                "Close button",
                "Mobile responsive",
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
                "Unlimited active campaigns",
                "Full analytics (impressions, clicks, CTR)",
                "Campaign scheduling (start/end dates)",
                "All color customization options",
                "Priority support",
                "7-day free trial",
              ]}
            />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
