import {
  Card,
  Page,
  Layout,
  Text,
  InlineStack,
  BlockStack,
  Button,
  Badge,
  EmptyState,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { getCampaignStatus, formatNumber } from "../utils/campaign";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check onboarding — redirect if incomplete
  const onboarding = await db.onboardingState.findUnique({ where: { shop } });
  if (!onboarding || !onboarding.completedAt) {
    return redirect("/app/onboarding");
  }

  // Load campaigns with recent analytics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      analytics: {
        where: { date: { gte: sevenDaysAgo } },
      },
    },
  });

  // Aggregate analytics
  let totalImpressions = 0;
  let totalClicks = 0;

  const campaignSummaries = campaigns.map((campaign) => {
    const impressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
    const clicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
    totalImpressions += impressions;
    totalClicks += clicks;

    const status = getCampaignStatus(campaign);

    return {
      id: campaign.id,
      name: campaign.name,
      barMessage: campaign.barMessage,
      endDate: campaign.endDate,
      status,
      impressions,
      clicks,
    };
  });

  const totalCampaigns = await db.campaign.count({ where: { shop } });
  const activeCampaigns = await db.campaign.count({ where: { shop, isActive: true } });

  return json({
    campaigns: campaignSummaries,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : null,
      totalCampaigns,
      activeCampaigns,
    },
  });
};

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

function formatEndDate(date) {
  if (!date) return "No end date";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "No end date";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const { campaigns, totals } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="Dashboard">
        <button variant="primary" onClick={() => navigate("/app/campaigns/new")}>
          Create Campaign
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Quick Analytics */}
        <Layout>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Impressions"
              value={formatNumber(totals.impressions)}
              subtitle="Last 7 days"
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard title="Clicks" value={formatNumber(totals.clicks)} subtitle="Last 7 days" />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Click-Through Rate"
              value={totals.ctr !== null ? `${totals.ctr}%` : "\u2014"}
              subtitle="Last 7 days"
            />
          </Layout.Section>
        </Layout>

        {/* Campaign Summary */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    Campaigns
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    {totals.activeCampaigns} active of {totals.totalCampaigns} total
                  </Text>
                </InlineStack>

                {campaigns.length === 0 ? (
                  <EmptyState
                    heading="No campaigns yet"
                    action={{
                      content: "Create your first campaign",
                      url: "/app/campaigns/new",
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create a countdown timer to start driving conversions on your store.</p>
                  </EmptyState>
                ) : (
                  <ResourceList
                    resourceName={{ singular: "campaign", plural: "campaigns" }}
                    items={campaigns}
                    renderItem={(campaign) => (
                      <ResourceItem
                        id={String(campaign.id)}
                        onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                        accessibilityLabel={`Edit ${campaign.name}`}
                      >
                        <InlineStack align="space-between" blockAlign="center" wrap={false}>
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              <Text variant="bodyMd" fontWeight="bold" as="span">
                                {campaign.name}
                              </Text>
                              <Badge tone={campaign.status.tone}>{campaign.status.label}</Badge>
                            </InlineStack>
                            <Text variant="bodySm" tone="subdued" as="span">
                              {campaign.barMessage}
                            </Text>
                            <Text variant="bodySm" tone="subdued" as="span">
                              {formatEndDate(campaign.endDate)}
                            </Text>
                          </BlockStack>
                          <BlockStack gap="100" inlineAlign="end">
                            <Text variant="bodySm" as="span">
                              {formatNumber(campaign.impressions)} views
                            </Text>
                            <Text variant="bodySm" tone="subdued" as="span">
                              {formatNumber(campaign.clicks)} clicks
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </ResourceItem>
                    )}
                  />
                )}

                {campaigns.length > 0 && (
                  <InlineStack align="center">
                    <Button url="/app/campaigns" variant="plain">
                      View all campaigns
                    </Button>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
