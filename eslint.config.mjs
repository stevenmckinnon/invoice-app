import next from "eslint-config-next";

const config = [
  ...next,
  // Global ignores: in a flat config, `ignores` only applies globally in an
  // object of its own. Sharing an object with settings and rules, it scoped
  // only that object, so generated code and worktrees were still linted.
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      "prisma/migrations/**/migration.sql",
      // Claude Code keeps parallel sessions' git worktrees here: whole copies
      // of the repo, which would otherwise be linted as if they were source
      ".claude/**",
    ],
  },
  {
    settings: {
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"], ["object", "type"]],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "react-dom", group: "external", position: "before" },
            { pattern: "@/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
];

export default config;
