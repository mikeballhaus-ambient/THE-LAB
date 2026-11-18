/* eslint-disable */
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'primevue' {
  import { Plugin } from 'vue'
  const PrimeVue: Plugin
  export default PrimeVue
}