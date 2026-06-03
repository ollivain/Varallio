import coreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const base = Array.isArray(coreWebVitals) ? coreWebVitals : [coreWebVitals];

const eslintConfig = [
  ...base,
  {
    rules: {
      // Initialization from localStorage in useEffect is intentional.
      // The rule is too strict for well-understood setup patterns.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
