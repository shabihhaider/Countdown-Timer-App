import { json, redirect } from "@remix-run/node";
import { Form, Link } from "@remix-run/react";
import { login } from "../../shopify.server";

export const meta = () => [
  { title: "Countdown Timer Bar — Honest Urgency for Shopify" },
  {
    name: "description",
    content:
      "Create real urgency with server-side countdown timers that never fake. Built-in analytics show you exactly what works.",
  },
];

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // If any Shopify params are present, redirect to /app for embedded auth
  if (url.searchParams.toString()) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // For direct browser access (non-embedded), show the landing page
  return json({ showLogin: Boolean(login) });
};

export default function LandingPage() {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1a1a2e",
        background: "#ffffff",
      }}
    >
      {/* Hero */}
      <header
        style={{
          background: "linear-gradient(135deg, #0f3d2e 0%, #1a6b4a 50%, #288d40 100%)",
          color: "#ffffff",
          padding: "80px 24px 60px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "2px",
              opacity: 0.85,
              marginBottom: 16,
            }}
          >
            Shopify App
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              margin: "0 0 20px",
              lineHeight: 1.15,
            }}
          >
            Countdown Timer Bar
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
              opacity: 0.9,
              maxWidth: 600,
              margin: "0 auto 36px",
              lineHeight: 1.6,
            }}
          >
            Create real urgency with server-side countdown timers that never fake. Built-in
            analytics show you exactly what works.
          </p>

          <Form
            method="post"
            action="/auth/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              name="shop"
              placeholder="your-store.myshopify.com"
              style={{
                padding: "14px 20px",
                fontSize: "1rem",
                borderRadius: 8,
                border: "2px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                minWidth: 280,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "14px 32px",
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: "#ffffff",
                color: "#0f3d2e",
                cursor: "pointer",
              }}
            >
              Install Free
            </button>
          </Form>
        </div>
      </header>

      {/* Timer Demo */}
      <section
        style={{
          background: "#1a6b3a",
          color: "#ffffff",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap",
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>Flash Sale Ends In...</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            { v: "02", l: "Days" },
            { v: "14", l: "Hours" },
            { v: "33", l: "Mins" },
            { v: "07", l: "Secs" },
          ].map((u, i) => (
            <span key={u.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.6 }}>:</span>}
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 44,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {u.v}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                  }}
                >
                  {u.l}
                </span>
              </span>
            </span>
          ))}
        </div>
        <span
          style={{
            padding: "10px 24px",
            background: "rgba(255,255,255,0.95)",
            color: "#111",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Shop Now
        </span>
      </section>

      {/* Key Differentiators */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: 700, marginBottom: 12 }}>
          Why Merchants Choose Us
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 48, fontSize: "1.05rem" }}>
          The only countdown timer with honest urgency and built-in ROI tracking.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 32,
          }}
        >
          {[
            {
              icon: "🔒",
              title: "Real Deadlines, Not Fake Timers",
              desc: "Server-side UTC dates that never reset on refresh. When your sale ends, it ends — building genuine trust with your customers.",
            },
            {
              icon: "📊",
              title: "Know Your ROI",
              desc: "Built-in analytics show impressions, clicks, and CTR for every campaign. No more guessing if your timer actually drives sales.",
            },
            {
              icon: "🎨",
              title: "Beautiful on Every Device",
              desc: "Fully customizable colors, real-time preview, and responsive design. Matches your brand perfectly on desktop and mobile.",
            },
            {
              icon: "⚡",
              title: "2-Minute Setup",
              desc: "No coding required. Configure your timer, choose your design, and go live instantly with our Shopify theme extension.",
            },
            {
              icon: "📅",
              title: "Schedule in Advance",
              desc: "Set start and end dates with timezone support. Perfect for BFCM, holiday sales, and product launches.",
            },
            {
              icon: "♿",
              title: "Accessible by Default",
              desc: "WCAG 2.1 AA compliant with screen reader support, keyboard navigation, and reduced-motion respect.",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                padding: 28,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "#6b7280", lineHeight: 1.6, fontSize: "0.95rem", margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "60px 24px", background: "#f9fafb" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 48 }}>Live in 3 Steps</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 40,
            }}
          >
            {[
              {
                step: "1",
                title: "Install",
                desc: "Add the app to your Shopify store. No coding required.",
              },
              {
                step: "2",
                title: "Configure",
                desc: "Set your message, dates, colors, and CTA button.",
              },
              {
                step: "3",
                title: "Go Live",
                desc: "Enable the theme extension and start driving conversions.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#288d40",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 700,
                    margin: "0 auto 16px",
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: 700, marginBottom: 48 }}>
          Simple Pricing
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          <div style={{ padding: 32, borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Free</h3>
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "8px 0 16px" }}>
              $0<span style={{ fontSize: "1rem", fontWeight: 400, color: "#6b7280" }}>/mo</span>
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 2 }}>
              <li>1 active campaign</li>
              <li>Basic analytics</li>
              <li>Color customization</li>
              <li>Mobile responsive</li>
            </ul>
          </div>
          <div
            style={{
              padding: 32,
              borderRadius: 12,
              border: "2px solid #288d40",
              background: "#f0fdf4",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -12,
                right: 20,
                background: "#288d40",
                color: "#fff",
                padding: "4px 16px",
                borderRadius: 20,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Popular
            </span>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Pro</h3>
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "8px 0 16px" }}>
              $6.99<span style={{ fontSize: "1rem", fontWeight: 400, color: "#6b7280" }}>/mo</span>
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 2 }}>
              <li>Unlimited campaigns</li>
              <li>Full analytics (clicks + CTR)</li>
              <li>Campaign scheduling</li>
              <li>All customization options</li>
              <li>7-day free trial</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 24px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#6b7280",
        }}
      >
        <p>
          <Link to="/privacy" style={{ color: "#6b7280" }}>
            Privacy Policy
          </Link>
          {" · "}
          <Link to="/terms" style={{ color: "#6b7280" }}>
            Terms of Service
          </Link>
        </p>
        <p style={{ marginTop: 8 }}>Countdown Timer Bar — Honest urgency for Shopify stores</p>
      </footer>
    </div>
  );
}
