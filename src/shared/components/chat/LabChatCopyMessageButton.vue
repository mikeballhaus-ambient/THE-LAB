<script setup lang="ts">
import { ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { copyPlainTextToClipboard } from '@/shared/utils/copy-plain-text';

const props = withDefaults(
  defineProps<{
    text: string;
    idPrefix?: string;
  }>(),
  { idPrefix: 'lab-chat-copy-msg' },
);

const { generateUniqueId } = useUniqueElementId();
const copied = ref(false);

async function onCopy(): Promise<void> {
  const ok = await copyPlainTextToClipboard(props.text);
  if (!ok) {
    return;
  }
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<template>
  <button
    type="button"
    class="lab-chat-copy-msg-btn"
    :id="generateUniqueId(props.idPrefix)"
    :aria-label="copied ? 'Copied to clipboard' : 'Copy message to clipboard'"
    :title="copied ? 'Copied' : 'Copy'"
    @click="onCopy"
  >
    <i
      class="fa-solid text-xs"
      :class="copied ? 'fa-check' : 'fa-copy'"
      aria-hidden="true"
    />
  </button>
</template>
