<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/shared/composables/useAuth'
import { searchUsersApi, type UserSearchItem } from '@/shared/api/users.api'
import { getUserProfileApi } from '@/shared/api/users.api'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { DEFAULT_AVATAR, resolveAvatar } from '@/shared/constants/avatar'

const { user, isAuthenticated, logout } = useAuth()
const authStore = useAuthStore()
const router = useRouter()

const keyword = ref('')
const results = ref<UserSearchItem[]>([])
const isSearching = ref(false)
const searchError = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

const showResultPanel = computed(() => {
  const hasKeyword = keyword.value.trim().length > 0
  return hasKeyword && (isSearching.value || searchError.value.length > 0 || results.value.length > 0)
})

const userInitial = computed(() => (user.value?.username || user.value?.fullName || 'U')[0]?.toUpperCase())
const headerAvatarUrl = computed(() => resolveAvatar(user.value?.avatarUrl))

onMounted(() => {
  syncCurrentUserProfile()
})

watch(keyword, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  const trimmed = value.trim()
  searchError.value = ''

  if (trimmed.length < 2) {
    results.value = []
    isSearching.value = false
    return
  }

  searchTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      results.value = await searchUsersApi(trimmed, 8)
    } catch (error) {
      results.value = []
      searchError.value = error instanceof Error ? error.message : 'Search failed'
    } finally {
      isSearching.value = false
    }
  }, 250)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

function openUserProfile(userId: number): void {
  keyword.value = ''
  results.value = []
  router.push(`/users/${userId}`)
}

function onUserAvatarError(event: Event) {
  const image = event.target as HTMLImageElement
  image.src = DEFAULT_AVATAR
}

async function syncCurrentUserProfile(): Promise<void> {
  const currentUserId = Number(authStore.userId)
  if (!Number.isFinite(currentUserId) || currentUserId <= 0) return

  try {
    const profile = await getUserProfileApi(currentUserId)
    authStore.updateUserProfile({
      username: profile.username,
      fullName: profile.full_name || profile.username,
      avatarUrl: profile.avatar_url ?? '',
    })
  } catch {
    // Header can still render the locally stored user when profile sync is unavailable.
  }
}
</script>

<template>
  <header class="app-header">
    <div class="inner">
      <div class="brand">
        <h1 class="title">NeuraNet</h1>
        <p class="subtitle">Stay Connected</p>
      </div>

      <label class="search-box" aria-label="Search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="M20 20l-3.5-3.5"></path>
        </svg>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="Search VibeFlow..."
          autocomplete="off"
        />

        <div v-if="showResultPanel" class="search-results">
          <p v-if="isSearching" class="search-state">Searching...</p>
          <p v-else-if="searchError" class="search-state error">{{ searchError }}</p>
          <p v-else-if="results.length === 0" class="search-state">No users found.</p>

          <ul v-else class="search-list">
            <li v-for="item in results" :key="item.id" class="search-item" @click="openUserProfile(item.id)">
              <span class="search-user-avatar">{{ item.username[0]?.toUpperCase() }}</span>
              <div class="search-user-meta">
                <strong>@{{ item.username }}</strong>
                <small>{{ item.full_name || 'No full name' }}</small>
              </div>
            </li>
          </ul>
        </div>
      </label>

      <div class="right-zone" v-if="isAuthenticated">
        <div class="user-chip">
          <span class="user-avatar">
            <img
              v-if="user?.avatarUrl"
              class="user-avatar-image"
              :src="headerAvatarUrl"
              alt=""
              @error="onUserAvatarError"
            />
            <span v-else class="user-avatar-initial">{{ userInitial }}</span>
          </span>
          <span class="user-name">{{ user?.username || user?.fullName }}</span>
        </div>
        <button class="button secondary logout" type="button" @click="logout">
          Log out
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(247, 249, 252, 0.88);
  backdrop-filter: blur(14px);
  margin-bottom: 20px;
}

.inner {
  width: 100%;
  margin: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 14px 24px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.search-box {
  max-width: 440px;
  width: 100%;
  justify-self: center;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 999px;
  padding: 10px 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: var(--shadow-soft);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--muted);
}

.search-input {
  border: none;
  background: transparent;
  width: 100%;
  font: inherit;
  color: var(--text);
}

.search-input:focus {
  outline: none;
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  max-height: 280px;
  overflow-y: auto;
  z-index: 30;
  padding: 8px;
}

.search-state {
  margin: 0;
  padding: 8px;
  font-size: 13px;
  color: var(--muted);
}

.search-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.search-item:hover {
  background: #f8fafc;
}

.search-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f0f0f0;
  font-size: 12px;
  font-weight: 700;
}

.search-user-meta {
  display: grid;
}

.search-user-meta strong {
  font-size: 13px;
  line-height: 1.1;
}

.search-user-meta small {
  font-size: 12px;
  color: var(--muted);
}

.right-zone {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #fff;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.icon-btn:hover {
  color: var(--primary);
  border-color: rgba(28, 98, 214, 0.4);
  transform: translateY(-1px);
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.user-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-initial {
  line-height: 1;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
}

.logout {
  width: auto;
  padding-inline: 14px;
}

@media (max-width: 900px) {
  .inner {
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 12px 0;
  }

  .search-box {
    display: none;
  }

  .title {
    font-size: 22px;
  }

  .subtitle,
  .user-chip,
  .logout {
    display: none;
  }
}
</style>
