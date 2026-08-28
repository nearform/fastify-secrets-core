import importPlugin from 'eslint-plugin-import'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import neostandard from 'neostandard'

// Flat-config port of the .eslintrc this file replaces, which was
// `"extends": ["standard", "prettier"]` plus an `import/order` rule.
//
// `neostandard` is the flat-config successor to `eslint-config-standard` and
// carries the `standard` ruleset, including its `eslint-plugin-n` and
// `eslint-plugin-promise` subsets — both plugins are registered by
// `neostandard()` itself, so this file must not register them a second time.
export default [
  ...neostandard(),

  // `neostandard` does not bundle an import plugin, so the `import/*` rules
  // `eslint-config-standard` used to contribute are re-declared here. These are
  // exactly the seven that were active before this change, at the same severity.
  {
    plugins: { import: importPlugin },
    rules: {
      'import/export': 'error',
      'import/first': 'error',
      'import/no-absolute-path': ['error', { esmodule: true, commonjs: true, amd: false }],
      'import/no-duplicates': 'error',
      'import/no-named-default': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'import/order': ['error', { 'newlines-between': 'always' }]
    }
  },

  // Last, so that eslint-config-prettier switches off every rule above that
  // would fight prettier — this mirrors `"extends": ["standard", "prettier"]`.
  prettierRecommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // `neostandard` drops `dot-notation` and demotes `n/no-deprecated-api` to
      // a warning. `npm run lint` passes no `--max-warnings`, so leaving those as
      // they are would quietly stop CI failing on code that fails it today.
      // Restored at the severity and options `eslint-config-standard` used.
      'dot-notation': ['error', { allowKeywords: true, allowPattern: '' }],
      'n/no-deprecated-api': 'error'
    }
  }
]
