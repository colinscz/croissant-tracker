<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineProps<{
  links: NavigationMenuItem[]
}>()

const { user, fetchCurrentUser, signOut } = useCurrentUser()
const route = useRoute()

// The header lives in the layout and survives navigation, so re-check the
// session whenever the route changes while we don't know who's signed in —
// e.g. right after Hanko signs someone in on /login.
watch(() => route.path, () => {
  if (!user.value) fetchCurrentUser()
}, { immediate: true })
</script>

<template>
  <div class="fixed top-2 sm:top-4 mx-auto left-1/2 transform -translate-x-1/2 z-10">
    <UNavigationMenu
      :items="links"
      variant="link"
      color="neutral"
      class="bg-muted/80 backdrop-blur-sm rounded-full px-2 sm:px-4 border border-muted/50 shadow-lg shadow-neutral-950/5"
      :ui="{
        link: 'px-2 py-1',
        linkLeadingIcon: 'hidden'
      }"
    >
      <template #list-trailing>
        <UTooltip
          v-if="user"
          :text="`Sign out ${user.email ?? ''}`"
        >
          <UButton
            icon="i-lucide-log-out"
            variant="ghost"
            color="neutral"
            size="sm"
            aria-label="Sign out"
            @click="signOut"
          />
        </UTooltip>
        <ColorModeButton />
      </template>
    </UNavigationMenu>
  </div>
</template>
