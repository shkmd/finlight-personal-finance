import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // mobile/ is a fully independent Expo/React Native project with its
    // own tooling — not a Next.js app, so eslint-config-next's rules
    // don't apply to it.
    "mobile/**",
  ]),
]);

export default eslintConfig;
