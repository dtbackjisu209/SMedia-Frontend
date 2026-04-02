import dayjs from 'dayjs'
import type { NotificationItem } from '@/shared/types/social'

export async function fetchNotificationsApi(): Promise<NotificationItem[]> {
  return Promise.resolve([
    {
      id: 'n-01',
      content: 'Le Thi C liked your post.',
      createdAt: dayjs().subtract(10, 'minute').toISOString(),
      read: false,
    },
    {
      id: 'n-02',
      content: 'Pham Van D commented on your post.',
      createdAt: dayjs().subtract(1, 'hour').toISOString(),
      read: true,
    },
  ])
}
