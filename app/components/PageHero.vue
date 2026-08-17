<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon?: string
}>(), {
  subtitle: undefined,
  icon: 'i-lucide-croissant'
})
</script>

<template>
  <div class="text-center mb-8">
    <div
      class="croissant-gradient croissant-shadow animate-float inline-flex items-center justify-center size-16 rounded-2xl mb-4"
    >
      <UIcon
        :name="icon"
        class="size-9 text-white"
        aria-hidden="true"
      />
    </div>
    <h1 class="text-4xl font-bold text-highlighted">
      {{ title }}
    </h1>
    <p
      v-if="subtitle"
      class="text-lg text-muted mt-2"
    >
      {{ subtitle }}
    </p>
  </div>
</template>
