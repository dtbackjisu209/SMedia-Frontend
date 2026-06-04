import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { acceptFollowRequest, rejectFollowRequest } from '@/features/auth/api/follow.api'
import { searchUsersApi } from '@/shared/api/users.api'
import {
  clearReadNotificationsApi,
  fetchNotificationsApi,
  fetchNotificationSummaryApi,
  markAllNotificationsReadApi,
  markConversationMessageNotificationsReadApi,
  markNotificationReadApi,
} from '@/features/notifications/api/notifications.api'
import type { CommentItem, NotificationItem, NotificationToastItem } from '@/shared/types/social'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[]>([])
  const toasts = ref<NotificationToastItem[]>([])
  const isLoading = ref(false)
  const unreadCount = ref(0)
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const avatarCache = new Map<string, string | null>()
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

  function getActorUsername(item: {
    content: string
    username?: string | null
    actor_username?: string | null
    sender_username?: string | null
    user_username?: string | null
    actor?: { username?: string | null } | null
    sender?: { username?: string | null } | null
    user?: { username?: string | null } | null
  }): string | null {
    return (
      item.actor_username ??
      item.sender_username ??
      item.user_username ??
      item.username ??
      item.actor?.username ??
      item.sender?.username ??
      item.user?.username ??
      item.content.match(/^@?([A-Za-z0-9_.-]+)\s/)?.[1] ??
      null
    )
  }

  async function hydrateMissingAvatars() {
    const usernames = Array.from(
      new Set(
        notifications.value
          .filter((item) => !item.actorAvatarUrl && item.actorUsername)
          .map((item) => item.actorUsername as string),
      ),
    )

    if (usernames.length === 0) return

    await Promise.all(
      usernames.map(async (username) => {
        const cacheKey = username.toLowerCase()
        if (avatarCache.has(cacheKey)) return

        try {
          const users = await searchUsersApi(username, 5)
          const matchedUser = users.find((user) => user.username.toLowerCase() === cacheKey)
          avatarCache.set(cacheKey, matchedUser?.avatar_url ?? null)
        } catch {
          avatarCache.set(cacheKey, null)
        }
      }),
    )

    notifications.value = notifications.value.map((item) => {
      if (item.actorAvatarUrl || !item.actorUsername) return item

      const avatarUrl = avatarCache.get(item.actorUsername.toLowerCase()) ?? null
      return avatarUrl ? { ...item, actorAvatarUrl: avatarUrl } : item
    })
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
      await hydrateMissingAvatars()
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
      avatar_url?: string | null
      actor_avatar_url?: string | null
      sender_avatar_url?: string | null
      user_avatar_url?: string | null
      actor?: {
        username?: string | null
        avatar_url?: string | null
        avatarUrl?: string | null
      } | null
      sender?: {
        username?: string | null
        avatar_url?: string | null
        avatarUrl?: string | null
      } | null
      user?: {
        username?: string | null
        avatar_url?: string | null
        avatarUrl?: string | null
      } | null
      username?: string | null
      actor_username?: string | null
      sender_username?: string | null
      user_username?: string | null
      created_at: string
      is_read: boolean
    }) => {
      const normalized: NotificationItem = {
        id: String(item.id),
        type: item.type,
        content: item.content,
        referenceId: item.reference_id != null ? String(item.reference_id) : null,
        actorUsername: getActorUsername(item),
        actorAvatarUrl:
          item.actor_avatar_url ??
          item.sender_avatar_url ??
          item.user_avatar_url ??
          item.avatar_url ??
          item.actor?.avatar_url ??
          item.actor?.avatarUrl ??
          item.sender?.avatar_url ??
          item.sender?.avatarUrl ??
          item.user?.avatar_url ??
          item.user?.avatarUrl ??
          null,
        createdAt: item.created_at,
        read: Boolean(item.is_read),
        targetPath: getTargetPath(item.type, item.reference_id),
        kindLabel: getKindLabel(item.type),
      }

      notifications.value = [normalized, ...notifications.value.filter((n) => n.id !== normalized.id)]
      void hydrateMissingAvatars()
      unreadCount.value = notifications.value.filter((n) => !n.read).length

      if (normalized.type === 'message') {
        pushToast(normalized)
      }
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
    joinPost,
    leavePost,
    onNewComment,

  }
})
