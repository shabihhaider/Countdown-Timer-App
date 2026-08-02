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
};

export default function Privacy() {
  return (
    <div style={styles.body}>
      <h1 style={styles.h1}>Privacy Policy</h1>
      <span style={styles.date}>Last updated: August 1, 2026</span>

      <h2 style={styles.h2}>1. Introduction</h2>
      <p style={styles.p}>
        Countdown Timer Bar (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a Shopify
        application that provides countdown timer functionality for Shopify merchants. This Privacy
        Policy explains how we collect, use, and protect information when you use our app.
      </p>

      <h2 style={styles.h2}>2. Information We Collect</h2>
      <p style={styles.p}>We collect only the minimum information necessary to operate the app:</p>
      <ul style={styles.ul}>
        <li>
          <strong>Shop domain</strong> &mdash; your Shopify store&rsquo;s .myshopify.com domain,
          used to identify your account and retrieve your settings.
        </li>
        <li>
          <strong>App settings</strong> &mdash; the configuration you enter (bar message, colors,
          end date, button text, button link). This is merchant-provided content only.
        </li>
        <li>
          <strong>Shopify session data</strong> &mdash; OAuth access tokens required to authenticate
          your Shopify admin session. These are stored securely and used solely to authenticate
          requests.
        </li>
      </ul>
      <p style={styles.p}>
        We do <strong>not</strong> collect, store, or process any of your customers&rsquo; personal
        information. The countdown bar displayed on your storefront does not collect visitor data.
      </p>

      <h2 style={styles.h2}>3. How We Use Information</h2>
      <p style={styles.p}>We use the information collected solely to:</p>
      <ul style={styles.ul}>
        <li>Authenticate your Shopify admin session.</li>
        <li>Store and serve your countdown bar settings to your storefront.</li>
        <li>Provide support when you contact us.</li>
      </ul>
      <p style={styles.p}>
        We do not sell, rent, or share your data with any third parties for marketing or advertising
        purposes.
      </p>

      <h2 style={styles.h2}>4. Data Storage and Security</h2>
      <p style={styles.p}>
        Your data is stored in a PostgreSQL database hosted on infrastructure with industry-standard
        security controls. Access tokens are stored to maintain your authenticated session and are
        encrypted in transit via HTTPS. We retain your data for as long as your app is installed.
      </p>

      <h2 style={styles.h2}>5. Data Deletion</h2>
      <p style={styles.p}>
        When you uninstall the app, all your data (settings and session records) is automatically
        and permanently deleted from our systems via Shopify&rsquo;s app/uninstalled webhook. You
        may also request deletion by contacting us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2 style={styles.h2}>6. GDPR (European Users)</h2>
      <p style={styles.p}>
        If you are located in the European Economic Area (EEA), you have the following rights:
      </p>
      <ul style={styles.ul}>
        <li>Right to access &mdash; request a copy of the data we hold about you.</li>
        <li>Right to rectification &mdash; request correction of inaccurate data.</li>
        <li>Right to erasure &mdash; request deletion of your data.</li>
        <li>Right to data portability &mdash; request transfer of your data.</li>
      </ul>
      <p style={styles.p}>
        To exercise any of these rights, contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2 style={styles.h2}>7. CCPA (California Users)</h2>
      <p style={styles.p}>
        If you are a California resident, you have the right to know what personal information we
        collect and to request deletion of your data. We do not sell personal information. Contact{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2 style={styles.h2}>8. Third-Party Services</h2>
      <p style={styles.p}>
        We integrate with Shopify&rsquo;s platform and APIs. Shopify&rsquo;s own Privacy Policy
        governs data shared through those integrations. We do not use third-party analytics,
        advertising, or tracking services.
      </p>

      <h2 style={styles.h2}>9. Changes to This Policy</h2>
      <p style={styles.p}>
        We may update this Privacy Policy from time to time. Material changes will be communicated
        through the Shopify App Store listing or via email.
      </p>

      <h2 style={styles.h2}>10. Contact</h2>
      <p style={styles.p}>
        Questions about this Privacy Policy? Contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.a}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
