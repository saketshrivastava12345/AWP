import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Ground rule: no `any` unless unavoidable (and then with an explanatory
      // comment plus an inline eslint-disable, so every escape hatch is visible).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },
  {
    // scripts/ holds standalone Node CLI tools (migrations, type generation,
    // ad-hoc SQL). Printing to stdout is their entire purpose.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
  // Prettier last: turns off stylistic rules that would fight the formatter.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/database.ts",
  ]),
]);

export default eslintConfig;
