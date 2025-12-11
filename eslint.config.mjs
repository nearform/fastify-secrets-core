import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import eslintN from 'eslint-plugin-n'
import eslintPrettier from 'eslint-plugin-prettier/recommended'
import promisePlugin from 'eslint-plugin-promise'
import globals from 'globals'
import neostandard from 'neostandard'

export default [
  ...neostandard({
    ignores: neostandard.resolveIgnoresFromGitignore()
  }),
  js.configs.recommended,
  eslintPrettier,
  importPlugin.flatConfigs.recommended,
  eslintN.configs['flat/recommended'],
  promisePlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, 'off'])),
        ...globals.es2021
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'n/no-unpublished-require': 'off',
      'import/order': [
        'error',
        {
          'newlines-between': 'always'
        }
      ]
    }
  }
]
