<script setup lang="ts">
import dayjs from 'dayjs'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

const notificationsStore = useNotificationsStore()
</script>

<template>
  <section class="notify-wrap">
    <header class="notify-head">
      <h2 class="section-title">Notifications</h2>
      <p class="muted">Recent activity from your network</p>
    </header>

    <p v-if="notificationsStore.isLoading" class="muted">Loading notifications...</p>
    <ul v-else class="list">
      <li v-for="item in notificationsStore.notifications" :key="item.id" class="card item" :class="{ unread: !item.read }">
        <span class="avatar"></span>

        <div class="meta">
          <p class="content">{{ item.content }}</p>
          <small class="muted">{{ dayjs(item.createdAt).format('HH:mm DD/MM/YYYY') }}</small>
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

.content {
  margin: 0 0 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}
</style>
