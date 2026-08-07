import { Card, Text, BlockStack } from "@shopify/polaris";

/**
 * Live preview of the countdown bar that updates in real-time as the merchant
 * changes settings. Mirrors the HTML structure from the storefront extension.
 *
 * @param {{ formState: Record<string, string> }} props
 */
export function TimerPreview({ formState }) {
  const bgColor = formState.barColor || "#288d40";
  const txtColor = formState.textColor || "#ffffff";
  const btnTxtColor = formState.buttonTextColor || "#111111";
  const btnBgColor = formState.buttonBgColor || "#ffffff";
  const message = formState.barMessage || "Flash Sale Ends In...";
  const buttonText = formState.buttonText || "";
  const position = formState.barPosition || "top";

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h2">
          Live Preview
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          This is how your countdown bar will appear on your storefront.
        </Text>

        {/* Preview container */}
        <div
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid var(--p-color-border)",
            background: "#f6f6f7",
            minHeight: "200px",
            display: "flex",
            flexDirection: "column",
            justifyContent: position === "bottom" ? "flex-end" : "flex-start",
          }}
        >
          {/* Simulated page content */}
          {position === "bottom" && (
            <div style={{ padding: "20px", textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: "60%",
                  height: "12px",
                  background: "#ddd",
                  borderRadius: "6px",
                  margin: "0 auto 10px",
                }}
              />
              <div
                style={{
                  width: "40%",
                  height: "10px",
                  background: "#e5e5e5",
                  borderRadius: "5px",
                  margin: "0 auto",
                }}
              />
            </div>
          )}

          {/* The actual bar preview */}
          <div
            style={{
              backgroundColor: bgColor,
              color: txtColor,
              padding: "10px 16px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Message */}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.2px",
              }}
            >
              {message}
            </span>

            {/* Timer digits */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {[
                { value: "02", label: "Days" },
                { value: "14", label: "Hours" },
                { value: "33", label: "Mins" },
                { value: "07", label: "Secs" },
              ].map((unit, i) => (
                <span
                  key={unit.label}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {i > 0 && (
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        opacity: 0.65,
                      }}
                    >
                      :
                    </span>
                  )}
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: "36px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {unit.value}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        textTransform: "uppercase",
                        marginTop: "2px",
                        opacity: 0.85,
                        fontWeight: 500,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {unit.label}
                    </span>
                  </span>
                </span>
              ))}
            </div>

            {/* CTA Button */}
            {buttonText && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "36px",
                  padding: "8px 20px",
                  backgroundColor: btnBgColor,
                  color: btnTxtColor,
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  cursor: "default",
                }}
              >
                {buttonText}
              </span>
            )}

            {/* Close button */}
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "default",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          {/* Simulated page content */}
          {position === "top" && (
            <div style={{ padding: "20px", textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: "60%",
                  height: "12px",
                  background: "#ddd",
                  borderRadius: "6px",
                  margin: "0 auto 10px",
                }}
              />
              <div
                style={{
                  width: "40%",
                  height: "10px",
                  background: "#e5e5e5",
                  borderRadius: "5px",
                  margin: "0 auto",
                }}
              />
            </div>
          )}
        </div>
      </BlockStack>
    </Card>
  );
}
