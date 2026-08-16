<template>
  <div class="p-4">
    <div class="max-w-md mx-auto mt-16">
      <PageHero
        title="Croissant Tracker"
        subtitle="Sign in to log late arrivals and settle your croissant debts."
      />

      <SectionCard
        title="Sign in with a magic link"
        icon="i-lucide-mail"
      >
        <div
          v-if="sent"
          class="text-center py-6 space-y-2"
        >
          <UIcon
            name="i-lucide-mail-check"
            class="size-10 text-success"
            aria-hidden="true"
          />
          <p class="font-semibold text-highlighted">
            Check your inbox!
          </p>
          <p class="text-sm text-muted">
            We sent a magic link to <span class="font-medium text-highlighted">{{ email }}</span>.
            Click it to sign in — you can close this tab.
          </p>
          <UButton
            variant="link"
            color="primary"
            @click="reset"
          >
            Use a different email
          </UButton>
        </div>

        <UForm
          v-else
          :state="state"
          class="space-y-4"
          @submit="sendMagicLink"
        >
          <UFormField
            label="Email"
            required
          >
            <UInput
              v-model="state.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              icon="i-lucide-mail"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :description="error"
          />

          <UButton
            type="submit"
            size="lg"
            icon="i-lucide-wand-sparkles"
            :loading="loading"
            class="w-full justify-center croissant-gradient text-white font-semibold"
          >
            Send magic link
          </UButton>
        </UForm>
      </SectionCard>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, watch } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const state = reactive({ email: '' })
const loading = ref(false)
const sent = ref(false)
const error = ref(null)
const email = ref('')

// Already signed in? Skip the login page.
watch(user, (value) => {
  if (value) navigateTo('/')
}, { immediate: true })

// Absolute URL the magic link should return to, respecting the GitHub Pages base path.
const buildRedirectUrl = () => {
  const baseURL = useRuntimeConfig().app.baseURL
  return `${window.location.origin}${baseURL}confirm`.replace(/([^:]\/)\/+/g, '$1')
}

const sendMagicLink = async () => {
  if (!state.email) return
  loading.value = true
  error.value = null

  const { error: signInError } = await supabase.auth.signInWithOtp({
    email: state.email,
    options: { emailRedirectTo: buildRedirectUrl() }
  })

  loading.value = false

  if (signInError) {
    error.value = signInError.message
    return
  }

  email.value = state.email
  sent.value = true
}

const reset = () => {
  sent.value = false
  error.value = null
  state.email = ''
}

useHead({ title: 'Sign in — Croissant Tracker' })
</script>
