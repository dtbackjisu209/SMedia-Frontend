<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

const navItems = [
  { to: '/', label: 'Feed', icon: 'F' },
  { to: '/notifications', label: 'Notifications', icon: 'N' },
  { to: '/chat', label: 'Chat', icon: 'C' },
  { to: '/profile-standalone', label: 'Profile', icon: 'P' },
]

const notificationsStore = useNotificationsStore()

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
</script>

<template>
  <aside class="sidebar">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="item"
      active-class="active"
      exact-active-class="active"
    >
      <span class="icon">{{ item.icon }}</span>
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
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 92px;
}

.item {
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
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
  background: #f3f3f3;
  text-decoration: none;
}

.active {
  background: var(--primary-soft);
  border-color: #d3e8fd;
}

.icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  border: 1px solid var(--border);
  background: #fff;
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
