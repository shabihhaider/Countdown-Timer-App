import { Card, FormLayout, TextField, Text, BlockStack, Select } from "@shopify/polaris";
import {
  TIMEZONE_OPTIONS,
  ICON_OPTIONS,
  FONT_OPTIONS,
  ANIMATION_OPTIONS,
  GRADIENT_DIRECTIONS,
  PAGE_TARGETING_MODES,
  TARGET_TYPE_OPTIONS,
} from "../utils/campaign";
import { ColorPickerField } from "./ColorPickerField";
import { TemplateSelector } from "./TemplateSelector";
import { ProductTemplateSelector } from "./ProductTemplateSelector";

export function TimerScheduleSection({ formState, handleChange, fieldErrors = {} }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Timer Schedule
        </Text>
        <FormLayout>
          <Select
            label="Timer Type"
            options={[
              { label: "One-time countdown (fixed end date)", value: "one_time" },
              { label: "Daily recurring (resets every day)", value: "daily" },
              { label: "Evergreen (per-visitor timer)", value: "evergreen" },
            ]}
            value={formState.timerType}
            onChange={(v) => handleChange("timerType", v)}
            name="timerType"
            helpText="Choose how the countdown timer behaves."
          />
          <Select
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={formState.timezone}
            onChange={(v) => handleChange("timezone", v)}
            name="timezone"
            helpText="Dates are interpreted in this timezone and stored as UTC."
          />
          {formState.timerType === "one_time" && (
            <>
              <TextField
                label="Start Date & Time (optional)"
                value={formState.startDate}
                onChange={(v) => handleChange("startDate", v)}
                type="datetime-local"
                name="startDate"
                helpText="Leave empty to start immediately."
                error={fieldErrors.startDate}
              />
              <TextField
                label="End Date & Time"
                value={formState.endDate}
                onChange={(v) => handleChange("endDate", v)}
                type="datetime-local"
                name="endDate"
                helpText="When your sale ends. Must be in the future."
                error={fieldErrors.endDate}
              />
            </>
          )}
          {formState.timerType === "daily" && (
            <TextField
              label="Daily Reset Time"
              value={formState.dailyResetTime}
              onChange={(v) => handleChange("dailyResetTime", v)}
              type="time"
              name="dailyResetTime"
              helpText="The timer resets at this time every day in the selected timezone."
            />
          )}
          {formState.timerType === "evergreen" && (
            <TextField
              label="Timer Duration (minutes)"
              value={formState.evergreenMinutes}
              onChange={(v) => handleChange("evergreenMinutes", v)}
              type="number"
              name="evergreenMinutes"
              min="1"
              max="1440"
              helpText="Each visitor gets a personal countdown starting from their first visit."
            />
          )}
        </FormLayout>
      </BlockStack>
    </Card>
  );
}

export function EndActionSection({ formState, handleChange, fieldErrors = {} }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          When the Countdown Ends
        </Text>
        <FormLayout>
          <Select
            label="Action"
            options={[
              { label: "Hide the timer", value: "hide" },
              { label: 'Show "Sale Ended" message', value: "show_ended" },
              { label: "Show custom message", value: "show_custom" },
            ]}
            value={formState.endAction}
            onChange={(v) => handleChange("endAction", v)}
            helpText="What should happen when the countdown reaches zero?"
          />
          <input type="hidden" name="endAction" value={formState.endAction} />
          {formState.endAction === "show_custom" && (
            <TextField
              label="Custom End Message"
              value={formState.customEndMessage || ""}
              onChange={(v) => handleChange("customEndMessage", v)}
              name="customEndMessage"
              placeholder="Thanks for shopping with us!"
              helpText="This message will replace the countdown when it ends."
              autoComplete="off"
              error={fieldErrors.customEndMessage}
            />
          )}
        </FormLayout>
      </BlockStack>
    </Card>
  );
}

