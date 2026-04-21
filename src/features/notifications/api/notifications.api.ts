import { http } from '@/shared/api/http'
import type { NotificationItem } from '@/shared/types/social'

type NotificationApiItem = {
  id: number | string
  type: string
  content: string
  reference_id?: number | string | null
  created_at: string
  is_read: boolean
}

function getNotificationTargetPath(type: string, referenceId?: number | string | null): string | null {
  if (referenceId == null) return null

  if (type === 'message') {
    return '/chat'
  }

  if (type === 'follow' || type === 'follow_request' || type === 'follow_accept') {
    return `/users/${referenceId}`
  }

  return null
}

function getNotificationKindLabel(type: string): string {
  if (type === 'message') return 'Chat'
  if (type === 'follow' || type === 'follow_request' || type === 'follow_accept') return 'Profile'
  return 'Activity'
}

function normalizeNotification(item: NotificationApiItem): NotificationItem {
  return {
    id: String(item.id),
    type: item.type,
    content: item.content,
    referenceId: item.reference_id != null ? String(item.reference_id) : null,
    createdAt: item.created_at,
    read: Boolean(item.is_read),
    targetPath: getNotificationTargetPath(item.type, item.reference_id),
    kindLabel: getNotificationKindLabel(item.type),
  }
}

export async function fetchNotificationsApi(): Promise<NotificationItem[]> {
  const response = await http.get('/notifications')
  const items = (response.data?.data ?? []) as NotificationApiItem[]
  return items.map(normalizeNotification)
}

export async function fetchNotificationSummaryApi(): Promise<number> {
  const response = await http.get('/notifications/summary')
  return Number(response.data?.data?.unreadCount ?? 0)
}

export async function markNotificationReadApi(notificationId: string): Promise<number> {
  const response = await http.patch(`/notifications/${notificationId}/read`)
  return Number(response.data?.data?.unreadCount ?? 0)
}

export async function markConversationMessageNotificationsReadApi(conversationId: string): Promise<number> {
  const response = await http.patch('/notifications/messages/read-by-conversation', {
    conversationId: Number(conversationId),
  })
  return Number(response.data?.data?.unreadCount ?? 0)
}

export async function markAllNotificationsReadApi(): Promise<number> {
  const response = await http.patch('/notifications/read-all')
  return Number(response.data?.data?.unreadCount ?? 0)
}

export async function clearReadNotificationsApi(): Promise<number> {
  const response = await http.delete('/notifications/read')
  return Number(response.data?.data?.unreadCount ?? 0)
}
