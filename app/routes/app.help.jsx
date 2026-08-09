import { Page, Card, BlockStack, Text, Collapsible } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I add the countdown timer to my store?",
        a: "Go to your Shopify admin → Online Store → Themes → Customize. In the theme editor, go to App embeds (left sidebar) and enable 'Countdown & CTA Bar'. Save your theme. The timer will appear based on your active campaign settings.",
      },
      {
        q: "Why isn't my timer showing on the storefront?",
        a: "Check these common causes:\n• Make sure the campaign is set to Active\n• Verify the end date is in the future\n• Confirm the theme extension is enabled in your theme editor (App embeds)\n• Check page targeting settings — the timer may be excluded from the page you're viewing\n• For daily timers, verify the reset time hasn't passed yet today",
      },
      {
        q: "How do I create my first campaign?",
        a: "From the Dashboard, click 'Create Campaign'. Fill in a name, message, end date, and choose your colors. Click 'Create Campaign' and it's live immediately if marked as Active.",
      },
    ],
  },
  {
    title: "Timer Types",
    items: [
      {
        q: "What's the difference between one-time, daily, and evergreen timers?",
        a: "• One-time: Counts down to a fixed date/time. When it reaches zero, it's done.\n• Daily recurring: Resets every day at a time you choose. Great for daily deals.\n• Evergreen (per-visitor): Each visitor gets their own personal countdown starting from their first visit. The timer only shows once per visitor.",
      },
      {
        q: "Are the timers real or fake?",
        a: "Our timers are 100% real. End dates are stored server-side in UTC and enforced across all browsers. They don't reset on page refresh, incognito mode, or different devices. When your sale ends, it actually ends.",
      },
    ],
  },
  {
    title: "Design & Customization",
    items: [
      {
        q: "How do I change colors and fonts?",
        a: "Edit your campaign → scroll to the Design section. You can set background color, text color, button colors, font family, and animation style. Use the Quick Start Templates to apply a pre-built color scheme with one click.",
      },
      {
        q: "Can I customize the timer from the theme editor?",
        a: "Yes! In your theme editor (Online Store → Themes → Customize), click the Countdown & CTA Bar in App embeds. You can adjust background color, text color, accent color, font size, bar padding, position, and show/hide the close button — all with live preview.",
      },
      {
        q: "What fonts are available?",
        a: "We offer 8 web-safe fonts that load instantly with zero performance impact: System default, Theme font (inherits your store's font), Georgia, Times New Roman, Verdana, Trebuchet MS, Courier New, and Impact.",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        q: "What metrics are tracked?",
        a: "We track four metrics per campaign:\n• Impressions — how many times the timer was displayed\n• Clicks — how many times the CTA button was clicked\n• CTR (Click-Through Rate) — clicks divided by impressions\n• Dismissals — how many times visitors closed the bar",
      },
      {
        q: "How do I see analytics for a specific campaign?",
        a: "Go to Analytics and click on any campaign row or the 'Details' button. A popup shows the campaign's daily impressions and clicks charts with summary stats.",
      },
    ],
  },
  {
    title: "Page Targeting",
    items: [
      {
        q: "How do I show the timer only on certain pages?",
        a: "Edit your campaign → scroll to Page Targeting. Choose 'Only show on these pages' or 'Hide on these pages', then enter URL patterns. Use * as a wildcard — for example, /collections/* matches all collection pages.",
      },
    ],
  },
  {
    title: "Billing & Plans",
    items: [
      {
        q: "What's included in the Free plan?",
        a: "1 active campaign, announcement bar timer, basic analytics (impressions), color customization, close button, and mobile responsive design.",
      },
      {
        q: "What does the Pro plan include?",
        a: "Unlimited active campaigns, full analytics (impressions, clicks, CTR, dismissals), campaign scheduling with timezone support, all design customization, discount code display, page targeting, and priority support. $6.99/month with a 7-day free trial.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        q: "The timer shows the wrong time. How do I fix it?",
        a: "Check your campaign's timezone setting. If you're in New York, make sure 'Eastern Time (ET)' is selected. The timer converts your local time to UTC for consistent display across all visitors.",
      },
      {
        q: "Will this app slow down my store?",
        a: "No. The timer uses a lightweight vanilla JavaScript widget (no jQuery or heavy frameworks), loads only on pages where it's needed, and uses requestAnimationFrame for smooth updates without page reflow. The CSS is minimal and scoped to prevent conflicts.",
      },
      {
        q: "What happens when I uninstall the app?",
        a: "All your data (campaigns, analytics, settings) is automatically deleted from our servers within 48 hours. The countdown bar disappears from your store immediately. No leftover code remains in your theme.",
      },
    ],
  },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 0" }}>
      <div
        onClick={toggle}
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {question}
        </Text>
        <Text variant="bodyMd" tone="subdued" as="span">
          {open ? "−" : "+"}
        </Text>
      </div>
      <Collapsible open={open} transition={{ duration: "200ms", timingFunction: "ease-in-out" }}>
        <div style={{ paddingTop: "8px" }}>
          <Text variant="bodyMd" tone="subdued" as="p">
            {answer.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < answer.split("\n").length - 1 && <br />}
              </span>
            ))}
          </Text>
        </div>
      </Collapsible>
    </div>
  );
}

export default function HelpPage() {
  return (
    <Page>
      <TitleBar title="Help & FAQ" />
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="200">
            <Text variant="headingLg" as="h1">
              Help Center
            </Text>
            <Text variant="bodyMd" tone="subdued" as="p">
              Find answers to common questions about setting up and using the Countdown Timer Bar.
            </Text>
          </BlockStack>
        </Card>

        {FAQ_SECTIONS.map((section) => (
          <Card key={section.title}>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                {section.title}
              </Text>
              {section.items.map((item) => (
                <FAQItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </BlockStack>
          </Card>
        ))}

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              Still need help?
            </Text>
            <Text variant="bodyMd" as="p">
              Contact us at{" "}
              <a href="mailto:support@countdown-timer-app.com" style={{ color: "#2563eb" }}>
                support@countdown-timer-app.com
              </a>
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
