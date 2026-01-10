import globals from 'globals';
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    ignores: [
      'dist/**',
      'node_modules/**',
      'tailwind.config.js',
      'postcss.config.js',
      'vite.config.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  // Prettier 충돌 규칙 끄기
  prettierConfig,
  // Prettier를 ESLint 규칙으로 실행(저장 시 fix 가능)
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser, // <script lang="ts">를 TS로 파싱
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
];
