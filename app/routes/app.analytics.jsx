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
  Select,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getCampaignStatus } from "../utils/campaign";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

function formatCtr(clicks, impressions) {
  if (impressions === 0) return "\u2014";
  return `${((clicks / impressions) * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

const RANGES = {
  7: 7,
  30: 30,
  90: 90,
};

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const rangeDays = RANGES[url.searchParams.get("range")] || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);
  startDate.setHours(0, 0, 0, 0);

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    include: {
      analytics: {
        where: { date: { gte: startDate } },
        orderBy: { date: "asc" },
      },
    },
  });

  let totalImpressions = 0;
  let totalClicks = 0;

  // Build daily data points for the chart
  const dailyMap = new Map();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, impressions: 0, clicks: 0 });
  }

  const campaignSummaries = campaigns.map((campaign) => {
    const impressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0);
    const clicks = campaign.analytics.reduce((sum, a) => sum + a.clicks, 0);
    totalImpressions += impressions;
    totalClicks += clicks;

    // Aggregate daily data across all campaigns
    campaign.analytics.forEach((a) => {
      const key = a.date.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.impressions += a.impressions;
        entry.clicks += a.clicks;
      }
    });

    return {
      id: campaign.id,
      name: campaign.name,
      status: getCampaignStatus(campaign),
      impressions,
      clicks,
    };
  });

  const dailyData = Array.from(dailyMap.values());

  return json({
    campaigns: campaignSummaries,
    dailyData,
    rangeDays,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : null,
    },
  });
}

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

/**
 * Lightweight SVG sparkline chart — no external dependencies.
 */
function SparklineChart({ data, dataKey, color, height = 120 }) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d[dataKey]);
  const max = Math.max(...values, 1);
  const width = 600;
  const padding = 4;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Area fill
  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  // X-axis labels (first, middle, last)
  const labels = [];
  if (data.length > 0) {
    const fmt = (dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    labels.push({ x: padding, text: fmt(data[0].date) });
    if (data.length > 2) {
      const mid = Math.floor(data.length / 2);
      labels.push({
        x: padding + (mid / (data.length - 1)) * (width - padding * 2),
        text: fmt(data[mid].date),
      });
    }
    labels.push({ x: width - padding, text: fmt(data[data.length - 1].date) });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 20}`}
      style={{ width: "100%", height: "auto", maxHeight: height + 20 }}
      role="img"
      aria-label={`${dataKey} trend chart`}
    >
      {/* Area fill */}
      <polygon points={areaPoints} fill={color} opacity="0.1" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (v / max) * (height - padding * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
            opacity={i === values.length - 1 ? "1" : "0.4"}
          />
        );
      })}

      {/* X-axis labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={height + 16}
          textAnchor={i === labels.length - 1 ? "end" : i === 0 ? "start" : "middle"}
          fontSize="11"
          fill="#6b7280"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

export default function AnalyticsPage() {
  const { campaigns, dailyData, rangeDays, totals } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentRange = searchParams.get("range") || "30";

  const handleRangeChange = (value) => {
    navigate(`/app/analytics?range=${value}`);
  };

  const rows = campaigns.map((campaign) => [
    campaign.name,
    <Badge tone={campaign.status.tone}>{campaign.status.label}</Badge>,
    formatNumber(campaign.impressions),
    formatNumber(campaign.clicks),
    formatCtr(campaign.clicks, campaign.impressions),
  ]);

  const rangeLabel = `Last ${rangeDays} days`;

  return (
    <Page>
      <TitleBar title="Analytics" />

      <BlockStack gap="500">
        {/* Date range picker */}
        <Layout>
          <Layout.Section>
            <InlineStack align="end">
              <div style={{ width: 160 }}>
                <Select
                  label="Date range"
                  labelHidden
                  options={[
                    { label: "Last 7 days", value: "7" },
                    { label: "Last 30 days", value: "30" },
                    { label: "Last 90 days", value: "90" },
                  ]}
                  value={currentRange}
                  onChange={handleRangeChange}
                />
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Metric cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Impressions"
              value={formatNumber(totals.impressions)}
              subtitle={rangeLabel}
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard title="Clicks" value={formatNumber(totals.clicks)} subtitle={rangeLabel} />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <MetricCard
              title="Click-Through Rate"
              value={totals.ctr !== null ? `${totals.ctr}%` : "\u2014"}
              subtitle={rangeLabel}
            />
          </Layout.Section>
        </Layout>

        {/* Charts */}
        {dailyData.some((d) => d.impressions > 0 || d.clicks > 0) && (
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Impressions
                  </Text>
                  <SparklineChart data={dailyData} dataKey="impressions" color="#2563eb" />
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Clicks
                  </Text>
                  <SparklineChart data={dailyData} dataKey="clicks" color="#16a34a" />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        <Divider />

        {/* Campaign breakdown table */}
        {campaigns.length === 0 ? (
          <Layout>
            <Layout.Section>
              <Card>
                <EmptyState heading="No data yet" image="">
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
