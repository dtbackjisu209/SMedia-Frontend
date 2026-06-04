<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getFollowSuggestions, type FollowSuggestion } from '@/features/auth/api/follow.api'
import { useFollowStore } from '@/features/auth/store/follow.store'
import { resolveAvatar, DEFAULT_AVATAR } from '@/shared/constants/avatar'

const followStore = useFollowStore()
const suggestions = ref<FollowSuggestion[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const busyIds = ref<Set<number>>(new Set())

const visibleSuggestions = computed(() => suggestions.value.slice(0, 5))

onMounted(() => {
  loadSuggestions()
})

async function loadSuggestions() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    suggestions.value = await getFollowSuggestions()
  } catch {
    errorMessage.value = 'Unable to load suggestions.'
  } finally {
    isLoading.value = false
  }
}

function onAvatarError(event: Event) {
  const image = event.target as HTMLImageElement
  image.src = DEFAULT_AVATAR
}

async function followSuggestion(userId: number) {
  if (busyIds.value.has(userId)) return

  busyIds.value.add(userId)
  busyIds.value = new Set(busyIds.value)

  try {
    await followStore.toggleFollow(userId)
    suggestions.value = suggestions.value.filter((item) => item.id !== userId)
  } catch {
    errorMessage.value = 'Unable to follow this user.'
  } finally {
    busyIds.value.delete(userId)
    busyIds.value = new Set(busyIds.value)
  }
}
</script>

<template>
  <section class="card rail-card">
    <div class="rail-head">
      <h3 class="section-title">Who to follow</h3>
    </div>

    <div v-if="isLoading" class="follow-list" aria-live="polite">
      <div v-for="index in 3" :key="index" class="follow-item follow-item--loading">
        <span class="avatar skeleton"></span>
        <div class="follow-meta">
          <span class="text-line skeleton"></span>
          <span class="text-line text-line--short skeleton"></span>
        </div>
      </div>
    </div>

    <p v-else-if="errorMessage" class="rail-state">{{ errorMessage }}</p>
    <p v-else-if="visibleSuggestions.length === 0" class="rail-state">No suggestions yet.</p>

    <div v-else class="follow-list">
      <div v-for="user in visibleSuggestions" :key="user.id" class="follow-item">
        <RouterLink class="avatar-link" :to="`/users/${user.id}`" :aria-label="`View ${user.username} profile`">
          <img class="avatar" :src="resolveAvatar(user.avatar_url)" :alt="user.username" @error="onAvatarError" />
        </RouterLink>

        <RouterLink class="follow-meta" :to="`/users/${user.id}`">
          <p class="name">{{ user.username }}</p>
          <p class="muted">@{{ user.username }}</p>
        </RouterLink>

        <button
          class="follow-btn"
          type="button"
          :disabled="busyIds.has(user.id)"
          @click="followSuggestion(user.id)"
        >
          {{ busyIds.has(user.id) ? '...' : 'Follow' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rail-card {
  padding: 16px;
  border-radius: var(--radius-lg);
}

.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.follow-list {
  display: grid;
  gap: 12px;
}

.follow-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.follow-item--loading {
  grid-template-columns: auto minmax(0, 1fr);
}

.avatar-link {
  display: inline-flex;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--primary-soft);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.follow-meta {
  min-width: 0;
  display: grid;
  gap: 2px;
  text-decoration: none;
}

.follow-btn {
  border: 1px solid rgba(28, 98, 214, 0.4);
  background: #fff;
  color: var(--primary);
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 600;
  cursor: pointer;
}

.follow-btn:hover:not(:disabled) {
  background: var(--primary-soft);
}

.follow-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-state {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
  margin: 0;
}

.skeleton {
  position: relative;
  overflow: hidden;
  background: #e5e7eb;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: shimmer 1.3s infinite;
}

.text-line {
  width: 110px;
  height: 13px;
  border-radius: 999px;
}

.text-line--short {
  width: 72px;
  height: 11px;
}

@keyframes shimmer {
  to {
    transform: translateX(100%);
  }
}
</style>
