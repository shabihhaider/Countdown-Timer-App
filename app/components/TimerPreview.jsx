import { Card, Text, BlockStack } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { GOOGLE_FONT_FAMILIES } from "../utils/campaign";

function computePreviewDigits(formState) {
  const timerType = formState.timerType || "one_time";

  if (timerType === "evergreen") {
    const mins = parseInt(formState.evergreenMinutes, 10) || 30;
    const totalSecs = mins * 60;
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return { d, h, m, s };
  }

  if (timerType === "daily") {
    const resetTime = formState.dailyResetTime || "00:00";
    const [rh, rm] = resetTime.split(":").map(Number);
    const now = new Date();
    const tz = formState.timezone || "UTC";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
      const nowSecs = get("hour") * 3600 + get("minute") * 60 + get("second");
      const resetSecs = rh * 3600 + rm * 60;
      const diff = resetSecs > nowSecs ? resetSecs - nowSecs : 86400 - nowSecs + resetSecs;
      return {
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      };
    } catch {
      return { d: 0, h: 23, m: 59, s: 59 };
    }
  }

  if (timerType === "one_time" && formState.endDate) {
    const tz = formState.timezone || "UTC";
    try {
      const [datePart, timePart] = formState.endDate.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      const utcString = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
      const tzString = tempDate.toLocaleString("en-US", { timeZone: tz });
      const offsetMs = new Date(tzString).getTime() - new Date(utcString).getTime();
      const endUtcMs = tempDate.getTime() - offsetMs;
      const diff = Math.max(0, Math.floor((endUtcMs - Date.now()) / 1000));
      return {
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      };
    } catch {
      return { d: 0, h: 0, m: 0, s: 0 };
    }
  }

  return { d: 0, h: 0, m: 0, s: 0 };
}

function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

export function TimerPreview({ formState }) {
  const bgColor = formState.barColor || "#288d40";
  const txtColor = formState.textColor || "#ffffff";
  const btnTxtColor = formState.buttonTextColor || "#111111";
  const btnBgColor = formState.buttonBgColor || "#ffffff";
  const message = formState.barMessage || "Flash Sale Ends In...";
  const buttonText = formState.buttonText || "";
  const discountCode = formState.discountCode || "";
  const fontFamily = formState.fontFamily || "system";
  const barIcon = formState.barIcon || "";
  const position = formState.barPosition || "top";

  const [digits, setDigits] = useState(() => computePreviewDigits(formState));

  useEffect(() => {
    setDigits(computePreviewDigits(formState));
    const id = setInterval(() => setDigits(computePreviewDigits(formState)), 1000);
    return () => clearInterval(id);
  }, [
    formState.timerType,
    formState.evergreenMinutes,
    formState.endDate,
    formState.dailyResetTime,
    formState.timezone,
  ]);

  const isGoogleFont =
    fontFamily &&
    !["system", "inherit"].includes(fontFamily) &&
    !fontFamily.includes(",") &&
    GOOGLE_FONT_FAMILIES.includes(fontFamily);
  const googleFontUrl = isGoogleFont
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`
    : null;

  const barBackground =
    formState.bgType === "gradient"
      ? {
          background: `linear-gradient(${formState.gradientDirection || "to right"}, ${formState.gradientColor1 || "#667eea"}, ${formState.gradientColor2 || "#764ba2"})`,
        }
      : { backgroundColor: bgColor };

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h2">
          Live Preview
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          This is how your countdown bar will appear on your storefront.
        </Text>

        {googleFontUrl && <link rel="stylesheet" href={googleFontUrl} />}

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

          <div
            style={{
              ...barBackground,
              color: txtColor,
              padding: "10px 16px",
              fontFamily:
                fontFamily === "system"
                  ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  : fontFamily === "inherit"
                    ? "inherit"
                    : fontFamily,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.2px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {barIcon && (
                <span style={{ fontSize: "18px", lineHeight: 1 }} aria-hidden="true">
                  {barIcon}
                </span>
              )}
              {message}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {[
                { value: pad(digits.d), label: "Days" },
                { value: pad(digits.h), label: "Hours" },
                { value: pad(digits.m), label: "Mins" },
                { value: pad(digits.s), label: "Secs" },
              ].map((unit, i) => (
                <span
                  key={unit.label}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {i > 0 && (
                    <span style={{ fontSize: "16px", fontWeight: 700, opacity: 0.65 }}>:</span>
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

            {discountCode && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px dashed rgba(255,255,255,0.5)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "13px",
                }}
              >
                <span style={{ fontWeight: 700, letterSpacing: "1px", fontFamily: "monospace" }}>
                  {discountCode}
                </span>
                <span
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  Copy
                </span>
              </span>
            )}

            {buttonText && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "10px 24px",
                  backgroundColor: btnBgColor,
                  color: btnTxtColor,
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  cursor: "default",
                }}
              >
                {buttonText}
              </span>
            )}

            <span
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "default",
                color: "#ffffff",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

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
