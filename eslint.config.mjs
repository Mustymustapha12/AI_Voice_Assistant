import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import nodePlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/dist/**',
      '**/generated/**',
      '**/next-env.d.ts',
      '**/node_modules/**',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  nodePlugin.configs['flat/recommended-module'],
  promisePlugin.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/require-await': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-internal-modules': [
        'error',
        {
          allow: [
            '**/src/**',
            'next/**',
            '@nestjs/**',
            '@testing-library/**',
            '@avc/**',
            'vitest/**',
          ],
        },
      ],
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'no-console': 'error',
      'promise/always-return': 'off',
    },
    settings: {
      'import-x/resolver': {
        node: true,
        typescript: {
          alwaysTryTypes: true,
          project: [
            'apps/*/tsconfig.json',
            'packages/*/tsconfig.json',
            'packages/platform/*/tsconfig.json',
          ],
        },
      },
      node: {
        version: '>=22.14.0',
      },
    },
  },
  {
    files: ['apps/admin-web/**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
      '@next/next': nextPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{spec,test}.ts', '**/vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
