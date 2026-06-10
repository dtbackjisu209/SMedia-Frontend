import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { chatApi, type ChatMessagesPage } from '../api/chat.api'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

export interface MessageReply {
  id: string
  sender_id: string
  sender_name: string
  content: string
  is_recalled: boolean
  is_unavailable?: boolean
}

export interface MessageReaction {
  emoji: string
  count: number
  user_ids: string[]
}

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'seen'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string | null
  content: string
  created_at: string
  isOwn?: boolean
  client_temp_id?: string | null
  is_pending?: boolean
  delivery_status?: MessageDeliveryStatus
  read_by_user_ids?: string[]
  is_recalled?: boolean
  reply_to?: MessageReply | null
  reactions?: MessageReaction[]
}

export interface Member {
  user_id: number
  name: string
  avatar?: string
}

export interface Conversation {
  id: number
  name?: string
  nickname?: string | null
  type: 'private' | 'group'
  members: Member[]
  lastMessage?: Message | null
  unreadCount: number
  muted_until?: string | null
  muted_forever?: boolean
  is_muted?: boolean
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const activeId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const isLoadingMsgs = ref(false)
  const isLoadingOlderMsgs = ref(false)
  const hasMoreMessages = ref(false)
  const messagePage = ref(1)
  const isTyping = ref(false)
  const typingText = ref('')
  const currentUserId = ref<number>(0)
  const currentUserName = ref<string>('')
  const onlineUserIds = ref<Set<number>>(new Set())
  const memberActionError = ref('')
  const messageActionError = ref('')
  const settingsActionError = ref('')
  const replyingTo = ref<MessageReply | null>(null)
  const notificationsStore = useNotificationsStore()