export function ProductTargetingSection({ formState, handleChange }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Product & Collection Targeting
        </Text>
        <Select
          label="Target products"
          options={TARGET_TYPE_OPTIONS}
          value={formState.targetType}
          onChange={(v) => {
            handleChange("targetType", v);
            if (v === "all") {
              handleChange("targetProductIds", "[]");
              handleChange("targetCollectionIds", "[]");
              handleChange("targetTags", "[]");
            }
          }}
          helpText="Choose which products this campaign applies to."
        />
        <input type="hidden" name="targetType" value={formState.targetType} />

        {formState.targetType === "specific_products" && (
          <TextField
            label="Product handles"
            value={(() => {
              try {
                return JSON.parse(formState.targetProductIds || "[]").join("\n");
              } catch {
                return "";
              }
            })()}
            onChange={(v) => {
              const handles = v
                .split("\n")
                .map((h) => h.trim())
                .filter(Boolean);
              handleChange("targetProductIds", JSON.stringify(handles));
            }}
            multiline={4}
            placeholder={"summer-dress\nbeach-hat\nclassic-tee"}
            helpText="One product handle per line. Find the handle in the product URL: /products/[handle]"
            autoComplete="off"
          />
        )}

        {formState.targetType === "specific_collections" && (
          <TextField
            label="Collection handles"
            value={(() => {
              try {
                return JSON.parse(formState.targetCollectionIds || "[]").join("\n");
              } catch {
                return "";
              }
            })()}
            onChange={(v) => {
              const handles = v
                .split("\n")
                .map((h) => h.trim())
                .filter(Boolean);
              handleChange("targetCollectionIds", JSON.stringify(handles));
            }}
            multiline={4}
            placeholder={"summer-sale\nclearance\nnew-arrivals"}
            helpText="One collection handle per line."
            autoComplete="off"
          />
        )}

        {formState.targetType === "tagged_products" && (
          <TextField
            label="Product tags"
            value={(() => {
              try {
                return JSON.parse(formState.targetTags || "[]").join(", ");
              } catch {
                return "";
              }
            })()}
            onChange={(v) => {
              const tags = v
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              handleChange("targetTags", JSON.stringify(tags));
            }}
            placeholder="sale, clearance, flash-deal"
            helpText="Comma-separated product tags."
            autoComplete="off"
          />
        )}

        <input type="hidden" name="targetProductIds" value={formState.targetProductIds || "[]"} />
        <input
          type="hidden"
          name="targetCollectionIds"
          value={formState.targetCollectionIds || "[]"}
        />
        <input type="hidden" name="targetTags" value={formState.targetTags || "[]"} />

        <TextField
          label="Priority"
          type="number"
          value={formState.priority}
          onChange={(v) => handleChange("priority", v)}
          name="priority"
          helpText="Higher priority campaigns take precedence when multiple match."
          autoComplete="off"
        />
      </BlockStack>
    </Card>
  );
}

export function PageTargetingSection({ formState, handleChange }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Page Targeting
        </Text>
        <Select
          label="Display mode"
          options={PAGE_TARGETING_MODES}
          value={(() => {
            try {
              return JSON.parse(formState.pageTargeting || "{}").mode || "all";
            } catch {
              return "all";
            }
          })()}
          onChange={(mode) => {
            if (mode === "all") {
              handleChange("pageTargeting", JSON.stringify({ mode: "all" }));
            } else {
              const current = (() => {
                try {
                  return JSON.parse(formState.pageTargeting || "{}");
                } catch {
                  return {};
                }
              })();
              handleChange(
                "pageTargeting",
                JSON.stringify({ mode, patterns: current.patterns || [] })
              );
            }
          }}
          helpText="Control which pages show the countdown bar."
        />
        {(() => {
          try {
            const parsed = JSON.parse(formState.pageTargeting || "{}");
            if (parsed.mode === "include" || parsed.mode === "exclude") {
              return (
                <TextField
                  label={
                    parsed.mode === "include" ? "Show only on these URLs" : "Hide on these URLs"
                  }
                  value={(parsed.patterns || []).join("\n")}
                  onChange={(v) => {
                    const patterns = v
                      .split("\n")
                      .map((p) => p.trim())
                      .filter(Boolean);
                    handleChange("pageTargeting", JSON.stringify({ mode: parsed.mode, patterns }));
                  }}
                  multiline={3}
                  placeholder={"/collections/*\n/products/sale-item\n/pages/deals"}
                  helpText="One URL pattern per line. Use * as wildcard."
                  autoComplete="off"
                />
              );
            }
            return null;
          } catch {
            return null;
          }
        })()}
        <input
          type="hidden"
          name="pageTargeting"
          value={formState.pageTargeting || '{"mode":"all"}'}
        />
        <TextField
          label="Priority"
          type="number"
          value={formState.priority}
          onChange={(v) => handleChange("priority", v)}
          name="priority"
          helpText="Higher priority campaigns take precedence when multiple are active."
          autoComplete="off"
        />
      </BlockStack>
    </Card>
  );
}

