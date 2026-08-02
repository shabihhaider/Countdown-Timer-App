/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "plugin:security/recommended-legacy",
    "prettier",
  ],
  plugins: ["security", "sonarjs"],
  globals: {
    shopify: "readonly",
    // Vitest globals (replaces jest in tests)
    describe: "readonly",
    it: "readonly",
    test: "readonly",
    expect: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    beforeAll: "readonly",
    afterAll: "readonly",
    vi: "readonly",
  },
  rules: {
    // ── Security ──────────────────────────────────────────────────────────
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-possible-timing-attacks": "warn",

    // ── Code quality (SonarJS) ────────────────────────────────────────────
    "sonarjs/no-duplicate-string": ["warn", { "threshold": 5 }],
    "sonarjs/no-identical-functions": "warn",
    "sonarjs/cognitive-complexity": ["warn", 15],
    "sonarjs/no-redundant-boolean": "error",
    "sonarjs/no-unused-collection": "warn",

    // ── General ───────────────────────────────────────────────────────────
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
  },
  overrides: [
    {
      // Relax some rules inside test files
      files: ["tests/**/*.{js,jsx,ts,tsx}", "**/*.test.{js,jsx,ts,tsx}"],
      rules: {
        "security/detect-object-injection": "off",
        "security/detect-non-literal-regexp": "off",
        "no-console": "off",
        "sonarjs/no-duplicate-string": "off",
      },
    },
    {
      // Scripts can use console
      files: ["scripts/**/*.{js,sh}"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
