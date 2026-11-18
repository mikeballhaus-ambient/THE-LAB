<script setup lang="ts">
import { ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import PrimeVueButton from 'primevue/button';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import PrimeDialog from 'primevue/dialog';
import Card from 'primevue/card';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import MultiSelect from 'primevue/multiselect';
import Slider from 'primevue/slider';
import Menu from 'primevue/menu';
import Tree from 'primevue/tree';
import Panel from 'primevue/panel';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Textarea from 'primevue/textarea';

defineProps<{
  serverUrl?: string;
  formsBuilderUrl?: string;
}>();

interface Product {
  name: string;
  category: string;
  price: number;
}

// Sample data for DataTable
const products: Product[] = [
  { name: 'Laptop', category: 'Electronics', price: 999.99 },
  { name: 'Smartphone', category: 'Electronics', price: 699.99 },
  { name: 'Headphones', category: 'Accessories', price: 149.99 },
  { name: 'Keyboard', category: 'Accessories', price: 49.99 },
  { name: 'Mouse', category: 'Accessories', price: 29.99 },
  { name: 'Monitor', category: 'Electronics', price: 199.99 },
  { name: 'Tablet', category: 'Electronics', price: 349.99 },
  { name: 'Printer', category: 'Office', price: 129.99 },
  { name: 'Scanner', category: 'Office', price: 89.99 },
  { name: 'Webcam', category: 'Accessories', price: 59.99 },
  { name: 'Speaker', category: 'Accessories', price: 79.99 },
  { name: 'Router', category: 'Networking', price: 59.99 },
  { name: 'HDD', category: 'Storage', price: 49.99 },
  { name: 'SSD', category: 'Storage', price: 89.99 },
  { name: 'USB Drive', category: 'Storage', price: 19.99 },
];

// Component state
const { generateUniqueId } = useUniqueElementId();
const inputValue = ref('');
const passwordValue = ref('');
const displayModal = ref(false);
const selectedCity = ref('');
const checked = ref(false);
const selectedOption = ref('');
const value = ref(50);
const items = ref([
  { label: 'New York', value: 'ny' },
  { label: 'Rome', value: 'rm' },
  { label: 'London', value: 'ldn' },
  { label: 'Istanbul', value: 'ist' },
  { label: 'Paris', value: 'paris' },
]);
const selectedItems = ref([]);
const cities = ref([
  { name: 'New York', code: 'NY' },
  { name: 'Rome', code: 'RM' },
  { name: 'London', code: 'LDN' },
  { name: 'Istanbul', code: 'IST' },
  { name: 'Paris', code: 'PARIS' },
]);
const menuItems = ref([
  { label: 'Home', icon: 'pi pi-home' },
  { label: 'Search', icon: 'pi pi-search' },
  { label: 'Options', icon: 'pi pi-cog' },
]);
const treeNodes = ref([
  {
    label: 'Documents',
    key: 'documents',
    data: 'Documents Folder',
    children: [
      {
        label: 'Work',
        key: 'work',
        data: 'Work Folder',
        children: [
          { label: 'Spreadsheet', key: 'spreadsheet', icon: 'pi pi-file-excel', data: 'spreadsheet.xlsx' },
          { label: 'Presentation', key: 'presentation', icon: 'pi pi-file-powerpoint', data: 'presentation.ppt' },
        ],
      },
      { label: 'Home', key: 'home', icon: 'pi pi-home', data: 'Home Folder' },
    ],
  },
]);
const textareaValue = ref<string>('')

// Open modal function
const openModal = () => {
  displayModal.value = true;
};
const menuRef = ref<{ toggle: (e: Event) => void } | null>(null);

const galleryStats = {
  componentExamples: 12,
  productRows: products.length,
  treeNodes: 3,
  menuItems: menuItems.value.length,
};

</script>

<template>
  <div
    :id="generateUniqueId('container')"
    class="ui-component-gallery-app app-loaded-container text-slate-300 w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
  >
    <header class="lab-app-header" :id="generateUniqueId('ui-gallery-app-header')">
      <div>
        <h1 :id="generateUniqueId('title')" class="text-2xl font-semibold m-0">PrimeVue Component Gallery</h1>
        <p class="text-sm text-slate-400 m-0 mt-1">Interactive examples of PrimeVue components for THE-LAB apps</p>
      </div>
    </header>

    <main class="lab-app-body" :id="generateUniqueId('main-container')">
      <div class="lab-app-landing w-full">
        <div>
          <h2 :id="generateUniqueId('dashboard-heading')" class="text-lg font-semibold m-0">Dashboard</h2>
          <p class="text-sm text-slate-400 m-0 mt-1">Browse live samples and open PrimeVue documentation from each card.</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-components')">
            <span class="lab-app-kpi-label">Examples</span>
            <span class="lab-app-kpi-value">{{ galleryStats.componentExamples }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-products')">
            <span class="lab-app-kpi-label">Table rows</span>
            <span class="lab-app-kpi-value">{{ galleryStats.productRows }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-tree')">
            <span class="lab-app-kpi-label">Tree branches</span>
            <span class="lab-app-kpi-value">{{ galleryStats.treeNodes }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-menu')">
            <span class="lab-app-kpi-label">Menu items</span>
            <span class="lab-app-kpi-value">{{ galleryStats.menuItems }}</span>
          </div>
        </div>

        <section class="lab-app-panel lab-app-panel--flush-cards" :id="generateUniqueId('gallery-panel')">
    <!-- Grid Layout for Components -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <!-- Button Example -->
      <Card :id="generateUniqueId('card-button')">
        <template #title>Button</template>
        <template #content>
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Click Me" icon="pi pi-check" class="m-1" />
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Disabled" class="m-1" disabled />
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Severity" severity="success" class="m-1" />
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Icon Only" class="m-1" icon="pi pi-search" />
        </template>
        <template #footer>
          <a href="https://primevue.org/button/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('btn-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Input Example -->
      <Card :id="generateUniqueId('card-input')">
        <template #title>Input</template>
        <template #content>
          <InputText :pt="{ root: { attrs: { id: generateUniqueId('input') } }}" v-model="inputValue" placeholder="Type here" class="mb-2" />
          <InputText :pt="{ root: { attrs: { id: generateUniqueId('input') } }}" v-model="passwordValue" type="password" placeholder="Password" />
        </template>
        <template #footer>
          <a href="https://primevue.org/input/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('input-doc')">Documentation</a>
        </template>
      </Card>

      <!-- DataTable Example -->
      <Card :id="generateUniqueId('card-datatable')">
        <template #title>DataTable</template>
        <template #content>
          <DataTable :value="products" scrollable scrollHeight="200px" class="mb-2">
            <Column field="name" header="Name"></Column>
            <Column field="category" header="Category"></Column>
            <Column field="price" header="Price"></Column>
          </DataTable>
        </template>
        <template #footer>
          <a href="https://primevue.org/datatable/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('datatable-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Modal Example -->
      <Card :id="generateUniqueId('card-modal')">
        <template #title>Modal</template>
        <template #content>
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Open Modal" @click="openModal" class="mb-2" />
          <PrimeDialog :pt="{ root: { attrs: { id: generateUniqueId('dialog') } }}" v-model:visible="displayModal" header="Modal Header" :modal="true">
            <p>This is a modal dialog example.</p>
          </PrimeDialog>
        </template>
        <template #footer>
          <a href="https://primevue.org/dialog/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('dialog-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Select Example -->
      <Card :id="generateUniqueId('card-select')">
        <template #title>Select</template>
        <template #content>
          <Select :pt="{ root: { attrs: { id: generateUniqueId('select') } }}" v-model="selectedCity" :options="items" optionLabel="label" placeholder="Select a City"
            class="mb-2" />
        </template>
        <template #footer>
          <a href="https://primevue.org/select/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('select-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Checkbox Example -->
      <Card :id="generateUniqueId('card-checkbox')">
        <template #title>Checkbox</template>
        <template #content>
          <div class="flex items-center mb-2">
            <Checkbox :pt="{ root: { attrs: { id: generateUniqueId('checkbox') } }}" v-model="checked" inputId="binary" binary class="mr-2" />
            <label :for="generateUniqueId('lbl-checkbox-binary')" :id="generateUniqueId('lbl-checkbox-binary-for')">Binary</label>
          </div>
          <div class="flex items-center">
            <Checkbox :pt="{ root: { attrs: { id: generateUniqueId('checkbox') } }}" v-model="checked" inputId="boolean" boolean class="mr-2" />
            <label :for="generateUniqueId('lbl-checkbox-boolean')" :id="generateUniqueId('lbl-checkbox-boolean-for')">Boolean</label>
          </div>
        </template>
        <template #footer>
          <a href="https://primevue.org/checkbox/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('checkbox-doc')">Documentation</a>
        </template>
      </Card>

      <!-- RadioButton Example -->
      <Card :id="generateUniqueId('card-radiobutton')">
        <template #title>RadioButton</template>
        <template #content>
          <div class="flex items-center mb-2">
            <RadioButton :pt="{ root: { attrs: { id: generateUniqueId('radiobutton') } }}" v-model="selectedOption" inputId="option1" name="option" value="option1" class="mr-2" />
            <label :for="generateUniqueId('lbl-radiobutton-option1')" :id="generateUniqueId('lbl-radiobutton-option1-for')">Option 1</label>
          </div>
          <div class="flex items-center mb-2">
            <RadioButton :pt="{ root: { attrs: { id: generateUniqueId('radiobutton') } }}" v-model="selectedOption" inputId="option2" name="option" value="option2" class="mr-2" />
            <label :for="generateUniqueId('lbl-radiobutton-option2')" :id="generateUniqueId('lbl-radiobutton-option2-for')">Option 2</label>
          </div>
          <div class="flex items-center">
            <RadioButton :pt="{ root: { attrs: { id: generateUniqueId('radiobutton') } }}" v-model="selectedOption" inputId="option3" name="option" value="option3" class="mr-2" />
            <label :for="generateUniqueId('lbl-radiobutton-option3')" :id="generateUniqueId('lbl-radiobutton-option3-for')">Option 3</label>
          </div>
        </template>
        <template #footer>
          <a href="https://primevue.org/radiobutton/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('radiobutton-doc')">Documentation</a>
        </template>
      </Card>

      <!-- MultiSelect Example -->
      <Card :id="generateUniqueId('card-multiselect')">
        <template #title>MultiSelect</template>
        <template #content>
          <MultiSelect :pt="{ root: { attrs: { id: generateUniqueId('multiselect') } }}" v-model="selectedItems" :options="cities" optionLabel="name" placeholder="Select Cities"
            class="mb-2" />
        </template>
        <template #footer>
          <a href="https://primevue.org/multiselect/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('multiselect-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Slider Example -->
      <Card :id="generateUniqueId('card-slider')">
        <template #title>Slider</template>
        <template #content>
          <Slider v-model="value" class="mb-2" />
          <p>Value: {{ value }}</p>
        </template>
        <template #footer>
          <a href="https://primevue.org/slider/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('slider-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Menu Example -->
      <Card :id="generateUniqueId('card-menu')">
        <template #title>Menu</template>
        <template #content>
          <PrimeVueButton :pt="{ root: { attrs: { id: generateUniqueId('btn') } }}" label="Menu" @click="(e: Event) => menuRef?.toggle(e)" class="mb-2" />
          <Menu :pt="{ root: { attrs: { id: generateUniqueId('menu') } }}" ref="menuRef" :model="menuItems" :popup="true" />
        </template>
        <template #footer>
          <a href="https://primevue.org/menu/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('menu-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Tree Example -->
      <Card :id="generateUniqueId('card-tree')">
        <template #title>Tree</template>
        <template #content>
          <Tree :pt="{ root: { attrs: { id: generateUniqueId('tree') } }}" :value="treeNodes" class="mb-2" />
        </template>
        <template #footer>
          <a href="https://primevue.org/tree/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('tree-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Panel Example -->
      <Card :id="generateUniqueId('card-panel')">
        <template #title>Panel</template>
        <template #content>
          <Panel header="Panel Header" class="mb-2">
            <p>This is a panel component example.</p>
          </Panel>
        </template>
        <template #footer>
          <a href="https://primevue.org/panel/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('panel-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Accordion Example -->
      <Card :id="generateUniqueId('card-accordion')">
        <template #title>Accordion</template>
        <template #content>
          <Accordion>
            <AccordionPanel value="tab-1">
              <AccordionHeader>Tab 1</AccordionHeader>
              <AccordionContent>
                <p>Content for Tab 1 goes here.</p>
              </AccordionContent>
            </AccordionPanel>
            <AccordionPanel value="tab-2">
              <AccordionHeader>Tab 2</AccordionHeader>
              <AccordionContent>
                <p>Content for Tab 2 goes here.</p>
              </AccordionContent>
            </AccordionPanel>
            <AccordionPanel value="tab-3">
              <AccordionHeader>Tab 3</AccordionHeader>
              <AccordionContent>
                <p>Content for Tab 3 goes here.</p>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </template>
        <template #footer>
          <a href="https://primevue.org/accordion/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('accordion-doc')">Documentation</a>
        </template>
      </Card>

      <!-- Textarea Example -->
      <Card :id="generateUniqueId('card-textarea')">
        <template #title>Textarea</template>
        <template #content>
          <Textarea :pt="{ root: { attrs: { id: generateUniqueId('textarea') } }}" v-model="textareaValue" placeholder="Type here..." rows="5" class="mb-2 w-full" />
        </template>
        <template #footer>
          <a href="https://primevue.org/textarea/" target="_blank" class="text-sm text-blue-500" :id="generateUniqueId('textarea-doc')">Documentation</a>
        </template>
      </Card>

    </div>
        </section>
      </div>
    </main>
  </div>
</template>
