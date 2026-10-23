import { createNextConfig } from "@workspace/eslint-config/next";

export default [
  ...createNextConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn"
    }
  }
];
