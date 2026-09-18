import { Card, BlockStack, Text, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

const BILLING_PATH = "/app/billing";

/**
 * Placeholder card shown to Free-plan merchants where a Pro-only metric
 * (clicks, CTR) would render. The metric values themselves are withheld
 * server-side; this card is the upgrade path.
 */
export function LockedMetricCard({ title }) {
  const navigate = useNavigate();
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {title}
        </Text>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
          <span style={{ fontSize: "20px" }}>🔒</span>
          <Text as="p" variant="bodyLg" fontWeight="semibold" tone="subdued">
            Pro feature
          </Text>
        </div>
        <Button size="slim" onClick={() => navigate(BILLING_PATH)}>
          Upgrade to Pro
        </Button>
      </BlockStack>
    </Card>
  );
}
