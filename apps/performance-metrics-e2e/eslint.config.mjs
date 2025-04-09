import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';
import rxjsPlugin from 'eslint-plugin-rxjs'; // Ensure plugin is imported
import tsParser from '@typescript-eslint/parser'; // Import the TypeScript parser

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: { // Add languageOptions
      parser: tsParser, // Specify the TypeScript parser for TS files
      parserOptions: {
        project: [ // Point to the tsconfig file for this project
          'apps/performance-metrics-e2e/tsconfig.json'
        ],
      },
    },
    plugins: { // Define plugins for this specific block
      rxjs: rxjsPlugin 
    },
    rules: {
      // Apply rxjs/finnish rule here where the plugin is defined
      "rxjs/finnish": "error", 
      // Add other e2e-specific rules here if needed
    },
  },
];
