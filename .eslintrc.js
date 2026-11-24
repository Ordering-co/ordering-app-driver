module.exports = {
  root: true,
  // Official React Native config: bundles @typescript-eslint parser, react,
  // react-native and prettier rules — and matches this codebase's style
  // (semicolons, trailing commas), unlike the previous `standard` extends.
  extends: '@react-native',
  rules: {
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'no-useless-escape': 'off',
    // Legacy app patterns (hook factories, stale deps) — warn until cleaned up.
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unreachable': 'warn'
  },
  overrides: [
    {
      // `@ui` is the barrel of src/ui: a module of src/ui that imports it is imported by it
      // too, a require cycle (scripts/check-cycles.mjs). Tests may keep importing `@ui`.
      files: ['src/ui/**/*.{js,jsx,ts,tsx}'],
      excludedFiles: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@ui',
                message: 'inside src/ui import the concrete module: the barrel makes a require cycle'
              }
            ]
          }
        ]
      }
    }
  ]
}
