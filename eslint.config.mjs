import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "scripts/**",
      "test-results/**",
      "public/pdf.worker.min.mjs",
    ],
  },
  ...nextVitals,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
