<template>
  <div class="p-4">
    <div class="max-w-md mx-auto mt-24 text-center">
      <template v-if="error">
        <UIcon
          name="i-lucide-croissant"
          class="size-12 text-primary mb-4"
          aria-hidden="true"
        />
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Couldn't sign you in"
          :description="error"
          class="text-left"
        />
        <UButton
          to="/login"
          color="primary"
          icon="i-lucide-arrow-left"
          class="mt-6"
        >
          Back to sign in
        </UButton>
      </template>
      <EmptyState
        v-else
        loading
        description="Signing you in…"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()
const error = ref(null)

// The Supabase client detects the session from the magic-link URL automatically.
// Once the user is populated, send them to wherever they were headed.
watch(user, (value) => {
  if (value) {
    const path = redirectInfo.pluck()
    navigateTo(path || '/')
  }
}, { immediate: true })

// If the link was invalid/expired, Supabase returns an error in the URL hash.
onMounted(() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const description = params.get('error_description')
  if (description) error.value = description.replace(/\+/g, ' ')
})

useHead({ title: 'Signing in — Croissant Tracker' })
</script>
