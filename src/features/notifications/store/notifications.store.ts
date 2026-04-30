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
import type { NotificationItem, CommentItem } from '@/shared/types/social'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[]>([])
  const isLoading = ref(false)
  const unreadCount = ref(0)
  let socket: Socket | null = null

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
        targetPath:
          item.type === 'message'
            ? '/chat'
            : item.type === 'follow' || item.type === 'follow_request' || item.type === 'follow_accept'
              ? `/users/${item.reference_id}`
              : item.type === 'like' || item.type === 'comment'
                ? item.reference_id != null
                  ? `/posts/${item.reference_id}`
                  : null
              : item.type === 'new_post'
                ? item.reference_id != null
                  ? `/posts/${item.reference_id}`
                  : null
                : item.type === 'new_story'
                  ? '/'
              : null,
        kindLabel:
          item.type === 'message'
            ? 'Chat'
            : item.type === 'follow' || item.type === 'follow_request' || item.type === 'follow_accept'
              ? 'Profile'
              : item.type === 'like'
                ? 'Like'
                : item.type === 'comment'
                  ? 'Comment'
              : item.type === 'new_post'
                ? 'Post'
                : item.type === 'new_story'
                  ? 'Story'
              : 'Activity',
      }

      notifications.value = [normalized, ...notifications.value.filter((n) => n.id !== normalized.id)]
      unreadCount.value = notifications.value.filter((n) => !n.read).length
    })
  }

  // ── Post room helpers (reuse socket hiện có) ──────────────────────────

  // Join room của bài post đang xem → nhận new_comment realtime
  function joinPost(postId: string) {
    socket?.emit('join_post', Number(postId))
  }

  // Leave room khi rời trang
  function leavePost(postId: string) {
    socket?.emit('leave_post', Number(postId))
  }

  // Đăng ký lắng nghe event new_comment, trả về hàm cleanup
  function onNewComment(callback: (comment: CommentItem) => void): () => void {
    if (!socket) return () => {}
    socket.on('new_comment', callback)
    return () => socket?.off('new_comment', callback)
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  return {
    notifications,
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
    joinPost,
    leavePost,
    onNewComment,
  }
})
