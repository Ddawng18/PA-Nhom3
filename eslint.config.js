import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "artifacts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["tests/**/*.mjs", "deploy/**/*.mjs"],
    languageOptions: { globals: {
      process: "readonly", console: "readonly", fetch: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
      AbortController: "readonly", Buffer: "readonly", URL: "readonly", localStorage: "readonly", document: "readonly",
      window: "readonly", CSS: "readonly", HTMLButtonElement: "readonly"
    } }
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off"
    }
  }
);
