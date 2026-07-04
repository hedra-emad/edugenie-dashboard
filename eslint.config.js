// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "warn",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],

      // --- Pragmatic warning baseline (see .claude/commands/preprod.md) ---
      // This project had ~710 pre-existing lint violations when ESLint was
      // first wired up. Every currently-violated rule is set to "warn" so the
      // backlog stays visible without blocking the pre-prod gate, while the
      // full recommended ruleset remains "error" — so any NEW violation of a
      // rule that is currently clean fails the gate. Ratchet each rule below
      // back to "error" as its violations are burned down to zero.
      //
      // Stylistic / migration (large backlog):
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@angular-eslint/prefer-inject": "warn",
      // Correctness backlog (worth burning down, then re-raise to "error"):
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@angular-eslint/no-empty-lifecycle-method": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      // Fixed and enforced at "error" (default) — no current violations:
      //   @typescript-eslint/no-non-null-asserted-optional-chain
      //   @angular-eslint/no-output-on-prefix
      //   @angular-eslint/no-output-native
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // Migration to built-in control flow (@if/@for) is stylistic — warn only.
      "@angular-eslint/template/prefer-control-flow": "warn",
      // Accessibility backlog — visible as warnings; ratchet to "error" once fixed.
      "@angular-eslint/template/label-has-associated-control": "warn",
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/alt-text": "warn",
      "@angular-eslint/template/no-negated-async": "warn",
      "@angular-eslint/template/eqeqeq": "warn",
    },
  }
]);
