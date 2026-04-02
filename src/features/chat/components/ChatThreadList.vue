<script setup lang="ts">
import { useChatStore } from '@/features/chat/store/chat.store'

const chatStore = useChatStore()
</script>

<template>
  <aside class="card thread-list">
    <header class="head">
      <h3 class="section-title">Messages</h3>
      <span class="muted">{{ chatStore.threads.length }} chats</span>
    </header>
    <ul>
      <li v-for="thread in chatStore.threads" :key="thread.id">
        <button
          type="button"
          class="thread-button"
          :class="{ active: chatStore.activeThreadId === thread.id }"
          @click="chatStore.selectThread(thread.id)"
        >
          <span class="avatar"></span>
          <span class="meta">
            <strong>{{ thread.participantName }}</strong>
            <small class="muted">{{ thread.lastMessage }}</small>
          </span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.thread-list {
  padding: 12px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.thread-button {
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
}

.active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.avatar {
  width: 40px;
  height: 40px;
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
  display: grid;
  gap: 4px;
}
</style>
