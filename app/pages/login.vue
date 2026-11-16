<template>
  <div class="p-4">
    <div class="max-w-md mx-auto mt-16">
      <PageHero
        title="Croissant Tracker"
        subtitle="Sign in to log late arrivals and settle your croissant debts."
      />

      <SectionCard
        title="Sign in"
        icon="i-lucide-log-in"
      >
        <!--
          Hanko's web component handles the whole flow: email → one-time
          passcode (or a passkey, once you've added one). New emails are
          registered on the spot. When a session is created, @nuxtjs/hanko's
          `hanko-logged-out` middleware sends you on to where you were headed.
        -->
        <ClientOnly>
          <hanko-auth class="hanko-theme" />
          <template #fallback>
            <EmptyState
              loading
              description="Loading sign-in…"
            />
          </template>
        </ClientOnly>
        <p class="mt-4 text-xs text-muted text-center">
          No password needed — we email you a one-time code.
        </p>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  // Signed-in visitors are bounced to `/`.
  hanko: { allow: 'logged-out' },
})

useHead({ title: 'Sign in — Croissant Tracker' })
</script>

<style scoped>
/* Hanko Elements are themed through CSS custom properties that pierce the
   shadow DOM. Map them onto the Nuxt UI tokens so light/dark mode just works. */
.hanko-theme {
  --font-family: inherit;
  --color: var(--ui-text);
  --color-shade-1: var(--ui-text-muted);
  --color-shade-2: var(--ui-border);
  --brand-color: var(--ui-primary);
  --brand-color-shade-1: var(--ui-primary);
  --brand-contrast-color: #fff;
  --background-color: transparent;
  --error-color: var(--ui-error);
  --link-color: var(--ui-primary);
  --border-radius: calc(var(--ui-radius) * 2);
  --container-padding: 0;
  --container-max-width: 100%;
  --headline1-font-size: 1.25rem;
}
</style>
