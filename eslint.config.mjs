// Filet de sécurité MINIMAL : uniquement les Rules of Hooks de React.
// Deux bugs critiques (crash « Rendered more hooks ») ont été causés par des
// hooks déclarés après un early return — ce garde-fou les attrape à la CI.
// Volontairement pas de lint généraliste ici (pas de yak-shaving de style).
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import * as tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "**/__test-fixtures__/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: {
      // Des commentaires eslint-disable historiques (@next/next/no-img-element)
      // subsistent pour un futur lint complet — ne pas les signaler ici.
      reportUnusedDisableDirectives: "off",
    },
    // Le plugin Next est enregistré uniquement pour que ses règles soient
    // CONNUES (les eslint-disable inline ne cassent pas) — aucune activée.
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // exhaustive-deps volontairement OFF : le codebase gère ses deps à la
      // main (refs volontaires) — le gate doit rester binaire et actionnable.
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
