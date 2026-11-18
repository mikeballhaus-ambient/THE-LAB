<script setup lang="ts">
import { personaUtils } from '@/shared/utils/persona-utils';

defineProps<{
  personaName: string;
}>();
</script>

<template>
  <span :class="personaUtils.getPersonaBadgeClass(personaName)">
    <i :class="['fa', personaUtils.getPersonaBadgeIcon(personaName)]" aria-hidden="true" />
    <span>{{ personaUtils.formatPersonaName(personaName) }}</span>
  </span>
</template>
