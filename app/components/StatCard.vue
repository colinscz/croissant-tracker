<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon: string
  value: number | string
  label: string
  color?: 'primary' | 'warning' | 'success'
}>(), {
  color: 'primary'
})

const accent = computed(() => ({
  primary: { chip: 'bg-primary/10 text-primary', value: 'text-highlighted' },
  warning: { chip: 'bg-warning/10 text-warning', value: 'text-warning' },
  success: { chip: 'bg-success/10 text-success', value: 'text-success' }
}[props.color]))
</script>

<template>
  <UCard>
    <div class="flex items-center gap-4">
      <span
        class="inline-flex items-center justify-center size-12 rounded-xl shrink-0"
        :class="accent.chip"
      >
        <UIcon
          :name="icon"
          class="size-6"
          aria-hidden="true"
        />
      </span>
      <div>
        <div
          class="text-2xl font-bold tabular-nums"
          :class="accent.value"
        >
          {{ value }}
        </div>
        <div class="text-sm text-muted">
          {{ label }}
        </div>
      </div>
    </div>
  </UCard>
</template>
