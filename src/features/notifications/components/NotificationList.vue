<script setup lang="ts">
import dayjs from 'dayjs'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'
import type { NotificationItem } from '@/shared/types/social'

const notificationsStore = useNotificationsStore()
const router = useRouter()
const actionLoadingId = ref<string | null>(null)

async function handleNotificationClick(item: NotificationItem) {
  if (!item.read) {
    await notificationsStore.markRead(item.id)
  }

  if (item.targetPath) {
    await router.push(item.targetPath)
  }
}

async function handleAccept(item: NotificationItem) {
  if (!item.referenceId || actionLoadingId.value) return

  actionLoadingId.value = item.id
  try {
    await notificationsStore.acceptRequest(item.id, item.referenceId)
  } finally {
    actionLoadingId.value = null
  }
}

async function handleDecline(item: NotificationItem) {
  if (!item.referenceId || actionLoadingId.value) return

  actionLoadingId.value = item.id
  try {
    await notificationsStore.rejectRequest(item.id, item.referenceId)
  } finally {
    actionLoadingId.value = null
  }
}
</script>

<template>
  <section class="notify-wrap">
    <header class="notify-head">
      <div>
        <h2 class="section-title">Notifications</h2>
        <p class="muted">Recent activity from your network</p>
      </div>
      <button
        v-if="notificationsStore.notifications.length"
        class="mark-all-btn"
        type="button"
        @click="notificationsStore.markAllRead"
      >
        Mark all as read
      </button>
      <button
        v-if="notificationsStore.notifications.some((item) => item.read)"
        class="mark-all-btn"
        type="button"
        @click="notificationsStore.clearRead"
      >
        Clear read
      </button>
    </header>

    <p v-if="notificationsStore.isLoading" class="muted">Loading notifications...</p>
    <p v-else-if="notificationsStore.notifications.length === 0" class="muted">No notifications yet.</p>
    <ul v-else class="list">
      <li
        v-for="item in notificationsStore.notifications"
        :key="item.id"
        class="card item"
        :class="{ unread: !item.read, clickable: Boolean(item.targetPath) }"
        @click="handleNotificationClick(item)"
      >
        <span class="avatar"></span>

        <div class="meta">
          <small class="kind">{{ item.kindLabel }}</small>
          <p class="content">{{ item.content }}</p>
          <small class="muted">{{ dayjs(item.createdAt).format('HH:mm DD/MM/YYYY') }}</small>
          <div v-if="item.type === 'follow_request' && item.referenceId" class="actions">
            <button
              type="button"
              class="action-btn action-btn--primary"
              :disabled="actionLoadingId === item.id"
              @click.stop="handleAccept(item)"
            >
              Allow
            </button>
            <button
              type="button"
              class="action-btn"
              :disabled="actionLoadingId === item.id"
              @click.stop="handleDecline(item)"
            >
              Decline
            </button>
          </div>
        </div>

        <span v-if="!item.read" class="dot" aria-label="Unread"></span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.notify-wrap {
  display: grid;
  gap: 12px;
}

.notify-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.mark-all-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.item {
  padding: 12px;
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 10px;
  align-items: center;
}

.clickable {
  cursor: pointer;
}

.unread {
  border-color: #cde7ff;
  background: #f8fcff;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--story-ring);
  position: relative;
}

.avatar::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #fff;
}

.meta {
  min-width: 0;
}

.kind {
  display: inline-flex;
  margin-bottom: 4px;
  font-weight: 700;
  color: var(--primary);
}

.content {
  margin: 0 0 4px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
}

.action-btn--primary {
  border-color: transparent;
  background: var(--primary);
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}
</style>
