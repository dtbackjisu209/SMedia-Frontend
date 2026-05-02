import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { acceptFollowRequest, rejectFollowRequest } from '@/features/auth/api/follow.api'
import {
  clearReadNotificationsApi,
  fetchNotificationsApi,
  fetchNotificationSummaryApi,
  markAllNotificationsReadApi,
  markConversationMessageNotificationsReadApi,
  markNotificationReadApi,
} from '@/features/notifications/api/notifications.api'
import type { NotificationItem, NotificationToastItem } from '@/shared/types/social'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[]>([])
  const toasts = ref<NotificationToastItem[]>([])
  const isLoading = ref(false)
  const unreadCount = ref(0)
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()
  let socket: Socket | null = null

  function getTargetPath(type: string, referenceId?: number | string | null): string | null {
    if (type === 'message') {
      if (referenceId == null) return '/chat'
      return `/chat?conversationId=${referenceId}`
    }

    if (type === 'follow' || type === 'follow_request' || type === 'follow_accept') {
      if (referenceId == null) return null
      return `/users/${referenceId}`
    }

    if (type === 'like' || type === 'comment' || type === 'new_post') {
      if (referenceId == null) return null
      return `/posts/${referenceId}`
    }

    if (type === 'new_story') {
      return '/'
    }

    return null
  }

  function getKindLabel(type: string): string {
    if (type === 'message') return 'Chat'
    if (type === 'follow' || type === 'follow_request' || type === 'follow_accept') return 'Profile'
    if (type === 'like') return 'Like'
    if (type === 'comment') return 'Comment'
    if (type === 'new_post') return 'Post'
    if (type === 'new_story') return 'Story'
    return 'Activity'
  }

  function dismissToast(toastId: string) {
    const timer = toastTimers.get(toastId)
    if (timer) {
      clearTimeout(timer)
      toastTimers.delete(toastId)
    }

    toasts.value = toasts.value.filter((toast) => toast.id !== toastId)
  }

  function pushToast(notification: NotificationItem) {
    const toastId = `${notification.id}-${Date.now()}`

    const nextToasts = [{ id: toastId, notification }, ...toasts.value]
    const droppedToasts = nextToasts.slice(4)
    droppedToasts.forEach((toast) => dismissToast(toast.id))
    toasts.value = nextToasts.slice(0, 4)

    const timer = setTimeout(() => {
      dismissToast(toastId)
    }, 5000)

    toastTimers.set(toastId, timer)
  }

  async function fetchNotifications() {
    isLoading.value = true
    try {
      notifications.value = await fetchNotificationsApi()
      unreadCount.value = await fetchNotificationSummaryApi()
    } finally {
      isLoading.value = false
    }
  }

  async function refreshUnreadCount() {
    unreadCount.value = await fetchNotificationSummaryApi()
  }

  async function markRead(notificationId: string) {
    unreadCount.value = await markNotificationReadApi(notificationId)
    notifications.value = notifications.value.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    )
  }

  async function markAllRead() {
    unreadCount.value = await markAllNotificationsReadApi()
    notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
  }

  async function clearRead() {
    unreadCount.value = await clearReadNotificationsApi()
    notifications.value = notifications.value.filter((item) => !item.read)
  }

  async function markConversationMessagesRead(conversationId: string) {
    unreadCount.value = await markConversationMessageNotificationsReadApi(conversationId)
    notifications.value = notifications.value.map((item) =>
      item.type === 'message' && item.referenceId === conversationId ? { ...item, read: true } : item,
    )
  }

  async function acceptRequest(notificationId: string, requesterId: string) {
    await acceptFollowRequest(Number(requesterId))
    await markRead(notificationId)
    notifications.value = notifications.value.filter((item) => item.id !== notificationId)
  }

  async function rejectRequest(notificationId: string, requesterId: string) {
    await rejectFollowRequest(Number(requesterId))
    await markRead(notificationId)
    notifications.value = notifications.value.filter((item) => item.id !== notificationId)
  }

  function connect(userId: number) {
    if (!Number.isFinite(userId) || userId <= 0) return
    if (socket?.connected) return

    socket = io(import.meta.env.VITE_SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', () => {
      socket!.emit('subscribe_notifications', userId)
    })

    socket.on('new_notification', (item: {
      id: number | string
      type: string
      content: string
      reference_id?: number | string | null
      created_at: string
      is_read: boolean
    }) => {
      const normalized: NotificationItem = {
        id: String(item.id),
        type: item.type,
        content: item.content,
        referenceId: item.reference_id != null ? String(item.reference_id) : null,
        createdAt: item.created_at,
        read: Boolean(item.is_read),
        targetPath: getTargetPath(item.type, item.reference_id),
        kindLabel: getKindLabel(item.type),
      }

      notifications.value = [normalized, ...notifications.value.filter((n) => n.id !== normalized.id)]
      unreadCount.value = notifications.value.filter((n) => !n.read).length

      if (normalized.type === 'message') {
        pushToast(normalized)
      }
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    toastTimers.forEach((timer) => clearTimeout(timer))
    toastTimers.clear()
    toasts.value = []
  }

  return {
    notifications,
    toasts,
    isLoading,
    unreadCount,
    fetchNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    clearRead,
    markConversationMessagesRead,
    acceptRequest,
    rejectRequest,
    connect,
    disconnect,
    dismissToast,
  }
})
