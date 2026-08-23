import { BlockStack, Text } from "@shopify/polaris";
import { useCallback } from "react";
import { PRODUCT_TIMER_TEMPLATES } from "../utils/templates";

export function ProductTemplateSelector({ onSelect }) {
  return (
    <BlockStack gap="300">
      <Text variant="bodyMd" fontWeight="semibold" as="p">
        Product Timer Templates
      </Text>
      <Text variant="bodySm" tone="subdued" as="p">
        Quick-start styles for your product page timer.
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {PRODUCT_TIMER_TEMPLATES.map((template) => (
          <ProductTemplateCard key={template.id} template={template} onSelect={onSelect} />
        ))}
      </div>
    </BlockStack>
  );
}

function ProductTemplateCard({ template, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(template);
  }, [template, onSelect]);

  const previewBg = template.bgColor || "#ffffff";

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
      <div
        style={{
          backgroundColor: previewBg,
          padding: "10px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "10px",
          fontWeight: 600,
          fontFamily: "-apple-system, sans-serif",
          minHeight: "36px",
          color: template.textColor,
          borderLeft:
            template.productStyle === "banner"
              ? `4px solid ${template.textColor || "#333"}`
              : "none",
          borderRadius:
            template.productStyle === "badge"
              ? "16px"
              : template.productStyle === "card"
                ? "6px"
                : 0,
          margin: template.productStyle === "badge" || template.productStyle === "card" ? "4px" : 0,
          border: template.productStyle === "card" ? "1px solid #e5e7eb" : undefined,
        }}
      >
        {template.barIcon && <span style={{ fontSize: "12px" }}>{template.barIcon}</span>}
        <span style={{ opacity: 0.9 }}>{template.labelText}</span>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            color: template.accentColor,
            marginLeft: "auto",
          }}
        >
          02:14
        </span>
      </div>

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
