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
  Modal,
  Toast,
  Frame,
} from "@shopify/polaris";
import { useState } from "react";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { getCampaignStatus } from "../utils/campaign";

function formatEndDate(date) {
  if (!date) return "No end date set";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "No end date set";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const campaigns = await db.campaign.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  const campaignsWithStatus = campaigns.map((c) => ({
    ...c,
    endDate: c.endDate?.toISOString() ?? null,
    startDate: c.startDate?.toISOString() ?? null,
    status: getCampaignStatus(c),
  }));

  return json({ campaigns: campaignsWithStatus });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");
  const campaignId = Number(formData.get("campaignId"));

  if (!campaignId || isNaN(campaignId)) {
    return json({ success: false, error: "Invalid campaign ID" }, { status: 400 });
  }

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
    return json({ success: true, action: "toggle" });
  }

  if (intent === "delete") {
    await db.campaign.delete({ where: { id: campaignId } });
    return json({ success: true, action: "delete" });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

export default function CampaignsPage() {
  const { campaigns } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting";
  const submittingCampaignId = isSubmitting ? Number(navigation.formData?.get("campaignId")) : null;
  const submittingIntent = isSubmitting ? navigation.formData?.get("intent") : null;

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("campaignId", String(deleteTarget.id));
    submit(formData, { method: "post" });
    setDeleteTarget(null);
  };

  // Toast for successful actions
  const showToast = actionData?.success && actionData?.action;
  const toastMessage =
    actionData?.action === "delete"
      ? "Campaign deleted"
      : actionData?.action === "toggle"
        ? "Campaign updated"
        : "";

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
                  url: "/app/campaigns/new",
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
    <Frame>
      <Page>
        <TitleBar title="Campaigns">
          <button variant="primary" onClick={() => navigate("/app/campaigns/new")}>
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
                  const { id, name, barMessage, endDate, status } = campaign;
                  const isRowSubmitting = submittingCampaignId === id;
                  const isToggling = isRowSubmitting && submittingIntent === "toggle";

                  return (
                    <ResourceItem
                      id={String(id)}
                      onClick={() => navigate(`/app/campaigns/${id}`)}
                      accessibilityLabel={`Edit ${name}`}
                    >
                      <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                              {name}
                            </Text>
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </InlineStack>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {barMessage}
                          </Text>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {formatEndDate(endDate)}
                          </Text>
                        </BlockStack>

                        <InlineStack gap="200" blockAlign="center">
                          <form
                            method="post"
                            onSubmit={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <input type="hidden" name="intent" value="toggle" />
                            <input type="hidden" name="campaignId" value={id} />
                            <Button
                              submit
                              variant="secondary"
                              loading={isToggling}
                              disabled={isSubmitting}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {campaign.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </form>

                          <Button
                            tone="critical"
                            variant="primary"
                            disabled={isSubmitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id, name });
                            }}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </Card>
          </Layout.Section>
        </Layout>

        {/* Delete confirmation modal */}
        <Modal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          title="Delete campaign?"
          primaryAction={{
            content: "Delete campaign",
            destructive: true,
            onAction: handleDeleteConfirm,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setDeleteTarget(null),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its
              analytics data. This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {showToast && <Toast content={toastMessage} onDismiss={() => {}} duration={3000} />}
      </Page>
    </Frame>
  );
}
