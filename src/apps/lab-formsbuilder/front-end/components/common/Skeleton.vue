<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** Type of skeleton to render */
  type?: 'text' | 'circle' | 'rect' | 'rounded';
  
  /** Width of the skeleton (for text/rect types) */
  width?: string;
  
  /** Height of the skeleton (for text/rect types) */
  height?: string;
  
  /** Whether to animate the skeleton */
  animated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'rect',
  width: '100%',
  height: '24px',
  animated: true,
});

/**
 * Get the shape class based on type
 */
const getShapeClass = computed(() => {
  const base = 'skeleton';
  
  switch (props.type) {
    case 'circle':
      return `${base} circle`;
    case 'rect':
      return `${base} rect`;
    case 'rounded':
      return `${base} rounded`;
    default:
      return `${base} text`;
  }
});

/**
 * Get animation class if enabled
 */
const getAnimationClass = computed(() => {
  return props.animated ? 'animated' : '';
});
</script>

<template>
  <div 
    :class="[
      getShapeClass,
      getAnimationClass,
      {
        'text': type === 'text',
        'circle': type === 'circle',
        'rect': type === 'rect',
        'rounded': type === 'rounded',
      }
    ]"
    :style="{
      width: props.width,
      height: props.height,
    }"
  >
    <!-- Animated shimmer effect for text/rect types -->
    <div 
      v-if="type !== 'circle' && animated"
      class="shimmer"
      :style="{
        background: `linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)`,
        backgroundSize: `${props.width} 100%`,
        animation: 'shimmer 1.5s infinite linear',
      }"
    />
    
    <!-- Static fill for circle type -->
    <div 
      v-if="type === 'circle'"
      class="fill"
      :style="{
        background: '#e0e0e0',
      }"
    />
  </div>
</template>

<style scoped>
/* Base skeleton styles */
.skeleton {
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

/* Text skeleton - horizontal bar */
.skeleton.text {
  min-height: var(--skeleton-height, 24px);
}

/* Circle skeleton */
.skeleton.circle {
  border-radius: 50%;
}

/* Rect skeleton */
.skeleton.rect {
  border-radius: 2px;
}

/* Rounded skeleton */
.skeleton.rounded {
  border-radius: 8px;
}

/* Animated shimmer effect */
.skeleton.animated .shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  animation: shimmer 1.5s infinite linear;
}

/* Fill for circle type */
.skeleton.circle .fill {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Animation keyframes */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive height adjustments */
@media (max-width: 640px) {
  .skeleton.text,
  .skeleton.rect {
    --skeleton-height: 20px;
  }
  
  .skeleton.circle {
    height: 48px;
    width: 48px;
  }
}
</style>
