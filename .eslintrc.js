module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
  },
  env: {
    node: true,
    browser: true,
  },
};