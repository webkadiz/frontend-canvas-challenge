export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$',
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    // Изолированные модули используют одинаковые элементы в разных компонентах.
    'no-descending-specificity': null,
    'color-function-notation': 'modern',
    'max-nesting-depth': 2,
  },
  overrides: [
    {
      files: ['src/global.scss'],
      rules: { 'selector-class-pattern': '^(?:[a-z][a-zA-Z0-9]*|react-flow__[a-z-]+)$' },
    },
  ],
};
