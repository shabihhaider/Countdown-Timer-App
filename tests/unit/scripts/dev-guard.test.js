// @vitest-environment node
/**
 * ARCH-1 / SHOP-05: `npm run dev` must never point the Shopify CLI at the
 * production app. These tests never invoke the Shopify CLI.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkDevConfig, readTomlString } from "../../../scripts/dev-guard.mjs";

const PROD = `client_id = "prod-client-id"\napplication_url = "https://prod.example.com"\n`;
const DEV = `client_id = "dev-client-id"\napplication_url = "https://dev.example.com"\n`;

describe("readTomlString", () => {
  test("reads a top-level key and ignores comments", () => {
    const toml = `# client_id = "commented"\nclient_id = "real"\n`;
    expect(readTomlString(toml, "client_id")).toBe("real");
  });

  test("returns null for a missing key", () => {
    expect(readTomlString(`name = "x"`, "client_id")).toBeNull();
  });
});

describe("checkDevConfig", () => {
  test("refuses when no dev config exists", () => {
    const result = checkDevConfig({ prodToml: PROD, devToml: null });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/shopify\.app\.dev\.toml/);
  });

  test("refuses the example placeholder client_id", () => {
    const devToml = `client_id = "REPLACE_WITH_DEV_APP_CLIENT_ID"\n`;
    const result = checkDevConfig({ prodToml: PROD, devToml });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/placeholder/i);
  });

  test("refuses a dev config without a client_id", () => {
    expect(checkDevConfig({ prodToml: PROD, devToml: `name = "x"` }).ok).toBe(false);
  });

  test("refuses a dev config that shares the production client_id", () => {
    const devToml = `client_id = "prod-client-id"\napplication_url = "https://dev.example.com"\n`;
    const result = checkDevConfig({ prodToml: PROD, devToml });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/production/i);
  });

  test.each([
    ["uppercased", `client_id = "PROD-CLIENT-ID"\n`],
    ["with a trailing space", `client_id = "prod-client-id "\n`],
    ["with a leading space", `client_id = " prod-client-id"\n`],
    ["as a unicode escape", `client_id = "\\u0070rod-client-id"\n`],
    ["as a long unicode escape", `client_id = "\\U00000070rod-client-id"\n`],
    [
      "behind a multi-line decoy",
      `x = """\nclient_id = "dev"\n"""\nclient_id = "prod-client-id"\n`,
    ],
    ["in a literal string", `client_id = "dev"\nreal = 'prod-client-id'\n`],
  ])("refuses the production client_id %s", (_name, devToml) => {
    const result = checkDevConfig({ prodToml: PROD, devToml });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/production/i);
  });

  test("refuses when the production client_id cannot be read", () => {
    expect(checkDevConfig({ prodToml: "", devToml: DEV }).ok).toBe(false);
  });

  test("accepts a separate dev app", () => {
    expect(checkDevConfig({ prodToml: PROD, devToml: DEV })).toEqual({ ok: true });
  });
});

describe("dev-guard command line", () => {
  let dir;
  const guardPath = join(process.cwd(), "scripts/dev-guard.mjs");
  const runGuard = () =>
    spawnSync(process.execPath, [guardPath], { cwd: dir, encoding: "utf8", env: {} });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dev-guard-"));
    writeFileSync(join(dir, "shopify.app.toml"), PROD);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("exits non-zero and explains itself without a dev config", () => {
    const { status, stderr } = runGuard();
    expect(status).toBe(1);
    expect(stderr).toMatch(/shopify\.app\.dev\.toml\.example/);
  });

  test("exits zero with a separate dev config", () => {
    writeFileSync(join(dir, "shopify.app.dev.toml"), DEV);
    expect(runGuard().status).toBe(0);
  });
});

describe("repository configuration", () => {
  const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

  test("production config never rewrites URLs on dev", () => {
    expect(read("shopify.app.toml")).toMatch(/^automatically_update_urls_on_dev = false\r?$/m);
  });

  test("npm run dev runs the guard first and selects the dev config", () => {
    const { dev } = JSON.parse(read("package.json")).scripts;
    expect(dev.startsWith("node scripts/dev-guard.mjs &&")).toBe(true);
    expect(dev).toMatch(/shopify app dev --config dev$/);
  });

  test("the example config holds a placeholder, not a real client_id", () => {
    const example = read("shopify.app.dev.toml.example");
    const result = checkDevConfig({ prodToml: read("shopify.app.toml"), devToml: example });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/placeholder/i);
  });
});
