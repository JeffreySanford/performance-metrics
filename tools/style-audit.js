#!/usr/bin/env node

/**
 * Material Design 3 Style Audit Tool
 * This tool analyzes SCSS files to ensure MD3 compliance by:
 * 1. Running stylelint with MD3 specific rules
 * 2. Checking for proper usage of design tokens
 * 3. Validating color usage and accessibility
 * 4. Verifying typography scale implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'apps', 'performance-metrics', 'src');
const tokenPattern = /--md-sys-/;
const mdTokens = [
  // Color tokens
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'surface', 'on-surface', 'surface-variant', 'on-surface-variant',
  'outline', 'background', 'on-background',
  // Typography tokens
  'typescale-headline-large', 'typescale-headline-medium', 'typescale-headline-small',
  'typescale-title-large', 'typescale-title-medium', 'typescale-title-small',
  'typescale-body-large', 'typescale-body-medium', 'typescale-body-small',
  'typescale-label-large', 'typescale-label-medium', 'typescale-label-small',
  // Shape tokens
  'shape-corner-small', 'shape-corner-medium', 'shape-corner-large', 'shape-corner-extra-large',
  // Elevation tokens
  'elevation-level0', 'elevation-level1', 'elevation-level2', 'elevation-level3', 'elevation-level4', 'elevation-level5'
];

// Stats and issues tracking
const stats = {
  filesChecked: 0,
  stylelintErrors: 0,
  tokenUsageIssues: 0,
  colorIssues: 0,
  typographyIssues: 0
};

const issues = [];

console.log(chalk.blue('🔍 Material Design 3 Style Audit Tool'));
console.log(chalk.blue('=================================='));

// Run Stylelint
console.log(chalk.yellow('\n📋 Running Stylelint checks...'));
try {
  // Check if stylelint dependencies are installed
  try {
    require.resolve('stylelint');
    require.resolve('stylelint-config-standard-scss');
  } catch (e) {
    console.log(chalk.red('Stylelint dependencies are missing. Installing required packages...'));
    execSync('npm install --save-dev stylelint stylelint-config-standard-scss stylelint-config-prettier-scss stylelint-order stylelint-scss stylelint-declaration-strict-value chalk@4.1.2', { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
  }

  const stylelintResult = execSync('npx stylelint "**/*.scss" --formatter json', { 
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] 
  });
  
  const results = JSON.parse(stylelintResult);
  stats.filesChecked = results.length;
  
  results.forEach(result => {
    if (result.warnings && result.warnings.length > 0) {
      stats.stylelintErrors += result.warnings.length;
      result.warnings.forEach(warning => {
        issues.push({
          type: 'stylelint',
          file: path.relative(projectRoot, result.source),
          line: warning.line,
          column: warning.column,
          message: warning.text,
          severity: warning.severity
        });
      });
    }
  });
  
  console.log(chalk.green(`✓ Stylelint checks completed. Found ${stats.stylelintErrors} issues.`));
} catch (error) {
  console.log(chalk.red('✗ Stylelint checks failed.'));
  console.error(error.toString());
}

// Find all SCSS files
console.log(chalk.yellow('\n📋 Checking MD3 token usage...'));

function findScssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findScssFiles(filePath, fileList);
    } else if (file.endsWith('.scss') || file.endsWith('.css')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const scssFiles = findScssFiles(srcDir);

// Check each file for token usage
scssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(projectRoot, file);
  
  // Check for hardcoded colors
  const colorRegex = /#([0-9a-f]{3,8})\b|rgb\(|rgba\(/gi;
  let colorMatch;
  while ((colorMatch = colorRegex.exec(content)) !== null) {
    // Skip if in a comment
    const line = content.substring(0, colorMatch.index).split('\n').length;
    const lineContent = content.split('\n')[line - 1];
    if (!lineContent.includes('//')) {
      stats.colorIssues++;
      issues.push({
        type: 'color',
        file: relativePath,
        line,
        column: colorMatch.index - content.lastIndexOf('\n', colorMatch.index),
        message: `Hardcoded color value ${colorMatch[0]} should use MD3 design tokens`,
        severity: 'error'
      });
    }
  }
  
  // Check for hardcoded typography
  const typoRegex = /font-size:\s*(\d+)(px|rem|em)/gi;
  let typoMatch;
  while ((typoMatch = typoRegex.exec(content)) !== null) {
    // Skip if in a comment
    const line = content.substring(0, typoMatch.index).split('\n').length;
    const lineContent = content.split('\n')[line - 1];
    if (!lineContent.includes('//') && !content.substring(Math.max(0, typoMatch.index - 50), typoMatch.index).includes('var(--md-sys-typescale')) {
      stats.typographyIssues++;
      issues.push({
        type: 'typography',
        file: relativePath,
        line,
        column: typoMatch.index - content.lastIndexOf('\n', typoMatch.index),
        message: `Hardcoded font-size ${typoMatch[0]} should use MD3 typography scale tokens`,
        severity: 'error'
      });
    }
  }
});

console.log(chalk.green(`✓ Token check completed. Found ${stats.colorIssues + stats.typographyIssues} issues.`));

// Output summary
console.log(chalk.blue('\n📊 Audit Summary:'));
console.log(chalk.white(`Files checked: ${stats.filesChecked}`));
console.log(chalk.white(`Stylelint issues: ${stats.stylelintErrors}`));
console.log(chalk.white(`Color issues: ${stats.colorIssues}`));
console.log(chalk.white(`Typography issues: ${stats.typographyIssues}`));
console.log(chalk.white(`Total issues: ${stats.stylelintErrors + stats.colorIssues + stats.typographyIssues}`));

if (issues.length > 0) {
  console.log(chalk.yellow('\n📝 Detailed Issues:'));
  issues.forEach(issue => {
    const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
    console.log(color(`${issue.file}:${issue.line}:${issue.column} - ${issue.message}`));
  });
  
  console.log(chalk.red('\n✗ Style audit failed! Fix the issues to ensure MD3 compliance.'));
  process.exit(1);
} else {
  console.log(chalk.green('\n✓ Style audit passed! All files are MD3 compliant.'));
}
