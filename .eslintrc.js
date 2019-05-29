module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb',
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'object-shorthand': 'off',
    'no-plusplus': 'off',
    'prefer-destructuring': 'off',
    'no-param-reassign': 'off',
    'max-len': [1, 120, 2],
    'no-alert': 'off',
    'prefer-template': 'off',
    'no-mixed-operators': 'off',
    'radix': 'off',
    "func-names": ["error", "as-needed"],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
};
