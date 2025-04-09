/**
 * Custom ESLint rules for RxJS best practices
 */
export default {
  rules: {
    // Rules for enforcing RxJS best practices
    'rxjs/finnish': ['error', { // This rule handles suffix enforcement
      functions: false,
      methods: false,
      parameters: true,
      properties: true,
      variables: true
    }],
    'rxjs/no-explicit-generics': 'error',
    'rxjs/no-exposed-subjects': 'error',
    'rxjs/no-internal': 'error',
    'rxjs/no-sharereplay': 'error',
    'rxjs/no-unsafe-first': 'error',
    'rxjs/no-unsafe-subject-next': 'error',
    'rxjs/no-unsafe-switchmap': 'error',
    'rxjs/no-unsafe-takeuntil': 'error',
    
    // Observable naming and lifecycle management
    'rxjs/prefer-observer': 'error',
    
    // Enforce proper observable cleanup
    'rxjs/no-ignored-subscription': 'error',
    'rxjs/no-nested-subscribe': 'error',
    'rxjs/no-unbound-methods': 'error',
  }
};
