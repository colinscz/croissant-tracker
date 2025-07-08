<template>
  <div class="min-h-screen p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="text-6xl animate-float">🥐</div>
          <h1 class="text-4xl font-bold text-amber-800">About Croissant Tracker</h1>
          <div class="text-6xl animate-float" style="animation-delay: 0.5s">🥐</div>
        </div>
        <p class="text-lg text-amber-700">Learn more about this delightful accountability system</p>
      </div>

      <!-- Navigation Back -->
      <div class="mb-6">
        <UButton 
          to="/" 
          variant="ghost" 
          color="amber"
          class="flex items-center gap-2"
        >
          <div class="text-lg">←</div>
          <span>Back to Tracker</span>
        </UButton>
      </div>

      <!-- Main Content -->
      <div class="space-y-8">
        <!-- What is Croissant Tracker -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">🤔</div>
              <h2 class="text-xl font-semibold text-amber-800">What is Croissant Tracker?</h2>
            </div>
          </template>
          
          <div class="prose prose-amber max-w-none">
            <p class="text-amber-700 leading-relaxed">
              Croissant Tracker is a fun and delicious way to encourage punctuality in your team, office, or friend group. 
              Based on the popular European tradition where latecomers bring pastries for everyone, this app helps you 
              keep track of who owes croissants and ensures no debt goes unforgotten!
            </p>
          </div>
        </UCard>

        <!-- How It Works -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">⚙️</div>
              <h2 class="text-xl font-semibold text-amber-800">How It Works</h2>
            </div>
          </template>
          
          <div class="space-y-4">
            <div class="flex items-start gap-4 p-4 bg-amber-50 rounded-lg">
              <div class="text-2xl">1️⃣</div>
              <div>
                <h3 class="font-semibold text-amber-800 mb-1">Someone's Late</h3>
                <p class="text-amber-700">When someone arrives late to a meeting, event, or work, add their name to the tracker.</p>
              </div>
            </div>
            
            <div class="flex items-start gap-4 p-4 bg-orange-50 rounded-lg">
              <div class="text-2xl">2️⃣</div>
              <div>
                <h3 class="font-semibold text-amber-800 mb-1">Croissant Debt Created</h3>
                <p class="text-amber-700">The system automatically tracks that they owe croissants to the group.</p>
              </div>
            </div>
            
            <div class="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <div class="text-2xl">3️⃣</div>
              <div>
                <h3 class="font-semibold text-amber-800 mb-1">Croissants Delivered</h3>
                <p class="text-amber-700">When they bring the promised croissants, mark the debt as delivered!</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Features -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">✨</div>
              <h2 class="text-xl font-semibold text-amber-800">Features</h2>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <div class="text-2xl">📊</div>
              <div>
                <h3 class="font-medium text-amber-800">Statistics Dashboard</h3>
                <p class="text-sm text-amber-600">Track total late arrivals and croissant deliveries</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div class="text-2xl">🏆</div>
              <div>
                <h3 class="font-medium text-amber-800">Leaderboard</h3>
                <p class="text-sm text-amber-600">See who's the most frequent latecomer</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div class="text-2xl">📋</div>
              <div>
                <h3 class="font-medium text-amber-800">History Tracking</h3>
                <p class="text-sm text-amber-600">Keep a record of all late arrivals and deliveries</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div class="text-2xl">💾</div>
              <div>
                <h3 class="font-medium text-amber-800">Local Storage</h3>
                <p class="text-sm text-amber-600">Your data is saved locally in your browser</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- The Tradition -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">🇫🇷</div>
              <h2 class="text-xl font-semibold text-amber-800">The Tradition</h2>
            </div>
          </template>
          
          <div class="prose prose-amber max-w-none">
            <p class="text-amber-700 leading-relaxed mb-4">
              The tradition of bringing pastries when you're late is common in many European workplaces, 
              particularly in France, Germany, and other countries. It's a lighthearted way to acknowledge 
              lateness while treating your colleagues to something delicious.
            </p>
            <p class="text-amber-700 leading-relaxed">
              While croissants are the classic choice, the tradition can include any pastries, donuts, 
              or treats that bring joy to the team. It's not about punishment—it's about building 
              camaraderie and encouraging punctuality in a fun way!
            </p>
          </div>
        </UCard>

        <!-- Tips for Success -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">💡</div>
              <h2 class="text-xl font-semibold text-amber-800">Tips for Success</h2>
            </div>
          </template>
          
          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <div class="text-lg">🎯</div>
              <div>
                <h3 class="font-medium text-amber-800">Set Clear Rules</h3>
                <p class="text-sm text-amber-600">Define what counts as "late" and make sure everyone agrees</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="text-lg">😊</div>
              <div>
                <h3 class="font-medium text-amber-800">Keep It Light</h3>
                <p class="text-sm text-amber-600">Remember, this should be fun, not stressful</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="text-lg">🤝</div>
              <div>
                <h3 class="font-medium text-amber-800">Be Fair</h3>
                <p class="text-sm text-amber-600">Apply the rules consistently to everyone</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="text-lg">🥐</div>
              <div>
                <h3 class="font-medium text-amber-800">Quality Matters</h3>
                <p class="text-sm text-amber-600">Good croissants make the whole experience better!</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Technical Info -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">🛠️</div>
              <h2 class="text-xl font-semibold text-amber-800">Technical Information</h2>
            </div>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="font-semibold text-amber-800 mb-2">Built With</h3>
              <ul class="space-y-1 text-sm text-amber-700">
                <li>• Nuxt 3 - Vue.js framework</li>
                <li>• Nuxt UI v3 - Component library</li>
                <li>• Tailwind CSS - Styling</li>
                <li>• Local Storage - Data persistence</li>
              </ul>
            </div>
            
            <div>
              <h3 class="font-semibold text-amber-800 mb-2">Data Storage</h3>
              <p class="text-sm text-amber-700">
                All your croissant tracking data is stored locally in your browser. 
                No data is sent to external servers, ensuring your team's lateness 
                records stay private!
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Footer -->
      <div class="text-center mt-12 py-8 border-t border-amber-200">
        <div class="text-4xl mb-2">🥐</div>
        <p class="text-amber-600">
          Happy tracking, and may your croissants always be fresh!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// SEO
useHead({
  title: 'About - Croissant Tracker',
  meta: [
    { name: 'description', content: 'Learn about the Croissant Tracker app and the tradition of bringing pastries when you\'re late.' }
  ]
})
</script>