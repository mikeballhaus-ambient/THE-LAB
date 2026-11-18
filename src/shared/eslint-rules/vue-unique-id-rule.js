/**
 * ESLint Rule: vue-unique-id
 * Enforces use of useUniqueElementId() for all interactive elements
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require unique element IDs using useUniqueElementId composable',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      missingImport: 'Missing import of useUniqueElementId composable',
      missingUniqueId: 'Interactive element lacks unique ID via useUniqueElementId()',
      wrongPattern: 'PrimeVue component should use :pt for ID injection',
    },
  },
  create(context) {
    const primeVueComponents = [
      'Button', 'InputText', 'Dialog', 'Card', 'Tabs', 'TabList',
      'TabPanel', 'Checkbox', 'Select', 'Listbox', 'Slider',
      'Toast', 'Menu', 'MenuItem', 'Avatar', 'Badge'
    ];

    return {
      CallExpression(node) {
        // Check for PrimeVue components without ID pattern
        if (primeVueComponents.includes(node.callee.name)) {
          const hasPtWithId = node.attributes.some(attr =>
            attr.key && attr.key.name === 'pt' &&
            /generateUniqueId\s*\(/.test(attr.value ? attr.value.raw : '')
          );

          if (!hasPtWithId) {
            context.report({
              node,
              messageId: 'missingUniqueId',
            });
          }
        }
      },
      JSXOpeningElement(node) {
        // Check for native interactive elements without :id binding
        const interactiveElements = ['div', 'span', 'button', 'a', 'input'];
        if (interactiveElements.includes(node.name.toLowerCase())) {
          const hasIdBinding = node.attributes.some(attr =>
            attr.key && attr.key.name === 'id' &&
            /generateUniqueId/.test(attr.value ? attr.value.raw : '')
          );

          if (!hasIdBinding) {
            context.report({
              node,
              messageId: 'missingUniqueId',
            });
          }
        }
      },
    };
  },
};
