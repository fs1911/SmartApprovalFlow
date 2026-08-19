/**
 * Shared ESLint preset for Nicka.
 * Kept intentionally lean: TypeScript recommended rules + Prettier compatibility.
 * Apps extend this and add framework-specific plugins (e.g. Next.js) locally.
 */
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',
    'no-console': 'off',
  },
  ignorePatterns: ['dist', 'build', '.next', 'node_modules', '*.cjs'],
};