  let socket: Socket | null = null
  let typingTimer: ReturnType<typeof setTimeout> | null = null
  let presenceTimer: ReturnType<typeof setInterval> | null = null

  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id.toString() === activeId.value) ?? null,
  )

  function normalizeReply(reply?: MessageReply | null): MessageReply | null {
    if (!reply) return null
    return {
      ...reply,
      id: String(reply.id),
      sender_id: String(reply.sender_id),
      is_recalled: Boolean(reply.is_recalled),
      is_unavailable: Boolean(reply.is_unavailable),
    }
  }

  function normalizeReactions(reactions?: MessageReaction[] | null): MessageReaction[] {
    return (reactions ?? [])
      .map((reaction) => ({
        emoji: String(reaction.emoji),
        count: Number(reaction.count) || 0,
        user_ids: (reaction.user_ids ?? []).map((id) => String(id)),
      }))
      .filter((reaction) => reaction.emoji && reaction.count > 0)
  }

  function normalizeMessage(message: Message): Message {
    const senderId = String(message.sender_id)
    const isOwn = senderId === String(currentUserId.value)
    return {
      ...message,
      id: String(message.id),
      client_temp_id: message.client_temp_id ? String(message.client_temp_id) : null,
      sender_id: senderId,
      conversation_id: String(message.conversation_id),
      isOwn,
      is_pending: Boolean(message.is_pending),
      delivery_status: message.delivery_status ?? (isOwn ? 'delivered' : undefined),
      read_by_user_ids: (message.read_by_user_ids ?? []).map((id) => String(id)),
      is_recalled: Boolean(message.is_recalled),
      reply_to: normalizeReply(message.reply_to),
      reactions: normalizeReactions(message.reactions),
    }
  }

  function createTempMessage(content: string): Message | null {
    if (!activeId.value || !currentUserId.value) return null
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    return {
      id: tempId,
      client_temp_id: tempId,
      conversation_id: activeId.value,
      sender_id: String(currentUserId.value),
      sender_name: currentUserName.value || 'You',
      content,
      created_at: new Date().toISOString(),
      isOwn: true,
      is_pending: true,
      delivery_status: 'sent',
      reply_to: replyingTo.value,
      reactions: [],
    }
  }

  function applyConversationRead(payload: { conversationId: string; userId: string | number; last_read_at?: string | Date | null; unreadCount?: number }) {
    const conversationId = String(payload.conversationId)
    const readerId = String(payload.userId)

    if (readerId === String(currentUserId.value)) {
      const conv = conversations.value.find((item) => item.id.toString() === conversationId)
      if (conv) conv.unreadCount = Number(payload.unreadCount ?? 0)
    }

    if (conversationId !== activeId.value || readerId === String(currentUserId.value) || !payload.last_read_at) return

    const readAt = new Date(payload.last_read_at).getTime()
    if (!Number.isFinite(readAt)) return

    messages.value = messages.value.map((message) => {
      if (!message.isOwn || new Date(message.created_at).getTime() > readAt) return message

      const readByUserIds = Array.from(new Set([...(message.read_by_user_ids ?? []), readerId]))
      return {
        ...message,
        read_by_user_ids: readByUserIds,
        delivery_status: 'seen',
      }
    })
  }

  function normalizeMembers(members: Member[]): Member[] {
    return members.map((member) => ({
      ...member,
      user_id: Number((member as { user_id: number | string }).user_id),
    }))
  }

  function emitActiveConversation(conversationId: string | null) {
    if (!socket?.connected) return
    socket.emit('set_active_conversation', {
      conversationId: conversationId ?? null,
    })
  }

  function parseMessagesPage(data: Message[] | ChatMessagesPage<Message>): ChatMessagesPage<Message> {
    if (Array.isArray(data)) {
      return {
        items: data,
        page: 1,
        limit: data.length,
        total: data.length,
        hasMore: false,
      }
    }

    return data
  }

  async function markActiveConversationRead() {
    if (!activeId.value || !currentUserId.value) return

    try {
      await chatApi.markConversationRead(activeId.value, currentUserId.value)
      socket?.emit('mark_conversation_read', {
        conversationId: activeId.value,
        userId: currentUserId.value,
      })
      const conv = conversations.value.find((c) => c.id.toString() === activeId.value)
      if (conv) conv.unreadCount = 0
    } catch (error) {
      console.error('[chat store] markActiveConversationRead', error)
    }
  }

  function connect(userId: number, userName: string) {
    currentUserId.value = userId
    currentUserName.value = userName

    if (socket?.connected) return

    socket = io(import.meta.env.VITE_SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', () => {
      socket!.emit('identify', userId)
      socket!.emit('request_presence_snapshot')
      emitActiveConversation(activeId.value)
    })

    socket.on('new_message', (incoming: Message) => {
      const msg = normalizeMessage(incoming)
      if (msg.conversation_id === activeId.value) {
        const tempId = msg.client_temp_id
        const tempIndex = tempId ? messages.value.findIndex((item) => item.id === tempId || item.client_temp_id === tempId) : -1
        const existingIndex = messages.value.findIndex((item) => item.id === msg.id)

        if (tempIndex >= 0) {
          messages.value.splice(tempIndex, 1, {
            ...msg,
            is_pending: false,
            delivery_status: msg.delivery_status ?? 'delivered',
          })
        } else if (existingIndex < 0) {
          messages.value.push(msg)
        }
      }
      const conv = conversations.value.find((c) => c.id.toString() === msg.conversation_id)
      if (conv) {
        conv.lastMessage = msg
        if (msg.conversation_id !== activeId.value && !msg.isOwn) conv.unreadCount++
        if (msg.conversation_id === activeId.value && !msg.isOwn) {
          void markActiveConversationRead()
        }
      }
    })

    socket.on('conversation_read', (payload: { conversationId: string; userId: string; last_read_at?: string | Date | null; unreadCount?: number }) => {
      applyConversationRead(payload)
    })

    socket.on(
      'message_deleted',
      (payload: { messageId: string; conversationId: string; mode: 'self' | 'everyone'; content?: string; is_recalled?: boolean }) => {
        messageActionError.value = ''

        if (payload.mode === 'self') {
          if (payload.conversationId === activeId.value) {
            messages.value = messages.value.filter((message) => message.id !== payload.messageId)
          }
        } else {
          messages.value = messages.value.map((message) =>
            message.id === payload.messageId
              ? {
                  ...message,
                  content: payload.content ?? 'Tin nhan da duoc thu hoi.',
                  is_recalled: Boolean(payload.is_recalled),
                }
              : message,
          )
        }

        const conv = conversations.value.find((item) => item.id.toString() === payload.conversationId)
        if (conv?.lastMessage?.id === payload.messageId) {
          if (payload.mode === 'self') {
            conv.lastMessage = null
          } else {
            conv.lastMessage = {
              ...conv.lastMessage,
              content: payload.content ?? 'Tin nhan da duoc thu hoi.',
              is_recalled: Boolean(payload.is_recalled),
            }
          }
        }
      },
    )

    socket.on(
      'message_reaction_updated',
      (payload: { messageId: string; conversationId: string; reactions?: MessageReaction[] }) => {
        const normalizedReactions = normalizeReactions(payload.reactions)
        if (payload.conversationId === activeId.value) {
          messages.value = messages.value.map((message) =>
            message.id === payload.messageId
              ? {
                  ...message,
                  reactions: normalizedReactions,
                }
              : message,
          )
        }
      },
    )

    socket.on('joined_room', async (data: { conversationId: string }) => {
      await fetchConversations()
      openConversation(data.conversationId)
    })

    socket.on('new_group_created', () => {
      fetchConversations()
    })

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

    socket.on('user_typing', (d: { conversationId: string; message: string }) => {
      if (String(d.conversationId) !== String(activeId.value ?? '')) return
      typingText.value = d.message
      isTyping.value = true
    })
    socket.on('user_stop_typing', (d: { conversationId: string }) => {
      if (String(d.conversationId) !== String(activeId.value ?? '')) return
      isTyping.value = false
      typingText.value = ''
    })

    socket.on('error', (message: string) => {
      messageActionError.value = message
    })

    socket.on('chat_error', (message: string) => {
      messageActionError.value = message
    })

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
    replyingTo.value = null
    isTyping.value = false
    typingText.value = ''
  }

  async function fetchConversations() {
    if (!currentUserId.value) return
    try {
      const data: Conversation[] = await chatApi.getUserConversations(currentUserId.value)
      conversations.value = data.map((c) => ({
        ...c,
        members: normalizeMembers(c.members ?? []),
        lastMessage: c.lastMessage
          ? normalizeMessage(c.lastMessage)
          : null,
        unreadCount: Number(c.unreadCount ?? 0),
        nickname: (c as { nickname?: string | null }).nickname ?? null,
        muted_until: (c as { muted_until?: string | null }).muted_until ?? null,
        muted_forever: Boolean((c as { muted_forever?: boolean }).muted_forever),
        is_muted: Boolean((c as { is_muted?: boolean }).is_muted),
      }))
    } catch (e) {
      console.error('[chat store] fetchConversations', e)
    }
  }

  async function refreshActiveConversationMembers() {
    if (!activeId.value) return
    try {
      const members: Member[] = await chatApi.getMembers(activeId.value)
      const normalized = normalizeMembers(members)
      const conversation = conversations.value.find((c) => c.id.toString() === activeId.value)
      if (conversation) {
        conversation.members = normalized
      }
    } catch (error) {
      console.error('[chat store] refreshActiveConversationMembers', error)
    }
  }

  async function updateConversationSettings(input: { nickname?: string | null; muteMode?: '1h' | '8h' | '24h' | 'forever' | 'unmute' }) {
    if (!activeId.value || !currentUserId.value) return
    settingsActionError.value = ''
    try {
      const result = await chatApi.updateConversationSettings(activeId.value, {
        requesterId: currentUserId.value,
        nickname: input.nickname,
        muteMode: input.muteMode,
      })

      const conversation = conversations.value.find((item) => item.id.toString() === activeId.value)
      if (conversation) {
        if (input.nickname !== undefined) {
          conversation.nickname = result.nickname ?? null
          conversation.name = result.nickname ?? conversation.name
        }
        conversation.muted_until = result.muted_until ?? null
        conversation.muted_forever = Boolean(result.muted_forever)
        conversation.is_muted = Boolean(result.is_muted)
      }

      await fetchConversations()
    } catch (error: any) {
      settingsActionError.value = error?.response?.data?.message ?? error?.message ?? 'Could not update chat settings'
      throw error
    }
  }

  async function openConversation(conversationId: string) {
    activeId.value = conversationId
    emitActiveConversation(conversationId)
    isTyping.value = false
    typingText.value = ''
    isLoadingMsgs.value = true
    messagePage.value = 1
    hasMoreMessages.value = false
    try {
      await notificationsStore.markConversationMessagesRead(conversationId)
      const data = parseMessagesPage(await chatApi.getMessages(conversationId, currentUserId.value))
      messages.value = data.items.map((m) => normalizeMessage(m))
      messagePage.value = data.page
      hasMoreMessages.value = Boolean(data.hasMore)
      replyingTo.value = null
      await refreshActiveConversationMembers()
      await markActiveConversationRead()
    } catch (e) {
      console.error('[chat store] openConversation', e)
    } finally {
      isLoadingMsgs.value = false
    }
  }

  async function loadOlderMessages() {
    if (!activeId.value || !currentUserId.value || isLoadingMsgs.value || isLoadingOlderMsgs.value || !hasMoreMessages.value) {
      return
    }

    isLoadingOlderMsgs.value = true
    try {
      const nextPage = messagePage.value + 1
      const data = parseMessagesPage(await chatApi.getMessages(activeId.value, currentUserId.value, 50, nextPage))
      const existingIds = new Set(messages.value.map((message) => message.id))
      const older = data.items
        .map((m) => normalizeMessage(m))
        .filter((message) => !existingIds.has(message.id))

      messages.value = [...older, ...messages.value]
      messagePage.value = data.page
      hasMoreMessages.value = Boolean(data.hasMore)
    } catch (error) {
      console.error('[chat store] loadOlderMessages', error)
    } finally {
      isLoadingOlderMsgs.value = false
    }
  }

  async function startPrivateChat(targetUserId: number) {
    if (!currentUserId.value || !targetUserId) return

    socket?.emit('join_private_chat', { myId: currentUserId.value, targetUserId })

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

  async function inviteMember(userId: number) {
    if (!activeId.value || !currentUserId.value) return
    memberActionError.value = ''
    try {
      const members: Member[] = await chatApi.inviteMember(activeId.value, userId, currentUserId.value)
      const conversation = conversations.value.find((c) => c.id.toString() === activeId.value)
      if (conversation) {
        conversation.members = normalizeMembers(members)
      }
      await fetchConversations()
    } catch (error: any) {
      memberActionError.value = error?.response?.data?.message ?? error?.message ?? 'Could not add member'
      throw error
    }
  }

  async function removeMember(userId: number) {
    if (!activeId.value || !currentUserId.value) return
    memberActionError.value = ''
    try {
      const members: Member[] = await chatApi.removeMember(activeId.value, userId, currentUserId.value)
      const conversation = conversations.value.find((c) => c.id.toString() === activeId.value)
      if (conversation) {
        conversation.members = normalizeMembers(members)
      }
      await fetchConversations()
    } catch (error: any) {
      memberActionError.value = error?.response?.data?.message ?? error?.message ?? 'Could not remove member'
      throw error
    }
  }

  function deleteMessage(
    input:
      | { messageId: string; mode: 'self' | 'everyone' }
      | string,
    fallbackMode?: 'self' | 'everyone',
  ) {
    if (!socket?.connected || !currentUserId.value) return

    const messageId = typeof input === 'string' ? input : input.messageId
    const mode = typeof input === 'string' ? fallbackMode : input.mode

    if (!messageId || !mode) {
      messageActionError.value = 'Invalid message action payload'
      return
    }

    messageActionError.value = ''
    socket.emit(
      'delete_message',
      {
        messageId,
        userId: String(currentUserId.value),
        mode,
      },
      (response: { success: boolean; message?: string }) => {
        if (!response?.success) {
          messageActionError.value = response?.message ?? 'Could not delete message'
          return
        }

        if (activeId.value) {
          fetchConversations()
          openConversation(activeId.value)
        }
      },
    )
  }

  function setReplyingTo(message: Message | null) {
    replyingTo.value = message
      ? {
          id: String(message.id),
          sender_id: String(message.sender_id),
          sender_name: message.sender_name,
          content: message.content,
          is_recalled: Boolean(message.is_recalled),
          is_unavailable: false,
        }
      : null
  }

  function clearReplyingTo() {
    replyingTo.value = null
  }

  function toggleMessageReaction(payload: { messageId: string; emoji: string }) {
    if (!socket?.connected || !currentUserId.value) return
    messageActionError.value = ''
    socket.emit(
      'toggle_message_reaction',
      {
        messageId: payload.messageId,
        userId: String(currentUserId.value),
        emoji: payload.emoji,
      },
      (response: { success: boolean; message?: string }) => {
        if (!response?.success) {
          messageActionError.value = response?.message ?? 'Could not update reaction'
        }
      },
    )
  }

  function sendMessage(content: string) {
    if (!activeId.value || !content.trim()) return
    const normalizedContent = content.trim()
    const tempMessage = createTempMessage(normalizedContent)
    if (tempMessage) {
      messages.value.push(tempMessage)
      const conv = conversations.value.find((c) => c.id.toString() === activeId.value)
      if (conv) conv.lastMessage = tempMessage
    }

    socket?.emit('send_message', {
      conversationId: activeId.value,
      senderId: currentUserId.value.toString(),
      content: normalizedContent,
      replyToMessageId: replyingTo.value?.id ?? null,
      clientTempId: tempMessage?.client_temp_id ?? null,
    })
    replyingTo.value = null
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
    conversations,
    activeId,
    activeConversation,
    messages,
    isLoadingMsgs,
    isLoadingOlderMsgs,
    hasMoreMessages,
    isTyping,
    typingText,
    replyingTo,
    onlineUserIds,
    memberActionError,
    messageActionError,
    settingsActionError,
    connect,
    disconnect,
    fetchConversations,
    loadOlderMessages,
    refreshActiveConversationMembers,
    openConversation,
    startPrivateChat,
    createGroup,
    inviteMember,
    removeMember,
    deleteMessage,
    setReplyingTo,
    clearReplyingTo,
    toggleMessageReaction,
    updateConversationSettings,
    sendMessage,
    startTyping,
    isUserOnline,
  }
})
