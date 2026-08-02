<template>
  <div class="p-4">
    <div class="max-w-md mx-auto mt-16">
      <div class="text-center mb-8">
        <div class="text-6xl animate-float mb-4">🥐</div>
        <h1 class="text-3xl font-bold text-amber-800">Croissant Tracker</h1>
        <p class="text-amber-700 mt-2">Sign in to log late arrivals and settle your croissant debts.</p>
      </div>

      <UCard class="croissant-shadow">
        <template #header>
          <div class="flex items-center gap-2">
            <div class="text-2xl">✉️</div>
            <h2 class="text-xl font-semibold text-amber-800">Sign in with a magic link</h2>
          </div>
        </template>

        <div v-if="sent" class="text-center py-6 space-y-2">
          <div class="text-4xl">📬</div>
          <p class="font-semibold text-amber-800">Check your inbox!</p>
          <p class="text-sm text-amber-600">
            We sent a magic link to <span class="font-medium">{{ email }}</span>.
            Click it to sign in — you can close this tab.
          </p>
          <UButton variant="link" color="primary" @click="reset">
            Use a different email
          </UButton>
        </div>

        <UForm v-else :state="state" class="space-y-4" @submit="sendMagicLink">
          <UFormField label="Email" required>
            <UInput
              v-model="state.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              icon="i-lucide-mail"
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
            class="w-full croissant-gradient text-white font-semibold"
            size="lg"
            :loading="loading"
          >
            <div class="flex items-center gap-2">
              <span>Send magic link</span>
              <div class="text-lg">🪄</div>
            </div>
          </UButton>
        </UForm>
      </UCard>
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
