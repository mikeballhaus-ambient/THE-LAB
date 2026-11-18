/**
 * rm-46 Phase 0 — pragmatic CI lint (platform host only).
 * Full-repo lint: `npm run lint`. CI: `npm run lint:ci`.
 */
import base from './eslint.config.js';

/** Rules deferred to full lint cleanup (ISS-001 follow-up). */
const ciRuleOverrides = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-this-alias': 'off',
  '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-unsafe-function-type': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  'prefer-const': 'off',
  'no-var': 'off',
  'vue/no-unused-vars': 'off',
  'vue/no-mutating-props': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',
};

export default [
  ...base,
  {
    rules: ciRuleOverrides,
  },
];
