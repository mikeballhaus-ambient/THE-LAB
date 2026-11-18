import pluginVue from 'eslint-plugin-vue';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import theLabPlugin from './src/shared/eslint-plugin.js';

export default [
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  {
    plugins: {
      '@the-lab/vue-unique-id': theLabPlugin,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@the-lab/vue-unique-id/vue-unique-id': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'vender/**'],
  },
];
