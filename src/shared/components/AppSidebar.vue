<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/chat', label: 'Messages', icon: 'chat' },
  { to: '/profile-standalone', label: 'Profile', icon: 'user' },
]

const notificationsStore = useNotificationsStore()
const route = useRoute()
const isChatRoute = computed(() => route.path.startsWith('/chat'))
const isProfileRoute = computed(() =>
  route.path.startsWith('/profile-standalone') || route.path.startsWith('/users'),
)
const isNotificationsRoute = computed(() => route.path.startsWith('/notifications'))
const shouldHideCreatePost = computed(
  () => isChatRoute.value || isProfileRoute.value || isNotificationsRoute.value,
)

onMounted(() => {
  const userId = Number(localStorage.getItem('user_id'))
  if (Number.isFinite(userId) && userId > 0) {
    notificationsStore.connect(userId)
    void notificationsStore.refreshUnreadCount()
  }
})

onUnmounted(() => {
  notificationsStore.disconnect()
})

function openCreatePost() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('open-create-post'))
}
</script>

<template>
  <aside class="sidebar">
    <nav class="nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="item"
        active-class="active"
        exact-active-class="active"
      >
        <span class="icon">
          <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 10v10h14V10" />
          </svg>
          <svg v-else-if="item.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 0 0 6 0" />
          </svg>
          <svg v-else-if="item.icon === 'chat'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span class="label-wrap">
          <span>{{ item.label }}</span>
          <span
            v-if="item.to === '/notifications' && notificationsStore.unreadCount > 0"
            class="badge"
          >
            {{ notificationsStore.unreadCount > 99 ? '99+' : notificationsStore.unreadCount }}
          </span>
        </span>
      </RouterLink>
    </nav>

    <button v-if="!shouldHideCreatePost" class="create-btn" type="button" @click="openCreatePost">
      <span class="create-icon">+</span>
      Create Post
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 92px;
  height: calc(100vh - 120px);
  padding: 8px 4px 12px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  border-radius: 14px;
  padding: 10px 12px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  background: transparent;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.item:hover {
  background: #f8fafc;
  transform: translateY(-1px);
  text-decoration: none;
}

.active {
  background: var(--primary-soft);
  border-color: rgba(28, 98, 214, 0.25);
}

.icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #fff;
  color: var(--muted);
}

.icon svg {
  width: 16px;
  height: 16px;
}


.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border-radius: 999px;
  border: none;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--primary), #2b7cf6);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 16px 24px rgba(28, 98, 214, 0.2);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(28, 98, 214, 0.25);
}

.create-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-size: 18px;
  line-height: 1;
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 25;
    flex-direction: row;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.94);
    border-top: 1px solid var(--border);
    padding: 10px 8px;
    height: auto;
  }

  .nav {
    flex-direction: row;
    width: 100%;
    justify-content: space-around;
  }

  .create-btn {
    display: none;
  }

  .item {
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 6px;
    border: none;
    border-radius: 10px;
    min-width: 80px;
  }

  .label-wrap {
    gap: 4px;
    flex-direction: column;
  }

  .badge {
    min-width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .icon {
    width: 26px;
    height: 26px;
  }
}
</style>
