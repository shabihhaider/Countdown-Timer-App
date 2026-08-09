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
  Select,
  Modal,
  Button,
} from "@shopify/polaris";
import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getCampaignStatus } from "../utils/campaign";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

function formatCompact(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

const RANGES = { 7: 7, 30: 30, 90: 90 };

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const rangeDays = RANGES[url.searchParams.get("range")] || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);
  startDate.setHours(0, 0, 0, 0);

  // Previous period for comparison
  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - rangeDays);

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    include: {
      analytics: {
        where: { date: { gte: prevStart } },
        orderBy: { date: "asc" },
      },
    },
  });

  let totalImpressions = 0;
  let totalClicks = 0;
  let prevImpressions = 0;
  let prevClicks = 0;

  const dailyMap = new Map();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, impressions: 0, clicks: 0, closes: 0 });
  }

  const campaignSummaries = campaigns.map((campaign) => {
    let campImpressions = 0;
    let campClicks = 0;
    let campCloses = 0;
    const campDaily = [];

    campaign.analytics.forEach((a) => {
      const key = a.date.toISOString().slice(0, 10);
      const isCurrentPeriod = a.date >= startDate;

      if (isCurrentPeriod) {
        campImpressions += a.impressions;
        campClicks += a.clicks;
        campCloses += a.closes;

        const entry = dailyMap.get(key);
        if (entry) {
          entry.impressions += a.impressions;
          entry.clicks += a.clicks;
          entry.closes += a.closes;
        }

        campDaily.push({
          date: key,
          impressions: a.impressions,
          clicks: a.clicks,
        });
      } else {
        prevImpressions += a.impressions;
        prevClicks += a.clicks;
      }
    });

    totalImpressions += campImpressions;
    totalClicks += campClicks;

    return {
      id: campaign.id,
      name: campaign.name,
      status: getCampaignStatus(campaign),
      impressions: campImpressions,
      clicks: campClicks,
      closes: campCloses,
      ctr: campImpressions > 0 ? ((campClicks / campImpressions) * 100).toFixed(1) : null,
      dailyData: campDaily,
    };
  });

  // Compute period-over-period change
  const impressionChange =
    prevImpressions > 0
      ? Math.round(((totalImpressions - prevImpressions) / prevImpressions) * 100)
      : null;
  const clickChange =
    prevClicks > 0 ? Math.round(((totalClicks - prevClicks) / prevClicks) * 100) : null;

  return json({
    campaigns: campaignSummaries,
    dailyData: Array.from(dailyMap.values()),
    rangeDays,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      closes: campaigns.reduce(
        (s, c) =>
          s + c.analytics.filter((a) => a.date >= startDate).reduce((ss, a) => ss + a.closes, 0),
        0
      ),
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : null,
      impressionChange,
      clickChange,
    },
  });
}

// --- Chart Component ---

