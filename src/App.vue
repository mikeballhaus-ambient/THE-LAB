<script setup lang="ts">
import LabDashboard from './dashboard/LabDashboard.vue'
const baseUrl = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`
</script>

<template>
  <Suspense>
    <LabDashboard 
      :serverUrl="baseUrl"
       />
  </Suspense>
</template>

<style scoped></style>