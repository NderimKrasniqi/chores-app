// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // Domain components intentionally accept child-profile arrays as a data
      // prop named `children`; they are not React render children.
      "react/no-children-prop": "off",
    },
  },
]);
