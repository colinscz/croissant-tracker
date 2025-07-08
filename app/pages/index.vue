<template>
  <div class="p-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="text-6xl animate-float">🥐</div>
          <h1 class="text-4xl font-bold text-amber-800">Croissant Tracker</h1>
          <div class="text-6xl animate-float" style="animation-delay: 0.5s">🥐</div>
        </div>
        <p class="text-lg text-amber-700">Who owes croissants for being late?</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <UCard class="croissant-shadow">
          <div class="text-center">
            <div class="text-3xl mb-2">📊</div>
            <div class="text-2xl font-bold text-amber-800">{{ totalLateCount }}</div>
            <div class="text-sm text-amber-600">Total Late Arrivals</div>
          </div>
        </UCard>
        
        <UCard class="croissant-shadow">
          <div class="text-center">
            <div class="text-3xl mb-2">🥐</div>
            <div class="text-2xl font-bold text-orange-600">{{ pendingCroissants }}</div>
            <div class="text-sm text-amber-600">Croissants Owed</div>
          </div>
        </UCard>
        
        <UCard class="croissant-shadow">
          <div class="text-center">
            <div class="text-3xl mb-2">✅</div>
            <div class="text-2xl font-bold text-green-600">{{ deliveredCroissants }}</div>
            <div class="text-sm text-amber-600">Croissants Delivered</div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Add New Late Arrival -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">⏰</div>
              <h2 class="text-xl font-semibold text-amber-800">Add Late Arrival</h2>
            </div>
          </template>
          
          <UForm :state="newEntry" class="space-y-4" @submit="addLateArrival">
            <UFormField label="Name" required>
              <UInput 
                v-model="newEntry.name" 
                placeholder="Who was late?"
                :ui="{ base: 'focus:ring-amber-500 focus:border-amber-500' }"
              />
            </UFormField>
            
            <UFormField label="Date" required>
              <UInput 
                v-model="newEntry.date" 
                type="date"
                :ui="{ base: 'focus:ring-amber-500 focus:border-amber-500' }"
              />
            </UFormField>
            
            <UFormField label="Reason (optional)">
              <UTextarea 
                v-model="newEntry.reason" 
                placeholder="Why were they late?"
                :ui="{ base: 'focus:ring-amber-500 focus:border-amber-500' }"
              />
            </UFormField>
            
            <UButton 
              type="submit" 
              class="w-full croissant-gradient text-white font-semibold"
              size="lg"
            >
              <div class="flex items-center gap-2">
                <span>Add to Tracker</span>
                <div class="text-lg">🥐</div>
              </div>
            </UButton>
          </UForm>
        </UCard>

        <!-- Current Debts -->
        <UCard class="croissant-shadow">
          <template #header>
            <div class="flex items-center gap-2">
              <div class="text-2xl">🥐</div>
              <h2 class="text-xl font-semibold text-amber-800">Current Croissant Debts</h2>
            </div>
          </template>
          
          <div v-if="currentDebts.length === 0" class="text-center py-8 text-amber-600">
            <div class="text-4xl mb-2">🎉</div>
            <p>No one owes croissants right now!</p>
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="debt in currentDebts" 
              :key="debt.id"
              class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
            >
              <div>
                <div class="font-semibold text-amber-800">{{ debt.name }}</div>
                <div class="text-sm text-amber-600">{{ formatDate(debt.date) }}</div>
                <div v-if="debt.reason" class="text-xs text-amber-500 italic">{{ debt.reason }}</div>
              </div>
              <UButton 
                color="green"
                size="sm"
                class="flex items-center gap-1"
                @click="markAsDelivered(debt.id)"
              >
                <span>Delivered</span>
                <div class="text-sm">✅</div>
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Leaderboard -->
      <UCard class="croissant-shadow mt-8">
        <template #header>
          <div class="flex items-center gap-2">
            <div class="text-2xl">🏆</div>
            <h2 class="text-xl font-semibold text-amber-800">Late Arrival Leaderboard</h2>
          </div>
        </template>
        
        <div v-if="leaderboard.length === 0" class="text-center py-8 text-amber-600">
          <p>No data yet. Add some late arrivals to see the leaderboard!</p>
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="(person, index) in leaderboard" 
            :key="person.name"
            class="flex items-center justify-between p-3 rounded-lg"
            :class="[
              index === 0 ? 'bg-yellow-100 border border-yellow-300' : 
              index === 1 ? 'bg-gray-100 border border-gray-300' : 
              index === 2 ? 'bg-orange-100 border border-orange-300' : 
              'bg-amber-50 border border-amber-200'
            ]"
          >
            <div class="flex items-center gap-3">
              <div class="text-2xl">
                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍' }}
              </div>
              <div>
                <div class="font-semibold text-amber-800">{{ person.name }}</div>
                <div class="text-sm text-amber-600">
                  {{ person.count }} late arrival{{ person.count !== 1 ? 's' : '' }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-amber-600">
                {{ person.delivered }} delivered, {{ person.pending }} pending
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Recent History -->
      <UCard class="croissant-shadow mt-8">
        <template #header>
          <div class="flex items-center gap-2">
            <div class="text-2xl">📋</div>
            <h2 class="text-xl font-semibold text-amber-800">Recent History</h2>
          </div>
        </template>
        
        <div v-if="recentEntries.length === 0" class="text-center py-8 text-amber-600">
          <p>No history yet. Start tracking late arrivals!</p>
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="entry in recentEntries" 
            :key="entry.id"
            class="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
          >
            <div>
              <div class="font-semibold text-amber-800">{{ entry.name }}</div>
              <div class="text-sm text-amber-600">{{ formatDate(entry.date) }}</div>
              <div v-if="entry.reason" class="text-xs text-amber-500 italic">{{ entry.reason }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium" :class="entry.delivered ? 'text-green-600' : 'text-orange-600'">
                {{ entry.delivered ? '✅ Delivered' : '🥐 Pending' }}
              </div>
              <div v-if="entry.deliveredDate" class="text-xs text-green-500">
                Delivered: {{ formatDate(entry.deliveredDate) }}
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Reactive data
const entries = ref([])
const newEntry = ref({
  name: '',
  date: new Date().toISOString().split('T')[0],
  reason: ''
})

// Computed properties
const totalLateCount = computed(() => entries.value.length)
const pendingCroissants = computed(() => entries.value.filter(e => !e.delivered).length)
const deliveredCroissants = computed(() => entries.value.filter(e => e.delivered).length)

const currentDebts = computed(() => 
  entries.value
    .filter(e => !e.delivered)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
)

const recentEntries = computed(() => 
  [...entries.value]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
)

const leaderboard = computed(() => {
  const counts = {}
  entries.value.forEach(entry => {
    if (!counts[entry.name]) {
      counts[entry.name] = { count: 0, delivered: 0, pending: 0 }
    }
    counts[entry.name].count++
    if (entry.delivered) {
      counts[entry.name].delivered++
    } else {
      counts[entry.name].pending++
    }
  })
  
  return Object.entries(counts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
})

// Methods
const addLateArrival = () => {
  if (!newEntry.value.name || !newEntry.value.date) return
  
  const entry = {
    id: Date.now(),
    name: newEntry.value.name.trim(),
    date: newEntry.value.date,
    reason: newEntry.value.reason.trim(),
    delivered: false,
    deliveredDate: null,
    createdAt: new Date().toISOString()
  }
  
  entries.value.push(entry)
  saveToLocalStorage()
  
  // Reset form
  newEntry.value = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  }
}

const markAsDelivered = (id) => {
  const entry = entries.value.find(e => e.id === id)
  if (entry) {
    entry.delivered = true
    entry.deliveredDate = new Date().toISOString().split('T')[0]
    saveToLocalStorage()
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const saveToLocalStorage = () => {
  if (import.meta.client) {
    localStorage.setItem('croissant-tracker-entries', JSON.stringify(entries.value))
  }
}

const loadFromLocalStorage = () => {
  if (import.meta.client) {
    const saved = localStorage.getItem('croissant-tracker-entries')
    if (saved) {
      entries.value = JSON.parse(saved)
    }
  }
}

// Lifecycle
onMounted(() => {
  loadFromLocalStorage()
})

// SEO
useHead({
  title: 'Croissant Tracker - Track Late Arrivals',
  meta: [
    { name: 'description', content: 'Fun app to track who owes croissants for being late to meetings or work!' }
  ]
})
</script>