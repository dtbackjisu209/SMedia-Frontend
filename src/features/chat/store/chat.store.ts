import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchMessagesApi, fetchThreadsApi } from '@/features/chat/api/chat.api'
import type { ChatMessage, ChatThread } from '@/shared/types/social'

export const useChatStore = defineStore('chat', () => {
  const threads = ref<ChatThread[]>([])
  const messages = ref<ChatMessage[]>([])
  const activeThreadId = ref<string>('')
  const isLoading = ref(false)

  async function fetchThreads() {
    threads.value = await fetchThreadsApi()
    if (threads.value.length > 0 && !activeThreadId.value) {
      await selectThread(threads.value[0].id)
    }
  }

  async function selectThread(threadId: string) {
    activeThreadId.value = threadId
    isLoading.value = true
    try {
      messages.value = await fetchMessagesApi(threadId)
    } finally {
      isLoading.value = false
    }
  }

  return { threads, messages, activeThreadId, isLoading, fetchThreads, selectThread }
})
