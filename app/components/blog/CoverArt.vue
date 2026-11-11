<script setup lang="ts">
defineProps<{ accent: 'coral' | 'sage' | 'sand' | 'ink'; compact?: boolean }>()
</script>

<template>
  <div class="blog-cover-art" :class="[`blog-cover-art--${accent}`, { 'blog-cover-art--compact': compact }]" aria-hidden="true">
    <div class="blog-cover-grid"></div>
    <div class="blog-cover-orbit"></div>
    <div class="blog-cover-disc"></div>
    <div class="blog-cover-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <span class="blog-cover-label">DATA / STORY</span>
  </div>
</template>
