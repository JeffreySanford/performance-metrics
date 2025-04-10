import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';
import rxjsPlugin from 'eslint-plugin-rxjs'; // Ensure plugin is imported
import tsParser from '@typescript-eslint/parser'; // Import the TypeScript parser

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    languageOptions: { // Add languageOptions
      parser: tsParser, // Specify the TypeScript parser
      parserOptions: {
        project: [ // Point to the tsconfig files for this project
          'apps/performance-metrics/tsconfig.app.json',
          'apps/performance-metrics/tsconfig.spec.json',
          'apps/performance-metrics/tsconfig.editor.json' 
        ],
      },
    },
    plugins: { // Define plugins for this specific block
      rxjs: rxjsPlugin 
    },
    rules: {
      "rxjs/finnish": "error",
      "@angular-eslint/prefer-standalone-component": "off",
      "@angular-eslint/no-standalone-false": "off",
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ]
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
