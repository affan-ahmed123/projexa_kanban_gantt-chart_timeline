import { createNodeConfig } from "@workspace/eslint-config/node";

export default createNodeConfig({
  tsconfigRootDir: import.meta.dirname,
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/only-throw-error": "off",
    "@typescript-eslint/require-await": "off"
  }
});
