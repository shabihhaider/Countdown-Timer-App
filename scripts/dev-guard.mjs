#!/usr/bin/env node
/**
 * Refuses `npm run dev` unless a separate Shopify dev app is configured.
 *
 * shopify.app.toml is the PRODUCTION app. Running `shopify app dev` against it
 * can repoint production URLs at a tunnel that dies with the dev session, which
 * breaks the embedded admin for every merchant.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PROD_CONFIG = "shopify.app.toml";
const DEV_CONFIG = "shopify.app.dev.toml";
const PLACEHOLDER_PREFIX = "REPLACE_WITH";

/**
 * Read a top-level `key = "value"` from TOML text. Enough for the flat keys
 * used here, so no TOML parser dependency is needed.
 *
 * @param {string} toml
 * @param {string} key
 * @returns {string | null}
 */
export function readTomlString(toml, key) {
  const match = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : null;
}

/**
 * Compare in this form, so that case and TOML escapes cannot hide the ID.
 *
 * @param {string} text
 * @returns {string}
 */
function foldForComparison(text) {
  return text
    .replace(/\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/g, (_match, short, long) =>
      String.fromCodePoint(Number.parseInt(short ?? long, 16))
    )
    .toLowerCase();
}

/**
 * @param {{ prodToml: string, devToml: string | null }} configs
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkDevConfig({ prodToml, devToml }) {
  if (devToml === null) {
    return { ok: false, reason: `${DEV_CONFIG} does not exist.` };
  }

  const prodClientId = readTomlString(prodToml, "client_id");
  if (!prodClientId) {
    return { ok: false, reason: `Could not read client_id from ${PROD_CONFIG}.` };
  }

  const devClientId = readTomlString(devToml, "client_id");
  if (!devClientId) {
    return { ok: false, reason: `${DEV_CONFIG} has no client_id.` };
  }
  if (devClientId.startsWith(PLACEHOLDER_PREFIX)) {
    return { ok: false, reason: `${DEV_CONFIG} still has the placeholder client_id.` };
  }
  // Anywhere in the file, not only in the value read above: this reader is
  // line-based and can be fooled by multi-line strings. A false refusal is safe.
  if (foldForComparison(devToml).includes(foldForComparison(prodClientId).trim())) {
    return { ok: false, reason: `${DEV_CONFIG} uses the production client_id.` };
  }

  return { ok: true };
}

function main() {
  const result = checkDevConfig({
    prodToml: existsSync(PROD_CONFIG) ? readFileSync(PROD_CONFIG, "utf8") : "",
    devToml: existsSync(DEV_CONFIG) ? readFileSync(DEV_CONFIG, "utf8") : null,
  });
  if (result.ok) return;

  console.error(`\nnpm run dev refused: ${result.reason}`);
  console.error(`${PROD_CONFIG} is the production app; dev must use a separate Shopify app.`);
  console.error(`Copy ${DEV_CONFIG}.example to ${DEV_CONFIG} and fill in your dev app's values.\n`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
