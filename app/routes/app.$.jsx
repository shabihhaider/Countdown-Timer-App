import { json } from "@remix-run/node";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

// Unknown admin paths land here instead of the generic error page (UX-1).
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({}, { status: 404 });
};

export default function NotFound() {
  return (
    <Page>
      <TitleBar title="Page not found" />
      <Layout>
        <Layout.Section>
          <Card>
            <EmptyState
              heading="This page does not exist"
              action={{ content: "Go to dashboard", url: "/app" }}
              image=""
            >
              <p>The link may be out of date. Your campaigns are on the dashboard.</p>
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