export function BarDesignSection({ formState, handleChange }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Bar Design
        </Text>
        <TemplateSelector
          onSelect={(t) => {
            handleChange("barColor", t.barColor);
            handleChange("textColor", t.textColor);
            handleChange("buttonBgColor", t.buttonBgColor);
            handleChange("buttonTextColor", t.buttonTextColor);
            handleChange("bgType", "solid");
          }}
        />
        <ColorPickerField
          label="Bar Background Color"
          value={formState.barColor}
          onChange={(v) => handleChange("barColor", v)}
          name="barColor"
        />
        <ColorPickerField
          label="Text Color"
          value={formState.textColor}
          onChange={(v) => handleChange("textColor", v)}
          name="textColor"
        />
        <ColorPickerField
          label="Button Background Color"
          value={formState.buttonBgColor}
          onChange={(v) => handleChange("buttonBgColor", v)}
          name="buttonBgColor"
        />
        <ColorPickerField
          label="Button Text Color"
          value={formState.buttonTextColor}
          onChange={(v) => handleChange("buttonTextColor", v)}
          name="buttonTextColor"
        />
        <Select
          label="Bar Position"
          options={[
            { label: "Top of page", value: "top" },
            { label: "Bottom of page", value: "bottom" },
          ]}
          value={formState.barPosition}
          onChange={(v) => handleChange("barPosition", v)}
          name="barPosition"
        />
        <Select
          label="Bar Icon"
          options={ICON_OPTIONS}
          value={formState.barIcon}
          onChange={(v) => handleChange("barIcon", v)}
          name="barIcon"
          helpText="Emoji displayed before the bar message."
        />
        <Select
          label="Font Family"
          options={FONT_OPTIONS}
          value={formState.fontFamily}
          onChange={(v) => handleChange("fontFamily", v)}
          name="fontFamily"
          helpText="Google Fonts load on-demand."
        />
        <Select
          label="Digit Animation"
          options={ANIMATION_OPTIONS}
          value={formState.animationStyle}
          onChange={(v) => handleChange("animationStyle", v)}
          name="animationStyle"
          helpText="Animation effect when digits change."
        />
        <Select
          label="Background Type"
          options={[
            { label: "Solid color", value: "solid" },
            { label: "Gradient", value: "gradient" },
          ]}
          value={formState.bgType}
          onChange={(v) => handleChange("bgType", v)}
          name="bgType"
        />
        {formState.bgType === "gradient" && (
          <>
            <Select
              label="Gradient Direction"
              options={GRADIENT_DIRECTIONS}
              value={formState.gradientDirection}
              onChange={(v) => handleChange("gradientDirection", v)}
              name="gradientDirection"
            />
            <ColorPickerField
              label="Gradient Start Color"
              value={formState.gradientColor1}
              onChange={(v) => handleChange("gradientColor1", v)}
              name="gradientColor1"
            />
            <ColorPickerField
              label="Gradient End Color"
              value={formState.gradientColor2}
              onChange={(v) => handleChange("gradientColor2", v)}
              name="gradientColor2"
            />
          </>
        )}
      </BlockStack>
    </Card>
  );
}

