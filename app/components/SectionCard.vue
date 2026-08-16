<script setup lang="ts">
defineProps<{
  title: string
  icon: string
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0">
          <UIcon
            :name="icon"
            class="size-5"
            aria-hidden="true"
          />
        </span>
        <h2 class="text-xl font-semibold text-highlighted">
          {{ title }}
        </h2>
      </div>
    </template>

    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UCard>
</template>
