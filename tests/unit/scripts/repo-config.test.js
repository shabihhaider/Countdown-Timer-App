// @vitest-environment node
/** ARCH-5, ARCH-7, ARCH-9: static checks on build and CI configuration. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const pkg = JSON.parse(read("package.json"));

describe("build configuration", () => {
  test("Docker's default Node satisfies package.json engines", () => {
    const dockerNode = Number(read("Dockerfile").match(/^ARG NODE_VERSION=(\d+)/m)[1]);
    const minimum = Number(pkg.engines.node.match(/(\d+)/)[1]);
    expect(dockerNode).toBeGreaterThanOrEqual(minimum);
  });

  test("Vercel installs from the lockfile", () => {
    expect(JSON.parse(read("vercel.json")).installCommand).toBe("npm ci");
  });

  test("CI's audit can fail the build", () => {
    const steps = read(".github/workflows/ci.yml");
    expect(steps).toMatch(/run: npm audit --audit-level=critical --omit=dev\r?$/m);
  });
});

describe("dependency manifest", () => {
  test("every imported Shopify package is declared", () => {
    expect(read("app/routes/app.onboarding.jsx")).toContain("@shopify/polaris-icons");
    expect(pkg.dependencies["@shopify/polaris-icons"]).toBeDefined();
  });

  test("the lockfile root matches package.json", () => {
    const lock = JSON.parse(read("package-lock.json"));
    expect(lock.packages[""].dependencies["@shopify/polaris-icons"]).toBe(
      pkg.dependencies["@shopify/polaris-icons"]
    );
  });
});
