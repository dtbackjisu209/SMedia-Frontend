import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { chatApi } from '../api/chat.api'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
  created_at: string
  isOwn?: boolean
}

export interface Member {
  user_id: number
  name: string
  avatar?: string
}

export interface Conversation {
  id: number
  name?: string
  type: 'private' | 'group'
  members: Member[]
  lastMessage?: Message | null
  unreadCount: number
}

export const useChatStore = defineStore('chat', () => {
  // ── State ──
  const conversations    = ref<Conversation[]>([])
  const activeId         = ref<string | null>(null)
  const messages         = ref<Message[]>([])
  const isLoadingMsgs    = ref(false)
  const isTyping         = ref(false)
  const typingText       = ref('')
  const currentUserId    = ref<number>(0)
  const currentUserName  = ref<string>('')
  const onlineUserIds    = ref<Set<number>>(new Set())
  const notificationsStore = useNotificationsStore()

  let socket: Socket | null = null
  let typingTimer: ReturnType<typeof setTimeout> | null = null
  let presenceTimer: ReturnType<typeof setInterval> | null = null

  // ── Getters ──
  const activeConversation = computed(() =>
    conversations.value.find(c => c.id.toString() === activeId.value) ?? null
  )

  function emitActiveConversation(conversationId: string | null) {
    if (!socket?.connected) return
    socket.emit('set_active_conversation', {
      conversationId: conversationId ?? null,
    })
  }

  // ── Socket setup ──
  function connect(userId: number, userName: string) {
    currentUserId.value   = userId
    currentUserName.value = userName

    if (socket?.connected) return

    socket = io(import.meta.env.VITE_SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', () => {
      socket!.emit('identify', userId)
      socket!.emit('request_presence_snapshot')
      emitActiveConversation(activeId.value)
    })

    socket.on('new_message', (msg: Message) => {
      msg.sender_id = String(msg.sender_id)
      msg.conversation_id = String(msg.conversation_id)
      msg.isOwn = msg.sender_id === String(userId)
      if (msg.conversation_id === activeId.value) {
        messages.value.push(msg)
      }
      const conv = conversations.value.find(c => c.id.toString() === msg.conversation_id)
      if (conv) {
        conv.lastMessage = msg
        if (msg.conversation_id !== activeId.value) conv.unreadCount++
      }
    })

    socket.on('joined_room', async (data: { conversationId: string }) => {
      await fetchConversations()
      openConversation(data.conversationId)
    })

    socket.on('new_group_created', () => { fetchConversations() })

    socket.on('presence_snapshot', (data: { onlineUserIds?: Array<number | string> }) => {
      const ids = (data.onlineUserIds ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
      onlineUserIds.value = new Set(ids)
    })

    socket.on('user_presence_changed', (payload: { userId: number | string; isOnline: boolean }) => {
      const id = Number(payload.userId)
      if (!Number.isFinite(id) || id <= 0) return

      const next = new Set(onlineUserIds.value)
      if (payload.isOnline) next.add(id)
      else next.delete(id)
      onlineUserIds.value = next
    })

    socket.on('user_typing',      (d: { message: string }) => { typingText.value = d.message; isTyping.value = true })
    socket.on('user_stop_typing', () => { isTyping.value = false; typingText.value = '' })

    if (presenceTimer) clearInterval(presenceTimer)
    presenceTimer = setInterval(() => {
      if (socket?.connected) socket.emit('request_presence_snapshot')
    }, 15000)
  }

  function disconnect() {
    if (presenceTimer) {
      clearInterval(presenceTimer)
      presenceTimer = null
    }
    emitActiveConversation(null)
    socket?.disconnect()
    socket = null
    onlineUserIds.value = new Set()
  }

  // ── Actions ──
  async function fetchConversations() {
    if (!currentUserId.value) return
    try {
      const data: Conversation[] = await chatApi.getUserConversations(currentUserId.value)
      conversations.value = data.map((c) => ({
        ...c,
        members: (c.members ?? []).map((m) => ({
          ...m,
          user_id: Number((m as { user_id: number | string }).user_id),
        })),
        lastMessage: c.lastMessage
          ? {
              ...c.lastMessage,
              sender_id: String(c.lastMessage.sender_id),
              conversation_id: String(c.lastMessage.conversation_id),
            }
          : null,
        unreadCount: 0,
      }))
    } catch (e) {
      console.error('[chat store] fetchConversations', e)
    }
  }

  async function openConversation(conversationId: string) {
    activeId.value   = conversationId
    emitActiveConversation(conversationId)
    isLoadingMsgs.value = true
    try {
      await notificationsStore.markConversationMessagesRead(conversationId)
      const data: Message[] = await chatApi.getMessages(conversationId)
      messages.value = data.map((m) => {
        const senderId = String(m.sender_id)
        return {
          ...m,
          sender_id: senderId,
          conversation_id: String(m.conversation_id),
          isOwn: senderId === String(currentUserId.value),
        }
      })
      const conv = conversations.value.find(c => c.id.toString() === conversationId)
      if (conv) conv.unreadCount = 0
    } catch (e) {
      console.error('[chat store] openConversation', e)
    } finally {
      isLoadingMsgs.value = false
    }
  }

  async function startPrivateChat(targetUserId: number) {
    if (!currentUserId.value || !targetUserId) return

    // Try socket first for realtime room join.
    socket?.emit('join_private_chat', { myId: currentUserId.value, targetUserId })

    // Fallback: create/get conversation via HTTP so UI always opens.
    try {
      const data = await chatApi.getOrCreatePrivateChat(currentUserId.value, targetUserId)
      const conversationId = String(data?.conversationId ?? '')
      if (!conversationId) return

      await fetchConversations()
      await openConversation(conversationId)
    } catch (e) {
      console.error('[chat store] startPrivateChat', e)
    }
  }

  function createGroup(name: string, memberIds: number[]) {
    const all = Array.from(new Set([currentUserId.value, ...memberIds]))
    socket?.emit('create_group_chat', { name, memberIds: all })
  }

  function sendMessage(content: string) {
    if (!activeId.value || !content.trim()) return
    socket?.emit('send_message', {
      conversationId: activeId.value,
      senderId: currentUserId.value.toString(),
      content,
    })
    stopTyping()
  }

  function startTyping() {
    if (!activeId.value) return
    socket?.emit('typing', { conversationId: activeId.value, senderName: currentUserName.value })
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(stopTyping, 2000)
  }

  function stopTyping() {
    if (!activeId.value) return
    socket?.emit('stop_typing', { conversationId: activeId.value })
  }

  function isUserOnline(userId: number): boolean {
    return onlineUserIds.value.has(Number(userId))
  }

  return {
    // state
    conversations, activeId, activeConversation,
    messages, isLoadingMsgs, isTyping, typingText, onlineUserIds,
    // actions
    connect, disconnect,
    fetchConversations, openConversation,
    startPrivateChat, createGroup,
    sendMessage, startTyping, isUserOnline,
  }
})
