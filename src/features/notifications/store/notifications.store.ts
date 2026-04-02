import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchNotificationsApi } from '@/features/notifications/api/notifications.api'
import type { NotificationItem } from '@/shared/types/social'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[]>([])
  const isLoading = ref(false)

  async function fetchNotifications() {
    isLoading.value = true
    try {
      notifications.value = await fetchNotificationsApi()
    } finally {
      isLoading.value = false
    }
  }

  return { notifications, isLoading, fetchNotifications }
})
