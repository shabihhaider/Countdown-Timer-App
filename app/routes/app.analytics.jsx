import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
  EmptyState,
  DataTable,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

/**
 * Computes a formatted CTR string from clicks and impressions.
 * @param {number} clicks
 * @param {number} impressions
 * @returns {string}
 */
function formatCtr(clicks, impressions) {
  if (impressions === 0) {
    return "\u2014";
  }
  return `${((clicks / impressions) * 100).toFixed(1)}%`;
}

/**
 * Formats a number with locale-aware thousand separators.
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return value.toLocaleString("en-US");
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    include: {
      analytics: {
        where: {
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  let totalImpressions = 0;
  let totalClicks = 0;

  const campaignSummaries = campaigns.map((campaign) => {
    const impressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
    const clicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);

    totalImpressions += impressions;
    totalClicks += clicks;

    return {
      id: campaign.id,
      name: campaign.name,
      isActive: campaign.isActive,
      impressions,
      clicks,
    };
  });

  return json({
    campaigns: campaignSummaries,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : null,
    },
  });
}

/**
 * A single metric card showing a value with a label underneath.
 */
function MetricCard({ title, value, subtitle }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {title}
        </Text>
        <Text as="p" variant="headingXl" fontWeight="semibold">
          {value}
        </Text>
        {subtitle && (
          <Text as="p" variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { campaigns, totals } = useLoaderData();

  const rows = campaigns.map((campaign) => [
    campaign.name,
    campaign.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>,
    formatNumber(campaign.impressions),
    formatNumber(campaign.clicks),
    formatCtr(campaign.clicks, campaign.impressions),
  ]);

  return (
    <Page>
      <TitleBar title="Analytics" />

      <BlockStack gap="500">
        <Layout>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Total Impressions"
              value={formatNumber(totals.impressions)}
              subtitle="Last 30 days"
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Total Clicks"
              value={formatNumber(totals.clicks)}
              subtitle="Last 30 days"
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Click-Through Rate"
              value={totals.ctr !== null ? `${totals.ctr}%` : "\u2014"}
              subtitle="Last 30 days"
            />
          </Layout.Section>
        </Layout>

        <Divider />

        {campaigns.length === 0 ? (
          <Layout>
            <Layout.Section>
              <Card>
                <EmptyState
                  heading="No data yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Your analytics will appear here once your timer is live and receiving visitors.
                  </p>
                </EmptyState>
              </Card>
            </Layout.Section>
          </Layout>
        ) : (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Campaign Breakdown
                  </Text>
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                    headings={["Campaign Name", "Status", "Impressions", "Clicks", "CTR"]}
                    rows={rows}
                    footerContent={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
