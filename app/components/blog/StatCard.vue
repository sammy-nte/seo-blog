<script setup lang="ts">
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'

defineProps<{ label: string; value: string; description?: string }>()
</script>

<template>
  <Card class="flex h-full min-w-0 flex-col">
    <CardHeader class="p-5 pb-3 sm:p-6 sm:pb-3">
      <p class="text-[10px] font-extrabold tracking-[.16em] text-[#81877e] uppercase">{{ label }}</p>
      <CardTitle class="max-w-full text-[clamp(30px,4vw,42px)] leading-none break-words [overflow-wrap:anywhere]">{{ value }}</CardTitle>
    </CardHeader>
    <CardContent class="p-5 pt-0 sm:p-6 sm:pt-0">
      <CardDescription v-if="description">{{ description }}</CardDescription>
    </CardContent>
  </Card>
</template>
