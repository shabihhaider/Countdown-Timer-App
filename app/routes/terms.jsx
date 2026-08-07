import { useRouteError } from "@remix-run/react";

export const meta = () => [{ title: "Terms of Service — Countdown Timer Bar" }];

export const headers = () => ({
  "X-Frame-Options": "DENY",
});

const SUPPORT_EMAIL = "support@countdown-timer-app.com";

const styles = {
  body: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    lineHeight: 1.7,
    color: "#1a1a2e",
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem 1.5rem 4rem",
    background: "#fff",
  },
  h1: { fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" },
  date: { fontSize: "0.85rem", color: "#6b7280", marginBottom: "2rem", display: "block" },
  h2: { fontSize: "1.15rem", fontWeight: 600, margin: "2rem 0 0.5rem", color: "#1a1a2e" },
  p: { margin: "0.5rem 0" },
  ul: { margin: "0.5rem 0 0.5rem 1.5rem" },
  a: { color: "#2563eb" },
  caps: { fontSize: "0.9rem" },
};

export default function Terms() {
  return (
    <div style={styles.body}>
      <h1 style={styles.h1}>Terms of Service</h1>
      <span style={styles.date}>Last updated: August 1, 2026</span>

      <h2 style={styles.h2}>1. Acceptance of Terms</h2>
      <p style={styles.p}>
        By installing or using Countdown Timer Bar (the &ldquo;App&rdquo;), you agree to be bound by
        these Terms of Service. If you do not agree, do not use the App.
      </p>

      <h2 style={styles.h2}>2. Description of Service</h2>
      <p style={styles.p}>
        Countdown Timer Bar is a Shopify app that enables merchants to display a customizable
        countdown timer bar on their storefront to create urgency and drive conversions during
        time-limited sales.
      </p>

      <h2 style={styles.h2}>3. Shopify Partner Agreement</h2>
      <p style={styles.p}>
        The App is built on and distributed through Shopify&rsquo;s platform. Your use is also
        subject to Shopify&rsquo;s Terms of Service and Acceptable Use Policy.
      </p>

      <h2 style={styles.h2}>4. Merchant Responsibilities</h2>
      <p style={styles.p}>As a merchant using the App, you agree to:</p>
      <ul style={styles.ul}>
        <li>Use the App only for lawful purposes and in compliance with all applicable laws.</li>
        <li>
          Not create countdown timers with false, misleading, or deceptive end dates. Using fake
          urgency that does not reflect genuine sale deadlines is prohibited.
        </li>
        <li>
          Not use the App to display illegal, harmful, threatening, abusive, or objectionable
          content.
        </li>
        <li>Maintain accurate information in your Shopify account and app settings.</li>
      </ul>

      <h2 style={styles.h2}>5. Intellectual Property</h2>
      <p style={styles.p}>
        The App and all related software, designs, and content are owned by us and protected by
        intellectual property laws. You are granted a limited, non-exclusive, non-transferable
        license to use the App for your Shopify store.
      </p>

      <h2 style={styles.h2}>6. Billing</h2>
      <p style={styles.p}>
        Paid plans are billed through Shopify&rsquo;s billing system. Subscriptions auto-renew
        monthly unless cancelled. Cancellations take effect at the end of the current billing
        period. We do not offer refunds for partial billing periods.
      </p>

      <h2 style={styles.h2}>7. Disclaimers and Limitation of Liability</h2>
      <p style={{ ...styles.p, ...styles.caps }}>
        THE APP IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF ANY KIND. WE EXPRESSLY DISCLAIM
        ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <p style={{ ...styles.p, ...styles.caps }}>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
      </p>

      <h2 style={styles.h2}>8. Indemnification</h2>
      <p style={styles.p}>
        You agree to indemnify and hold harmless us and our officers, employees, and agents from any
        claims, damages, losses, or expenses arising from your use of the App or violation of these
        Terms.
      </p>

      <h2 style={styles.h2}>9. Termination</h2>
      <p style={styles.p}>
        We may suspend or terminate your access at any time for violations of these Terms. You may
        terminate by uninstalling from your Shopify store. Upon termination, your data is deleted as
        described in our Privacy Policy.
      </p>

      <h2 style={styles.h2}>10. Changes to Terms</h2>
      <p style={styles.p}>
        We may update these Terms from time to time. Continued use of the App after changes
        constitutes acceptance of the updated Terms.
      </p>

      <h2 style={styles.h2}>11. Governing Law</h2>
      <p style={styles.p}>
        These Terms shall be governed by the laws of the jurisdiction in which we operate, without
        regard to conflict of law provisions.
      </p>

      <h2 style={styles.h2}>12. Contact</h2>
      <p style={styles.p}>
        Questions about these Terms? Contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}

export function ErrorBoundary() {
  useRouteError();
  return (
    <div style={{ ...styles.body, padding: "2rem" }}>
      <h1 style={styles.h1}>Terms of Service</h1>
      <p style={styles.p}>
        Sorry, this page could not be loaded. Please contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>{" "}
        for a copy of our Terms of Service.
      </p>
    </div>
  );
}
