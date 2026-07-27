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
    // Immutable third-party browser runtimes are verified by provenance and
    // integration tests; parsing the minified JS-DOS bundle exhausts ESLint.
    "public/doom/js-dos-api.js",
    "public/doom/js-dos-v3.js",
    "public/pyodide/**",
  ]),
]);

export default eslintConfig;
