/**
 * Test route to verify Sentry error tracking is working.
 * Deliberately throws an error that Sentry should capture.
 *
 * DELETE THIS FILE before publishing to the App Store.
 */
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Page, Card, BlockStack, Text, Button } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  if (url.searchParams.get("crash") === "server") {
    throw new Error("Sentry test: deliberate server error");
  }

  return json({ ok: true });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  throw new Error("Sentry test: deliberate action error");
};

export default function SentryTestPage() {
  return (
    <Page>
      <TitleBar title="Sentry Test" />
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            Sentry Error Tracking Test
          </Text>
          <Text as="p" tone="subdued">
            Click a button below to trigger a test error. Check your Sentry dashboard to verify it
            appears.
          </Text>
          <Button
            tone="critical"
            onClick={() => {
              throw new Error("Sentry test: deliberate client error");
            }}
          >
            Trigger Client Error
          </Button>
          <Button url="/app/sentry-test?crash=server">
            Trigger Server Error (reload with crash param)
          </Button>
        </BlockStack>
      </Card>
    </Page>
  );
}
