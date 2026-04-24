import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "public/pdf.worker.min.mjs",
    ],
  },
  ...nextVitals,
];
