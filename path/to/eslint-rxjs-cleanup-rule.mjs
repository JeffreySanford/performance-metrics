export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce proper cleanup of observables',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      undestroyed: 'Observable must be properly destroyed using takeUntil, pipe(finalize), or explicit unsubscribe in ngOnDestroy',
    },
  },

  create(context) {
    // Track observable declarations
    const observables = new Set();
    // Track which observables have cleanup
    const cleanedUpObservables = new Set();

    return {
      // Track observable declarations
      'VariableDeclarator[init.callee.name=/subscribe|pipe/]': (node) => {
        if (node.id && node.id.name) {
          observables.add(node.id.name);
        }
      },

      // Check for takeUntil pattern
      'CallExpression[callee.property.name="pipe"] CallExpression[callee.property.name="takeUntil"]': (node) => {
        // This is a simplification - would need more complex logic to track which specific observable is being cleaned up
        if (node.parent && node.parent.parent && node.parent.parent.callee) {
          const observable = context.getScope().variables.find(v => 
            v.references.some(ref => ref.identifier === node.parent.parent.callee.object));
          if (observable) {
            cleanedUpObservables.add(observable.name);
          }
        }
      },

      // Check ngOnDestroy for cleanup
      'MethodDefinition[key.name="ngOnDestroy"]': (node) => {
        // Check if all tracked observables are cleaned up in ngOnDestroy
        // This is a simplified approach and would need more complex analysis
        const methodBody = node.value.body.body;
        
        methodBody.forEach(statement => {
          if (statement.type === 'ExpressionStatement' && 
              statement.expression.type === 'CallExpression' &&
              statement.expression.callee.property &&
              statement.expression.callee.property.name === 'unsubscribe') {
            
            const objectName = statement.expression.callee.object.name;
            if (observables.has(objectName)) {
              cleanedUpObservables.add(objectName);
            }
          }
        });
      },

      // At the end of the program, report any observables without cleanup
      'Program:exit': () => {
        observables.forEach(observable => {
          if (!cleanedUpObservables.has(observable)) {
            context.report({
              node: context.getSourceCode().ast,
              messageId: 'undestroyed',
              data: {
                name: observable
              }
            });
          }
        });
      }
    };
  }
};
