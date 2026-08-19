import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'supabase/functions/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Only the two long-established hooks rules — react-hooks' "recommended"
      // bundle in this major version also ships the new, much stricter
      // React Compiler-oriented rules (set-state-in-effect, purity,
      // immutability) which flag many valid, idiomatic patterns (e.g. a
      // `const load = async () => {...}` declared after the effect that
      // calls it — safe because effects run after the whole component body
      // has executed). Enforcing those here would mean a sweeping rewrite
      // unrelated to actual bugs, so we opt in to just the two stable rules.
      'react-hooks/rules-of-hooks': reactHooks.rules['rules-of-hooks'] ? 'error' : 'off',
      'react-hooks/exhaustive-deps': reactHooks.rules['exhaustive-deps'] ? 'warn' : 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/__tests__/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
