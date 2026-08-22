import { Card, Text, BlockStack } from "@shopify/polaris";
import { useState, useEffect } from "react";

function computePreviewDigits(formState) {
  const timerType = formState.timerType || "one_time";

  if (timerType === "evergreen") {
    const mins = parseInt(formState.evergreenMinutes, 10) || 30;
    const totalSecs = mins * 60;
    return {
      d: Math.floor(totalSecs / 86400),
      h: Math.floor((totalSecs % 86400) / 3600),
      m: Math.floor((totalSecs % 3600) / 60),
      s: totalSecs % 60,
    };
  }

  if (timerType === "daily") {
    const resetTime = formState.dailyResetTime || "00:00";
    const [rh, rm] = resetTime.split(":").map(Number);
    const tz = formState.timezone || "UTC";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
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

export function ProductTimerPreview({ formState }) {
  const accentColor = formState.accentColor || "#dc2626";
  const textColor = formState.textColor || "#333333";
  const bgColor = formState.barColor || "";
  const labelText = formState.labelText || "Sale ends in";
  const barIcon = formState.barIcon || "";
  const style = formState.productStyle || "minimal";
  const fontFamily = formState.fontFamily || "system";

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

  const resolvedFont =
    fontFamily === "system" || fontFamily === "inherit" || !fontFamily
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : `${fontFamily}, sans-serif`;

  useEffect(() => {
    if (
      fontFamily &&
      fontFamily !== "system" &&
      fontFamily !== "inherit" &&
      !fontFamily.includes(",")
    ) {
      const id = `gfont-preview-${fontFamily.replace(/\s+/g, "-")}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [fontFamily]);

  const units = [
    { value: pad(digits.d), label: "d" },
    { value: pad(digits.h), label: "h" },
    { value: pad(digits.m), label: "m" },
    { value: pad(digits.s), label: "s" },
  ];

  function renderDigits() {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: "1px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {units.map((u, i) => (
          <span key={u.label} style={{ display: "inline-flex", alignItems: "baseline" }}>
            {i > 0 && (
              <span style={{ fontWeight: 700, opacity: 0.4, margin: "0 2px", fontSize: "0.85em" }}>
                :
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: "1em", color: accentColor }}>{u.value}</span>
            <span style={{ fontSize: "0.7em", opacity: 0.6, fontWeight: 500 }}>{u.label}</span>
          </span>
        ))}
      </span>
    );
  }

  function renderLabel() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {barIcon && (
          <span style={{ fontSize: "1.3em", lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
            {barIcon}
          </span>
        )}
        <span style={{ fontWeight: 600, fontSize: "0.9em" }}>{labelText}</span>
      </div>
    );
  }

  function renderTimer() {
    const base = {
      fontSize: "13px",
      fontFamily: resolvedFont,
      lineHeight: 1.5,
      color: textColor,
      boxSizing: "border-box",
    };

    if (style === "badge") {
      return (
        <div
          style={{
            ...base,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "20px",
            backgroundColor: bgColor || undefined,
            flexWrap: "wrap",
          }}
        >
          {renderLabel()}
          {renderDigits()}
        </div>
      );
    }

    if (style === "card") {
      return (
        <div
          style={{
            ...base,
            padding: "10px 16px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: bgColor || undefined,
            width: "100%",
          }}
        >
          {renderLabel()}
          <div style={{ marginTop: "4px" }}>{renderDigits()}</div>
        </div>
      );
    }

    if (style === "banner") {
      return (
        <div
          style={{
            ...base,
            padding: "10px 16px",
            borderLeft: `4px solid ${textColor}`,
            backgroundColor: bgColor || undefined,
            borderRadius: "0 6px 6px 0",
            width: "100%",
          }}
        >
          {renderLabel()}
          <div style={{ marginTop: "4px" }}>{renderDigits()}</div>
        </div>
      );
    }

    if (style === "floating") {
      return (
        <div
          style={{
            ...base,
            padding: "8px 16px",
            borderRadius: "8px",
            backgroundColor: bgColor || undefined,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {renderLabel()}
          <div style={{ marginTop: "4px" }}>{renderDigits()}</div>
        </div>
      );
    }

    return (
      <div style={{ ...base }}>
        {renderLabel()}
        <div style={{ marginTop: "2px" }}>{renderDigits()}</div>
      </div>
    );
  }

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h2">
          Product Timer Preview
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          How the countdown timer appears on your product pages.
        </Text>

        <div
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid var(--p-color-border)",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", gap: "16px", padding: "16px" }}>
            <div
              style={{
                width: "100px",
                height: "100px",
                background: "#f3f4f6",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  height: "12px",
                  width: "80%",
                  background: "#e5e7eb",
                  borderRadius: "3px",
                  marginBottom: "6px",
                }}
              />
              <div
                style={{
                  height: "14px",
                  width: "35%",
                  background: "#d1d5db",
                  borderRadius: "3px",
                  marginBottom: "10px",
                }}
              />

              <div style={{ margin: "0 0 10px 0" }}>{renderTimer()}</div>

              <div
                style={{
                  height: "32px",
                  background: "#111827",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: "#fff", fontSize: "11px", fontWeight: 600 }}>
                  Add to cart
                </span>
              </div>
            </div>
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}
