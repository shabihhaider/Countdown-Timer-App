import { Card, Page, Layout, Text, BlockStack, InlineGrid, Banner, Button } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useNavigate, useRouteError } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_LABELS } from "../utils/campaign";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ types: CAMPAIGN_TYPES, labels: CAMPAIGN_TYPE_LABELS });
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

function TypeCard({ title, description, features, url }) {
  const navigate = useNavigate();

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          {title}
        </Text>
        <Text variant="bodyMd" tone="subdued" as="p">
          {description}
        </Text>
        <BlockStack gap="200">
          {features.map((f, i) => (
            <Text key={i} variant="bodySm" as="p">
              {"- " + f}
            </Text>
          ))}
        </BlockStack>
        <Button variant="primary" onClick={() => navigate(url)} fullWidth>
          Create {title}
        </Button>
      </BlockStack>
    </Card>
  );
}

export default function CampaignTypePicker() {
  return (
    <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }} title="New Campaign">
      <TitleBar title="Choose Campaign Type" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              Choose the type of campaign you want to create. Each type has its own design settings
              and storefront placement.
            </Text>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <TypeCard
                title="Announcement Bar"
                description="A full-width countdown bar at the top or bottom of your store. Great for sitewide sales, flash deals, and promotions."
                features={[
                  "Customizable colors, fonts, and animations",
                  "CTA button with link and discount code",
                  "Page-level targeting (show/hide on specific URLs)",
                  "Gradient backgrounds",
                ]}
                url="/app/campaigns/new/bar"
              />
              <TypeCard
                title="Product Timer"
                description="A countdown timer displayed on individual product pages. Creates urgency right where customers make purchase decisions."
                features={[
                  "5 display styles (minimal, card, badge, banner, floating)",
                  "Product and collection targeting",
                  "Accent color and label customization",
                  "Theme block settings can override defaults",
                ]}
                url="/app/campaigns/new/product-timer"
              />
            </InlineGrid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
