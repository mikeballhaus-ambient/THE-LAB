<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Select from 'primevue/select';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { fetchPlatformUserLookupForClient } from '@/shared/services/platform-user-client';
import { formSelectPt } from '@/shared/forms/form-control-pt';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    inputId?: string;
    placeholder?: string;
    hostAppId?: string;
    disabled?: boolean;
  }>(),
  {
    inputId: undefined,
    placeholder: 'Select a user',
    hostAppId: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
}>();

const { generateUniqueId } = useUniqueElementId();
const readOnly = useFormFieldReadOnly();
const loading = ref(false);
const options = ref<Array<{ label: string; value: number }>>([]);

const selectValue = ref<number | null>(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    selectValue.value = v;
  },
);

watch(selectValue, (v) => {
  emit('update:modelValue', v);
});

async function loadUsers(query?: string): Promise<void> {
  loading.value = true;
  try {
    const rows = await fetchPlatformUserLookupForClient({
      q: query,
      appId: props.hostAppId,
      limit: 50,
    });
    options.value = rows.map((row) => ({
      label: row.email ? `${row.label} (${row.email})` : row.label,
      value: row.value,
    }));
    if (selectValue.value != null && !options.value.some((o) => o.value === selectValue.value)) {
      options.value = [
        { label: `User #${selectValue.value}`, value: selectValue.value },
        ...options.value,
      ];
    }
  } finally {
    loading.value = false;
  }
}

function onFilter(event: { value: string }): void {
  void loadUsers(event.value);
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <Select
    v-model="selectValue"
    :disabled="disabled || readOnly"
    :options="options"
    :loading="loading"
    filter
    :filter-placeholder="'Search name or email'"
    option-label="label"
    option-value="value"
    :placeholder="placeholder"
    class="w-full"
    :pt="formSelectPt"
    :input-id="inputId ?? generateUniqueId('lab-platform-user-select')"
    @filter="onFilter"
  />
</template>
