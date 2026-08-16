<template>
  <div class="p-4">
    <div class="max-w-4xl mx-auto">
      <PageHero
        title="About Croissant Tracker"
        subtitle="Learn more about this delightful accountability system"
      />

      <!-- Navigation Back -->
      <div class="mb-6">
        <UButton
          to="/"
          variant="ghost"
          color="primary"
          icon="i-lucide-arrow-left"
        >
          Back to Tracker
        </UButton>
      </div>

      <!-- Main Content -->
      <div class="space-y-8">
        <!-- What is Croissant Tracker -->
        <SectionCard
          title="What is Croissant Tracker?"
          icon="i-lucide-info"
        >
          <p class="text-muted leading-relaxed">
            Croissant Tracker is a fun and delicious way to encourage punctuality in your team, office, or friend group.
            Based on the popular European tradition where latecomers bring pastries for everyone, this app helps you
            keep track of who owes croissants and ensures no debt goes unforgotten!
          </p>
        </SectionCard>

        <!-- How It Works -->
        <SectionCard
          title="How It Works"
          icon="i-lucide-settings"
        >
          <ol class="space-y-4">
            <li
              v-for="step in steps"
              :key="step.number"
              class="flex items-start gap-4 p-4 rounded-lg bg-elevated/50 border border-default"
            >
              <span class="inline-flex items-center justify-center size-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold tabular-nums">
                {{ step.number }}
              </span>
              <div>
                <h3 class="font-semibold text-highlighted mb-1">
                  {{ step.title }}
                </h3>
                <p class="text-muted">
                  {{ step.description }}
                </p>
              </div>
            </li>
          </ol>
        </SectionCard>

        <!-- Features -->
        <SectionCard
          title="Features"
          icon="i-lucide-sparkles"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="flex items-center gap-3 p-3 rounded-lg bg-elevated/50 border border-default"
            >
              <span class="inline-flex items-center justify-center size-10 shrink-0 rounded-lg bg-primary/10 text-primary">
                <UIcon
                  :name="feature.icon"
                  class="size-5"
                  aria-hidden="true"
                />
              </span>
              <div>
                <h3 class="font-medium text-highlighted">
                  {{ feature.title }}
                </h3>
                <p class="text-sm text-muted">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <!-- The Tradition -->
        <SectionCard
          title="The Tradition"
          icon="i-lucide-landmark"
        >
          <div class="space-y-4">
            <p class="text-muted leading-relaxed">
              The tradition of bringing pastries when you're late is common in many European workplaces,
              particularly in France, Germany, and other countries. It's a lighthearted way to acknowledge
              lateness while treating your colleagues to something delicious.
            </p>
            <p class="text-muted leading-relaxed">
              While croissants are the classic choice, the tradition can include any pastries, donuts,
              or treats that bring joy to the team. It's not about punishment—it's about building
              camaraderie and encouraging punctuality in a fun way!
            </p>
          </div>
        </SectionCard>

        <!-- Tips for Success -->
        <SectionCard
          title="Tips for Success"
          icon="i-lucide-lightbulb"
        >
          <div class="space-y-3">
            <div
              v-for="tip in tips"
              :key="tip.title"
              class="flex items-start gap-3"
            >
              <UIcon
                :name="tip.icon"
                class="size-5 mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h3 class="font-medium text-highlighted">
                  {{ tip.title }}
                </h3>
                <p class="text-sm text-muted">
                  {{ tip.description }}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <!-- Technical Info -->
        <SectionCard
          title="Technical Information"
          icon="i-lucide-wrench"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="font-semibold text-highlighted mb-2">
                Built With
              </h3>
              <ul class="space-y-1 text-sm text-muted">
                <li
                  v-for="item in builtWith"
                  :key="item"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-4 mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold text-highlighted mb-2">
                Data Storage
              </h3>
              <p class="text-sm text-muted">
                All your croissant tracking data is stored locally in your browser.
                No data is sent to external servers, ensuring your team's lateness
                records stay private!
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <!-- Footer -->
      <div class="text-center mt-12 py-8 border-t border-default">
        <UIcon
          name="i-lucide-croissant"
          class="size-9 text-primary mb-2"
          aria-hidden="true"
        />
        <p class="text-muted">
          Happy tracking, and may your croissants always be fresh!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const steps = [
  {
    number: 1,
    title: 'Someone\'s Late',
    description: 'When someone arrives late to a meeting, event, or work, add their name to the tracker.'
  },
  {
    number: 2,
    title: 'Croissant Debt Created',
    description: 'The system automatically tracks that they owe croissants to the group.'
  },
  {
    number: 3,
    title: 'Croissants Delivered',
    description: 'When they bring the promised croissants, mark the debt as delivered!'
  }
]

const features = [
  {
    icon: 'i-lucide-chart-column',
    title: 'Statistics Dashboard',
    description: 'Track total late arrivals and croissant deliveries'
  },
  {
    icon: 'i-lucide-trophy',
    title: 'Leaderboard',
    description: 'See who\'s the most frequent latecomer'
  },
  {
    icon: 'i-lucide-history',
    title: 'History Tracking',
    description: 'Keep a record of all late arrivals and deliveries'
  },
  {
    icon: 'i-lucide-database',
    title: 'Local Storage',
    description: 'Your data is saved locally in your browser'
  }
]

const tips = [
  {
    icon: 'i-lucide-target',
    title: 'Set Clear Rules',
    description: 'Define what counts as "late" and make sure everyone agrees'
  },
  {
    icon: 'i-lucide-smile',
    title: 'Keep It Light',
    description: 'Remember, this should be fun, not stressful'
  },
  {
    icon: 'i-lucide-handshake',
    title: 'Be Fair',
    description: 'Apply the rules consistently to everyone'
  },
  {
    icon: 'i-lucide-croissant',
    title: 'Quality Matters',
    description: 'Good croissants make the whole experience better!'
  }
]

const builtWith = [
  'Nuxt 3 - Vue.js framework',
  'Nuxt UI v3 - Component library',
  'Tailwind CSS - Styling',
  'Local Storage - Data persistence'
]

// SEO
useHead({
  title: 'About — Croissant Tracker',
  meta: [
    { name: 'description', content: 'Learn about the Croissant Tracker app and the tradition of bringing pastries when you\'re late.' }
  ]
})
</script>