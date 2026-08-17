<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
  /** Swaps the icon for a spinner — replaces the old "floating croissant" loader. */
  loading?: boolean
}>(), {
  icon: 'i-lucide-croissant',
  title: undefined,
  description: undefined,
  loading: false
})
</script>

<template>
  <div class="text-center py-12">
    <UIcon
      :name="loading ? 'i-lucide-loader-circle' : icon"
      class="size-10 text-dimmed mb-3"
      :class="loading ? 'animate-spin' : ''"
      aria-hidden="true"
    />
    <p
      v-if="title"
      class="mb-1 font-semibold text-highlighted"
    >
      {{ title }}
    </p>
    <p
      v-if="description"
      class="text-muted"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-6"
    >
      <slot />
    </div>
  </div>
</template>
