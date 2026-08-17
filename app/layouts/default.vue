<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const navLinks: NavigationMenuItem[] = [{
  label: 'Home',
  icon: 'i-lucide-home',
  to: '/'
},{
  label: 'Teams',
  icon: 'i-lucide-users',
  to: '/teams'
},{
  label: 'About',
  icon: 'i-lucide-user',
  to: '/about'
}]


</script>

<template>
  <div class="relative min-h-screen">
    <CroissantBackground />
    <UContainer class="sm:border-x border-default pt-10 min-h-screen">
      <AppHeader :links="navLinks" />
      <slot />
      <AppFooter />
    </UContainer>
  </div>
</template>
