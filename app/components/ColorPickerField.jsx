import { useState, useCallback } from "react";
import { BlockStack, InlineStack, Text, TextField, ColorPicker } from "@shopify/polaris";
import { hexToHsb, hsbToHex, isValidHex } from "../utils/campaign";

/**
 * Reusable color picker with hex input and preview swatch.
 *
 * @param {{ label: string, value: string, onChange: (hex: string) => void, name: string }} props
 */
export function ColorPickerField({ label, value, onChange, name }) {
  const [hexInput, setHexInput] = useState(value);

  const handlePickerChange = useCallback(
    (hsb) => {
      const hex = hsbToHex(hsb);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleHexInputChange = useCallback(
    (val) => {
      setHexInput(val);
      const normalized = val.startsWith("#") ? val : `#${val}`;
      if (isValidHex(normalized)) {
        onChange(normalized);
      }
    },
    [onChange]
  );

  return (
    <BlockStack gap="200">
      <Text variant="bodyMd" fontWeight="semibold" as="p">
        {label}
      </Text>
      <InlineStack gap="300" blockAlign="center">
        <ColorPicker onChange={handlePickerChange} color={hexToHsb(value || "#000000")} />
        <BlockStack gap="100">
          <TextField
            label="Hex code"
            labelHidden
            value={hexInput}
            onChange={handleHexInputChange}
            autoComplete="off"
            prefix="#"
            placeholder="000000"
            monospaced
            maxLength={7}
          />
          <div
            style={{
              width: "80px",
              height: "36px",
              backgroundColor: value,
              borderRadius: "6px",
              border: "1px solid var(--p-color-border)",
            }}
            aria-label={`Current color: ${value}`}
          />
        </BlockStack>
      </InlineStack>
      <input type="hidden" name={name} value={value} />
    </BlockStack>
  );
}