export function BarContentSection({ formState, handleChange, fieldErrors = {} }) {
  return (
    <>
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            Bar Content
          </Text>
          <FormLayout>
            <TextField
              label="Bar Message Text"
              value={formState.barMessage}
              onChange={(v) => handleChange("barMessage", v)}
              name="barMessage"
              placeholder="Flash Sale Ends In..."
              helpText="The main message displayed in the countdown bar (max 200 characters)."
              maxLength={200}
              showCharacterCount
              autoComplete="off"
              error={fieldErrors.barMessage}
            />
          </FormLayout>
        </BlockStack>
      </Card>
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            Call-to-Action Button
          </Text>
          <FormLayout>
            <TextField
              label="Button Text"
              value={formState.buttonText}
              onChange={(v) => handleChange("buttonText", v)}
              name="buttonText"
              placeholder="Shop Now"
              helpText="Leave blank to hide the button."
              autoComplete="off"
            />
            <TextField
              label="Button Link"
              value={formState.buttonLink}
              onChange={(v) => handleChange("buttonLink", v)}
              name="buttonLink"
              placeholder="/collections/all"
              helpText="Relative path or full URL."
              autoComplete="off"
              error={fieldErrors.buttonLink}
            />
            <TextField
              label="Discount Code (optional)"
              value={formState.discountCode}
              onChange={(v) => handleChange("discountCode", v)}
              name="discountCode"
              placeholder="SAVE20"
              helpText="Display a promo code with a copy button."
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </>
  );
}

export function ProductTimerDesignSection({ formState, handleChange }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Timer Design
        </Text>
        <ProductTemplateSelector
          onSelect={(t) => {
            handleChange("productStyle", t.productStyle);
            handleChange("accentColor", t.accentColor);
            handleChange("labelText", t.labelText);
            if (t.barIcon !== undefined) handleChange("barIcon", t.barIcon);
            if (t.textColor) handleChange("textColor", t.textColor);
            if (t.bgColor !== undefined) handleChange("barColor", t.bgColor);
          }}
        />
        <Select
          label="Timer style"
          options={[
            { label: "Minimal (text only)", value: "minimal" },
            { label: "Card (bordered box)", value: "card" },
            { label: "Badge (colored pill)", value: "badge" },
            { label: "Banner (full-width)", value: "banner" },
            { label: "Floating (sticky)", value: "floating" },
          ]}
          value={formState.productStyle || "minimal"}
          onChange={(v) => handleChange("productStyle", v)}
          name="productStyle"
          helpText="How the timer appears on product pages."
        />
        <ColorPickerField
          label="Digit Accent Color"
          value={formState.accentColor || "#dc2626"}
          onChange={(v) => handleChange("accentColor", v)}
          name="accentColor"
        />
        <ColorPickerField
          label="Text Color"
          value={formState.textColor || "#333333"}
          onChange={(v) => handleChange("textColor", v)}
          name="textColor"
        />
        <ColorPickerField
          label="Background Color"
          value={formState.barColor || ""}
          onChange={(v) => handleChange("barColor", v)}
          name="barColor"
        />
        <TextField
          label="Timer label text"
          value={formState.labelText || "Sale ends in"}
          onChange={(v) => handleChange("labelText", v)}
          name="labelText"
          autoComplete="off"
          helpText="Text shown before the countdown digits."
        />
        <Select
          label="Font Family"
          options={FONT_OPTIONS}
          value={formState.fontFamily || "system"}
          onChange={(v) => handleChange("fontFamily", v)}
          name="fontFamily"
          helpText="Google Fonts load on-demand. Web-safe fonts have zero loading time."
        />
        <Select
          label="Timer Icon"
          options={ICON_OPTIONS}
          value={formState.barIcon}
          onChange={(v) => handleChange("barIcon", v)}
          name="barIcon"
          helpText="Emoji displayed before the label text. Requires 'Show timer icon' to be enabled in the theme customizer."
        />
      </BlockStack>
    </Card>
  );
}
