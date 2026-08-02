import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  EmptyState,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";

/**
 * Format a date for display as "MM/DD/YYYY HH:MM".
 * @param {string | Date | null} date
 * @returns {string}
 */
function formatEndDate(date) {
  if (!date) {
    return "No end date set";
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "No end date set";
  }

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `Ends: ${month}/${day}/${year} ${hours}:${minutes}`;
}

/** @type {import("@remix-run/node").LoaderFunction} */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ campaigns });
}

/** @type {import("@remix-run/node").ActionFunction} */
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");
  const campaignId = Number(formData.get("campaignId"));

  if (!campaignId || Number.isNaN(campaignId)) {
    return json({ success: false, error: "Invalid campaign ID" }, { status: 400 });
  }

  // Verify ownership before any mutation
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, shop },
  });

  if (!campaign) {
    return json({ success: false, error: "Campaign not found" }, { status: 404 });
  }

  if (intent === "toggle") {
    await db.campaign.update({
      where: { id: campaignId },
      data: { isActive: !campaign.isActive },
    });

    return json({ success: true });
  }

  if (intent === "delete") {
    await db.campaign.delete({
      where: { id: campaignId },
    });

    return json({ success: true });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

export default function CampaignsPage() {
  const { campaigns } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const isSubmitting = navigation.state === "submitting";

  /**
   * Determine which campaign ID is currently being acted on,
   * so we can show a loading state on the correct row.
   */
  const submittingCampaignId = isSubmitting ? Number(navigation.formData?.get("campaignId")) : null;

  const submittingIntent = isSubmitting ? navigation.formData?.get("intent") : null;

  if (campaigns.length === 0) {
    return (
      <Page>
        <TitleBar title="Campaigns" />
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="No campaigns yet"
                action={{
                  content: "Create Campaign",
                  url: "/app",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create your first countdown timer to start driving conversions.</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Campaigns">
        <button variant="primary" onClick={() => navigate("/app")}>
          New Campaign
        </button>
      </TitleBar>

      <Layout>
        <Layout.Section>
          <Card padding="0">
            <ResourceList
              resourceName={{ singular: "campaign", plural: "campaigns" }}
              items={campaigns}
              renderItem={(campaign) => {
                const { id, name, isActive, endDate, barMessage } = campaign;

                const isRowSubmitting = submittingCampaignId === id;
                const isToggling = isRowSubmitting && submittingIntent === "toggle";
                const isDeleting = isRowSubmitting && submittingIntent === "delete";

                return (
                  <ResourceItem id={String(id)} accessibilityLabel={`View details for ${name}`}>
                    <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text variant="bodyMd" fontWeight="bold" as="span">
                            {name}
                          </Text>
                          <Badge tone={isActive ? "success" : undefined}>
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </InlineStack>

                        <Text variant="bodySm" tone="subdued" as="span">
                          {barMessage}
                        </Text>

                        <Text variant="bodySm" tone="subdued" as="span">
                          {formatEndDate(endDate)}
                        </Text>
                      </BlockStack>

                      <InlineStack gap="200" blockAlign="center">
                        <Form method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="campaignId" value={id} />
                          <Button
                            submit
                            variant="secondary"
                            loading={isToggling}
                            disabled={isSubmitting}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </Form>

                        <Button url="/app" disabled={isSubmitting}>
                          Edit
                        </Button>

                        <Form method="post">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="campaignId" value={id} />
                          <Button
                            submit
                            variant="primary"
                            tone="critical"
                            loading={isDeleting}
                            disabled={isSubmitting}
                          >
                            Delete
                          </Button>
                        </Form>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
