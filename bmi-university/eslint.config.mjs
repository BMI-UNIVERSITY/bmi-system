import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // Use 'recommended' instead of 'strict' — strict flags stylistic patterns
    // (e.g. hover-only divs inside anchors) that are valid in our context.
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Downgrade Next.js image/font suggestions to warn; they never block CI.
      "@next/next/no-img-element": "warn",
      "@next/next/no-page-custom-font": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
