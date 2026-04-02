import dayjs from 'dayjs'
import type { ChatMessage, ChatThread } from '@/shared/types/social'

export async function fetchThreadsApi(): Promise<ChatThread[]> {
  return Promise.resolve([
    { id: 't-1', participantName: 'Nguyen Van A', lastMessage: 'Ban dang lam gi vay?' },
    { id: 't-2', participantName: 'Tran Thi B', lastMessage: 'Mai hop team luc 9h nhe.' },
  ])
}

export async function fetchMessagesApi(threadId: string): Promise<ChatMessage[]> {
  return Promise.resolve([
    {
      id: `${threadId}-m1`,
      senderName: 'Nguyen Van A',
      content: 'Hello, project tien do den dau roi?',
      createdAt: dayjs().subtract(25, 'minute').toISOString(),
    },
    {
      id: `${threadId}-m2`,
      senderName: 'You',
      content: 'Toi dang hoan thien module notification.',
      createdAt: dayjs().subtract(10, 'minute').toISOString(),
    },
  ])
}
