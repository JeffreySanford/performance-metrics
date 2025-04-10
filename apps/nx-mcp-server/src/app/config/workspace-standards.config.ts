import { Injectable } from '@nestjs/common';
import { Observable, from, of, merge } from 'rxjs';
import { map, filter, mergeMap, reduce, tap } from 'rxjs/operators';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import postcss, { Root, Rule, Node, Container, Document, ChildNode } from 'postcss';
import scss from 'postcss-scss';

interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

interface StyleFile {
  path: string;
  content: string;
}

interface PostCSSRule {
  type: string;
  selector: string;
  parent: PostCSSRule | null;
  nodes?: PostCSSRule[];
}

function isRule(node: Node): node is Rule {
  return node.type === 'rule';
}

@Injectable()
export class WorkspaceStandardsConfig {
  readonly standards = {
    rxjs: {
      enforceObservables: true,
      disallowedPatterns: [
        {
          pattern: 'Promise<',
          message: 'Avoid using Promises directly. Use RxJS Observables instead.'
        },
        {
          pattern: 'async ',
          message: 'Avoid using async/await. Use RxJS operators like switchMap, mergeMap or concatMap instead.'
        },
        {
          pattern: '.then(',
          message: 'Avoid using Promise.then(). Use RxJS pipe() with appropriate operators instead.'
        }
      ],
      requiredImports: [
        'rxjs',
        'rxjs/operators'
      ],
      websocketConfig: {
        enforceSecureOnly: true,
        requireHeartbeat: true,
        connectionStrategy: 'hot-observable'
      }
    },
    material: {
      version: 3,
      enforceTokens: true,
      components: {
        enforceStandalone: false,
        requireExplicitStandalone: true,
        naming: {
          prefix: 'md3-',
          pattern: '^md3-[a-z-]+$'
        }
      },
      theming: {
        enforceCustomProperties: true,
        namingPattern: '^(--md-sys-|--mat-)',
        tokens: {
          required: true,
          categories: ['color', 'typography', 'elevation', 'motion']
        }
      },
      typography: {
        classes: [
          'headline-large',
          'headline-medium',
          'body-medium',
          'label-small'
        ],
        tokens: [
          'font-family',
          'font-size',
          'font-weight',
          'line-height',
          'letter-spacing'
        ]
      },
      elevation: {
        levels: [1, 2, 3],
        useTokens: true
      },
      motion: {
        animations: [
          'fade-in',
          'slide-in-bottom'
        ],
        tokens: [
          'duration',
          'easing'
        ]
      }
    },
    architecture: {
      enforceModularity: true,
      dependencyInjection: {
        required: true,
        scope: 'singleton'
      },
      stateManagement: {
        type: 'rxjs',
        pattern: 'observable-store'
      },
      monorepo: {
        enforceNxStructure: true,
        projectTypes: ['application', 'library'],
        requiredGenerators: {
          app: '@nx/angular:app',
          lib: '@nx/angular:lib'
        }
      }
    },
    testing: {
      coverage: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      },
      requiredTypes: ['unit', 'integration'],
      frameworks: {
        unit: 'jest',
        e2e: 'playwright'
      }
    },
    linting: {
      eslint: {
        extends: [
          'plugin:@nx/angular',
          'plugin:@angular-eslint/template/process-inline-templates'
        ],
        rules: {
          '@angular-eslint/prefer-standalone-component': 'off',
          '@angular-eslint/no-standalone-false': 'off'
        }
      },
      stylelint: {
        extends: ['stylelint-config-standard-scss'],
        rules: {
          'selector-class-pattern': '^(md3-|mat-)',
          'custom-property-pattern': '^(--md-sys-|--mat-)',
          'color-no-hex': true,
          'color-named': 'never'
        }
      }
    },
    utilities: {
      classes: {
        typography: ['body-large'],
        spacing: ['mt-4', 'mb-2', 'p-3'],
        display: ['display-flex', 'justify-between', 'align-center'],
        shape: ['shape-large']
      },
      naming: {
        prefix: 'md3-',
        pattern: '^md3-[a-z-]+$'
      }
    },
    ci: {
      provider: 'github-actions',
      required: true,
      checks: [
        'build',
        'test',
        'lint',
        'e2e'
      ]
    }
  };

  getStandards(): Observable<typeof this.standards> {
    return of(this.standards).pipe(
      tap(standards => console.log('Standards requested', standards))
    );
  }

  validateComponent(component: any): Observable<ValidationResult> {
    return merge(
      this.validateComponentStructure(component),
      this.validateTokenUsage(component),
      this.validateNamingConventions(component),
      this.validateStyleStructure(component)
    ).pipe(
      reduce((acc: ValidationResult, curr: ValidationResult) => ({
        isValid: acc.isValid && curr.isValid,
        violations: [...acc.violations, ...curr.violations]
      }), { isValid: true, violations: [] }),
      tap(result => {
        if (!result.isValid) {
          console.warn('Component validation failed:', result.violations);
        }
      })
    );
  }

  private validateComponentStructure(component: any): Observable<ValidationResult> {
    return of(component).pipe(
      map(comp => {
        const violations: string[] = [];
        
        // Check standalone configuration
        if (comp.standalone === true) {
          violations.push('Components must not be standalone. Set standalone: false explicitly.');
        }

        // Check for required metadata
        if (!comp.selector) {
          violations.push('Component must have a selector.');
        }

        // Check for template usage
        if (!comp.templateUrl && !comp.template) {
          violations.push('Component must have either templateUrl or template defined.');
        }

        // Check for style usage
        if (!comp.styleUrls && !comp.styles) {
          violations.push('Component must have either styleUrls or styles defined.');
        }

        return {
          isValid: violations.length === 0,
          violations
        };
      })
    );
  }

  private validateTokenUsage(component: { styleUrls?: string[] }): Observable<ValidationResult> {
    if (!component.styleUrls?.length) {
      return of({ isValid: true, violations: [] });
    }

    return from(component.styleUrls).pipe(
      mergeMap((styleUrl: string) => this.parseStyleFile(styleUrl)),
      map(({ content }) => {
        const violations: string[] = [];
        const requiredTokenCategories = this.standards.material.theming.tokens.categories;
        
        requiredTokenCategories.forEach(category => {
          const hasTokens = content.includes(`--md-sys-${category}`);
          if (!hasTokens) {
            violations.push(`Missing required ${category} tokens. Use --md-sys-${category} variables.`);
          }
        });

        if (content.match(/#[0-9a-fA-F]{3,6}/)) {
          violations.push('Avoid using hex color values. Use MD3 color tokens instead.');
        }

        if (content.match(/\d+px/)) {
          violations.push('Avoid using direct pixel values. Use MD3 spacing or typography tokens.');
        }

        return {
          isValid: violations.length === 0,
          violations
        };
      })
    );
  }

  private validateNamingConventions(component: any): Observable<ValidationResult> {
    return of(component).pipe(
      map(comp => {
        const violations: string[] = [];
        const { prefix, pattern } = this.standards.material.components.naming;
        
        // Validate selector naming
        if (comp.selector && !comp.selector.startsWith(prefix)) {
          violations.push(`Component selector must start with ${prefix}`);
        }

        if (comp.selector && !new RegExp(pattern).test(comp.selector)) {
          violations.push(`Component selector must match pattern ${pattern}`);
        }

        // Validate class naming
        const className = comp.constructor?.name;
        if (!className?.endsWith('Component')) {
          violations.push('Component class name must end with "Component"');
        }

        // Validate template class usage
        if (comp.template) {
          const mdClassPattern = /class="[^"]*"/g;
          const classes = comp.template.match(mdClassPattern) || [];
          classes.forEach((classAttr: string) => {
            if (!classAttr.includes('md3-')) {
              violations.push('Template classes must use MD3 utility classes with md3- prefix');
            }
          });
        }

        return {
          isValid: violations.length === 0,
          violations
        };
      })
    );
  }

  private validateStyleStructure(component: { styleUrls?: string[] }): Observable<ValidationResult> {
    if (!component.styleUrls?.length) {
      return of({ isValid: true, violations: [] });
    }

    return from(component.styleUrls).pipe(
      mergeMap((styleUrl: string) => this.parseStyleFile(styleUrl)),
      map(({ content, path }) => {
        const violations: string[] = [];
        const bemPattern = /\.[a-z]([a-z0-9-]*[a-z0-9])?(__[a-z0-9][a-z0-9-]*)?(_[a-z0-9][a-z0-9-]*)*$/;
        const selectors = this.extractSelectors(content);
        
        selectors.forEach((selector: string) => {
          if (!bemPattern.test(selector)) {
            violations.push(`Invalid BEM naming in selector: ${selector} in ${path}`);
          }
        });

        const maxNestingDepth = 3;
        const nestingDepth = this.calculateNestingDepth(content);
        if (nestingDepth > maxNestingDepth) {
          violations.push(`Nesting depth of ${nestingDepth} exceeds maximum allowed (${maxNestingDepth}) in ${path}`);
        }

        const requiredElements = [':host', '.md3-'];
        requiredElements.forEach(element => {
          if (!content.includes(element)) {
            violations.push(`Missing required structural element: ${element} in ${path}`);
          }
        });

        return {
          isValid: violations.length === 0,
          violations
        };
      })
    );
  }

  private parseStyleFile(styleUrl: string): Observable<StyleFile> {
    return new Observable(subscriber => {
      const resolvedPath = resolve(process.cwd(), styleUrl);
      readFile(resolvedPath, 'utf-8')
        .then(content => {
          subscriber.next({ path: styleUrl, content });
          subscriber.complete();
        })
        .catch(error => {
          subscriber.error(new Error(`Failed to read style file ${styleUrl}: ${error.message}`));
        });
    });
  }

  private extractSelectors(styles: string): string[] {
    const selectors: string[] = [];
    const processor = postcss();
    const result = processor.process(styles, { parser: scss });
    const root = result.root;

    root.walkRules((rule: Rule) => {
      const selectorPath: string[] = [];
      let currentNode = rule.parent;
      
      while (currentNode && isRule(currentNode)) {
        selectorPath.unshift(currentNode.selector);
        currentNode = currentNode.parent;
      }
      
      const currentSelectors = rule.selector.split(',').map((s: string) => s.trim());
      
      currentSelectors.forEach((selector: string) => {
        if (selectorPath.length > 0) {
          const fullSelector = [...selectorPath, selector].join(' ');
          selectors.push(fullSelector);
        } else {
          selectors.push(selector);
        }
      });
    });

    return selectors;
  }

  private calculateNestingDepth(styles: string): number {
    let maxDepth = 0;
    const processor = postcss();
    const result = processor.process(styles, { parser: scss });
    const root = result.root;

    const calculateDepthRecursive = (node: Node, currentDepth: number): void => {
      if (node.type === 'rule') {
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      if ('nodes' in node && Array.isArray(node.nodes)) {
        node.nodes.forEach((child: Node) => {
          calculateDepthRecursive(child, node.type === 'rule' ? currentDepth + 1 : currentDepth);
        });
      }
    };

    if ('nodes' in root && Array.isArray(root.nodes)) {
      root.nodes.forEach((node: Node) => {
        calculateDepthRecursive(node, 1);
      });
    }

    return maxDepth;
  }

  enforceRxjsPatterns(code: string): Observable<string[]> {
    return from(this.standards.rxjs.disallowedPatterns).pipe(
      filter(pattern => code.includes(pattern.pattern)),
      map(pattern => pattern.message),
      reduce((acc: string[], curr: string) => [...acc, curr], []),
      tap(violations => {
        if (violations.length > 0) {
          console.warn('RxJS pattern violations:', violations);
        }
      })
    );
  }
} 