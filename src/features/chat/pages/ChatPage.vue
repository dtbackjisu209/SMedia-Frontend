<script setup lang="ts">
import { onMounted } from 'vue'
import ChatThreadList from '@/features/chat/components/ChatThreadList.vue'
import ChatWindow from '@/features/chat/components/ChatWindow.vue'
import { useChatStore } from '@/features/chat/store/chat.store'

const chatStore = useChatStore()

onMounted(() => {
  chatStore.fetchThreads()
})
</script>

<template>
  <section class="chat-page">
    <ChatThreadList />
    <ChatWindow />
  </section>
</template>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 14px;
  min-height: 72vh;
}

@media (max-width: 900px) {
  .chat-page {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}
</style>
