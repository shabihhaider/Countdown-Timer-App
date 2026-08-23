import { BlockStack, Text } from "@shopify/polaris";
import { useCallback } from "react";
import { TIMER_TEMPLATES } from "../utils/templates";

/**
 * Visual template selector for campaign design. Shows curated color
 * combinations as clickable mini-previews that pre-fill the color fields.
 *
 * @param {{ onSelect: (template: typeof TIMER_TEMPLATES[0]) => void }} props
 */
export function TemplateSelector({ onSelect }) {
  return (
    <BlockStack gap="300">
      <Text variant="bodyMd" fontWeight="semibold" as="p">
        Quick Start Templates
      </Text>
      <Text variant="bodySm" tone="subdued" as="p">
        Click a template to apply its colors. You can customize further below.
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {TIMER_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} onSelect={onSelect} />
        ))}
      </div>
    </BlockStack>
  );
}

function TemplateCard({ template, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(template);
  }, [template, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        border: "1px solid var(--p-color-border)",
        borderRadius: "8px",
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--p-color-bg-surface)",
        textAlign: "left",
        transition: "box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      aria-label={`Apply ${template.name} template`}
    >
      {/* Mini bar preview */}
      <div
        style={{
          backgroundColor: template.barColor,
          color: template.textColor,
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          fontSize: "9px",
          fontWeight: 600,
          fontFamily: "-apple-system, sans-serif",
          minHeight: "32px",
        }}
      >
        <span style={{ opacity: 0.9 }}>Sale Ends</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: "11px" }}>
          02:14
        </span>
        <span
          style={{
            backgroundColor: template.buttonBgColor,
            color: template.buttonTextColor,
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "8px",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Shop
        </span>
      </div>

      {/* Label */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--p-color-text)" }}>
          {template.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--p-color-text-subdued)", marginTop: "2px" }}>
          {template.description}
        </div>
      </div>
    </button>
  );
}
