/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // new feature
        "fix", // bug fix
        "refactor", // code change that is neither bug fix nor feature
        "docs", // documentation only
        "test", // test additions or corrections
        "chore", // build process or tooling
        "perf", // performance improvement
        "ci", // CI/CD changes
        "revert", // revert a previous commit
        "style", // formatting, no logic change
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [1, "always", 120],
  },
};