function AreaChart({ data, dataKey, color, height = 140, showGrid = true, showYAxis = true }) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d[dataKey]);
  const max = Math.max(...values, 1);
  const width = 600;
  const leftPad = showYAxis ? 45 : 4;
  const rightPad = 4;
  const topPad = 8;
  const bottomPad = 24;
  const chartW = width - leftPad - rightPad;
  const chartH = height - topPad - bottomPad;

  const getX = (i) => leftPad + (i / (values.length - 1 || 1)) * chartW;
  const getY = (v) => topPad + chartH - (v / max) * chartH;

  const points = values.map((v, i) => `${getX(i)},${getY(v)}`);
  const areaPoints = [
    `${leftPad},${topPad + chartH}`,
    ...points,
    `${leftPad + chartW},${topPad + chartH}`,
  ].join(" ");

  // Y-axis labels
  const yLabels = showYAxis
    ? [0, Math.round(max / 2), max].map((v) => ({
        y: getY(v),
        text: formatCompact(v),
      }))
    : [];

  // X-axis labels
  const fmt = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const xLabels = [];
  if (data.length > 0) {
    xLabels.push({ x: leftPad, text: fmt(data[0].date), anchor: "start" });
    if (data.length > 4) {
      const q1 = Math.floor(data.length / 4);
      const mid = Math.floor(data.length / 2);
      const q3 = Math.floor((data.length * 3) / 4);
      xLabels.push({ x: getX(q1), text: fmt(data[q1].date), anchor: "middle" });
      xLabels.push({ x: getX(mid), text: fmt(data[mid].date), anchor: "middle" });
      xLabels.push({ x: getX(q3), text: fmt(data[q3].date), anchor: "middle" });
    }
    xLabels.push({ x: leftPad + chartW, text: fmt(data[data.length - 1].date), anchor: "end" });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto" }}
      role="img"
      aria-label={`${dataKey} trend`}
    >
      {/* Grid lines */}
      {showGrid &&
        [0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={leftPad}
            y1={topPad + chartH * (1 - pct)}
            x2={leftPad + chartW}
            y2={topPad + chartH * (1 - pct)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}

      {/* Area */}
      <polygon points={areaPoints} fill={color} opacity="0.08" />

      {/* Gradient line */}
      <defs>
        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={`url(#grad-${dataKey})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {values.length > 0 && (
        <circle
          cx={getX(values.length - 1)}
          cy={getY(values[values.length - 1])}
          r="4"
          fill={color}
          stroke="#fff"
          strokeWidth="2"
        />
      )}

      {/* Y-axis labels */}
      {yLabels.map((l, i) => (
        <text key={i} x={leftPad - 6} y={l.y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
          {l.text}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={height - 2} textAnchor={l.anchor} fontSize="10" fill="#9ca3af">
          {l.text}
        </text>
      ))}
    </svg>
  );
}

// --- Mini sparkline for campaign rows ---

function MiniSparkline({ data, dataKey, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return <span style={{ width, display: "inline-block" }} />;

  const values = data.map((d) => d[dataKey]);
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Metric Card with change indicator ---

function MetricCard({ title, value, subtitle, change }) {
  const changeColor = change > 0 ? "#16a34a" : change < 0 ? "#dc2626" : "#6b7280";
  const changePrefix = change > 0 ? "+" : "";

  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {title}
        </Text>
        <InlineStack gap="200" blockAlign="center">
          <Text as="p" variant="headingXl" fontWeight="semibold">
            {value}
          </Text>
          {change !== null && change !== undefined && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: changeColor,
                background: change > 0 ? "#f0fdf4" : change < 0 ? "#fef2f2" : "#f9fafb",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              {changePrefix}
              {change}%
            </span>
          )}
        </InlineStack>
        {subtitle && (
          <Text as="p" variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

// --- Campaign Row ---

function CampaignRow({ campaign, onViewDetails }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #f3f4f6",
        gap: "16px",
        cursor: "pointer",
      }}
      onClick={() => onViewDetails(campaign)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${campaign.name}`}
    >
      {/* Name + Status */}
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Text variant="bodyMd" fontWeight="semibold" as="span" truncate>
            {campaign.name}
          </Text>
          <Badge tone={campaign.status.tone}>{campaign.status.label}</Badge>
        </InlineStack>
      </div>

      {/* Mini sparkline */}
      <div style={{ flex: "0 0 80px" }}>
        <MiniSparkline data={campaign.dailyData} dataKey="impressions" color="#2563eb" />
      </div>

      {/* Stats */}
      <div style={{ flex: "0 0 120px", textAlign: "right" }}>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {formatNumber(campaign.impressions)}
        </Text>
        <Text variant="bodySm" tone="subdued" as="span">
          {" "}
          views
        </Text>
      </div>

      <div style={{ flex: "0 0 100px", textAlign: "right" }}>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {formatNumber(campaign.clicks)}
        </Text>
        <Text variant="bodySm" tone="subdued" as="span">
          {" "}
          clicks
        </Text>
      </div>

      <div style={{ flex: "0 0 60px", textAlign: "right" }}>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {campaign.ctr ? `${campaign.ctr}%` : "\u2014"}
        </Text>
      </div>

      {/* View button */}
      <div style={{ flex: "0 0 40px", textAlign: "right" }}>
        <Button
          variant="plain"
          size="slim"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(campaign);
          }}
        >
          Details
        </Button>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { campaigns, dailyData, rangeDays, totals } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [detailCampaign, setDetailCampaign] = useState(null);

  const currentRange = searchParams.get("range") || "30";
  const rangeLabel = `Last ${rangeDays} days`;

  const handleRangeChange = (value) => {
    navigate(`/app/analytics?range=${value}`);
  };

  const hasData = dailyData.some((d) => d.impressions > 0 || d.clicks > 0);

  return (
    <Page>
      <TitleBar title="Analytics" />

      <BlockStack gap="500">
        {/* Header: Title + Date range */}
        <Layout>
          <Layout.Section>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingLg" as="h1">
                Performance
              </Text>
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

        {/* Metric cards with period comparison */}
        <Layout>
          <Layout.Section variant="oneQuarter">
            <MetricCard
              title="Impressions"
              value={formatNumber(totals.impressions)}
              subtitle={rangeLabel}
              change={totals.impressionChange}
            />
          </Layout.Section>
          <Layout.Section variant="oneQuarter">
            <MetricCard
              title="Clicks"
              value={formatNumber(totals.clicks)}
              subtitle={rangeLabel}
              change={totals.clickChange}
            />
          </Layout.Section>
          <Layout.Section variant="oneQuarter">
            <MetricCard
              title="CTR"
              value={totals.ctr !== null ? `${totals.ctr}%` : "\u2014"}
              subtitle={rangeLabel}
            />
          </Layout.Section>
          <Layout.Section variant="oneQuarter">
            <MetricCard
              title="Dismissals"
              value={formatNumber(totals.closes)}
              subtitle={rangeLabel}
            />
          </Layout.Section>
        </Layout>

        {/* Main chart — full width, impressions + clicks overlay */}
        {hasData && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Impressions & Clicks Over Time
                    </Text>
                    <InlineStack gap="300">
                      <InlineStack gap="100" blockAlign="center">
                        <span
                          style={{
                            width: 12,
                            height: 3,
                            borderRadius: 2,
                            background: "#2563eb",
                            display: "inline-block",
                          }}
                        />
                        <Text variant="bodySm" tone="subdued" as="span">
                          Impressions
                        </Text>
                      </InlineStack>
                      <InlineStack gap="100" blockAlign="center">
                        <span
                          style={{
                            width: 12,
                            height: 3,
                            borderRadius: 2,
                            background: "#16a34a",
                            display: "inline-block",
                          }}
                        />
                        <Text variant="bodySm" tone="subdued" as="span">
                          Clicks
                        </Text>
                      </InlineStack>
                    </InlineStack>
                  </InlineStack>
                  <AreaChart data={dailyData} dataKey="impressions" color="#2563eb" height={180} />
                  <div style={{ marginTop: -20 }}>
                    <AreaChart
                      data={dailyData}
                      dataKey="clicks"
                      color="#16a34a"
                      height={100}
                      showGrid={false}
                      showYAxis={false}
                    />
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        <Divider />

        {/* Per-campaign breakdown with inline sparklines */}
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
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Campaign Performance
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="span">
                      {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
                    </Text>
                  </InlineStack>

                  {/* Header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "2px solid #e5e7eb",
                      gap: "16px",
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: 500,
                    }}
                  >
                    <div style={{ flex: "1 1 180px" }}>Campaign</div>
                    <div style={{ flex: "0 0 80px" }}>Trend</div>
                    <div style={{ flex: "0 0 120px", textAlign: "right" }}>Views</div>
                    <div style={{ flex: "0 0 100px", textAlign: "right" }}>Clicks</div>
                    <div style={{ flex: "0 0 60px", textAlign: "right" }}>CTR</div>
                    <div style={{ flex: "0 0 40px" }} />
                  </div>

                  {/* Campaign rows */}
                  {campaigns.map((campaign) => (
                    <CampaignRow
                      key={campaign.id}
                      campaign={campaign}
                      onViewDetails={setDetailCampaign}
                    />
                  ))}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>

      {/* Detail modal — popup chart when clicking a campaign row */}
      <Modal
        open={detailCampaign !== null}
        onClose={() => setDetailCampaign(null)}
        title={detailCampaign?.name || "Campaign Details"}
        large
      >
        <Modal.Section>
          {detailCampaign && (
            <BlockStack gap="400">
              {/* Summary stats */}
              <InlineStack gap="500">
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Impressions
                  </Text>
                  <Text variant="headingLg" fontWeight="bold" as="p">
                    {formatNumber(detailCampaign.impressions)}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Clicks
                  </Text>
                  <Text variant="headingLg" fontWeight="bold" as="p">
                    {formatNumber(detailCampaign.clicks)}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    CTR
                  </Text>
                  <Text variant="headingLg" fontWeight="bold" as="p">
                    {detailCampaign.ctr ? `${detailCampaign.ctr}%` : "\u2014"}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Dismissals
                  </Text>
                  <Text variant="headingLg" fontWeight="bold" as="p">
                    {formatNumber(detailCampaign.closes)}
                  </Text>
                </BlockStack>
              </InlineStack>

              <Divider />

              {/* Detail chart */}
              {detailCampaign.dailyData.length > 0 ? (
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">
                    Daily Impressions
                  </Text>
                  <AreaChart
                    data={detailCampaign.dailyData}
                    dataKey="impressions"
                    color="#2563eb"
                    height={200}
                  />

                  <Text variant="headingMd" as="h3">
                    Daily Clicks
                  </Text>
                  <AreaChart
                    data={detailCampaign.dailyData}
                    dataKey="clicks"
                    color="#16a34a"
                    height={160}
                  />
                </BlockStack>
              ) : (
                <Text as="p" tone="subdued">
                  No daily data available for this campaign in the selected period.
                </Text>
              )}
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
