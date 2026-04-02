<script setup lang="ts">
import dayjs from 'dayjs'
import { useChatStore } from '@/features/chat/store/chat.store'

const chatStore = useChatStore()
</script>

<template>
  <section class="card chat-window">
    <header class="head">
      <h3 class="section-title">Conversation</h3>
      <button class="button secondary follow-btn" type="button">View Profile</button>
    </header>
    <p v-if="chatStore.isLoading" class="muted">Loading messages...</p>
    <ul v-else class="messages">
      <li
        v-for="message in chatStore.messages"
        :key="message.id"
        class="message-item"
        :class="{ me: message.senderName === 'You' }"
      >
        <strong>{{ message.senderName }}</strong>
        <p>{{ message.content }}</p>
        <small class="muted">{{ dayjs(message.createdAt).format('HH:mm DD/MM/YYYY') }}</small>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.chat-window {
  padding: 12px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.follow-btn {
  width: auto;
  padding: 7px 12px;
}

.messages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.message-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  max-width: 75%;
  background: #f7f7f7;
}

.message-item p {
  margin: 4px 0;
}

.message-item.me {
  margin-left: auto;
  background: var(--primary-soft);
  border-color: #cde7ff;
}

@media (max-width: 900px) {
  .message-item {
    max-width: 90%;
  }
}
</style>
