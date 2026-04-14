<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/shared/composables/useAuth'
import { searchUsersApi, type UserSearchItem } from '@/shared/api/users.api'

const { user, isAuthenticated, logout } = useAuth()
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
</script>

<template>
  <header class="app-header">
    <div class="inner">
      <h1 class="title">Socialgram</h1>

      <label class="search-box" aria-label="Search">
        <span class="search-dot"></span>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="Search username..."
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
        <span class="user-pill">{{ user?.username || user?.fullName }}</span>
        <button class="button secondary logout" type="button" @click="logout">
          Logout
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
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  margin-bottom: 24px;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 14px 24px;
}

.title {
  margin: 0;
  font-family: 'Pacifico', cursive;
  font-size: 30px;
  font-weight: 400;
}

.search-box {
  max-width: 380px;
  width: 100%;
  justify-self: center;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #efefef;
  border-radius: 8px;
  padding: 8px 10px;
}

.search-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #999;
  border-radius: 50%;
  position: relative;
}

.search-dot::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 2px;
  background: #999;
  transform: rotate(45deg);
  right: -5px;
  bottom: -3px;
}

.search-input {
  border: none;
  background: transparent;
  width: 100%;
  font: inherit;
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
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
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
  background: #f7f7f7;
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

.user-pill {
  font-size: 13px;
  font-weight: 600;
  background: #f3f3f3;
  border-radius: 999px;
  padding: 8px 10px;
}

.logout {
  width: auto;
  padding-inline: 14px;
}

@media (max-width: 900px) {
  .inner {
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 12px;
  }

  .search-box {
    display: none;
  }

  .title {
    font-size: 26px;
  }

  .user-pill {
    display: none;
  }
}
</style>
