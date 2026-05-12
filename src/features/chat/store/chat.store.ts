import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { chatApi } from '../api/chat.api'
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

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
  created_at: string
  isOwn?: boolean
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
    return {
      ...message,
      id: String(message.id),
      sender_id: senderId,
      conversation_id: String(message.conversation_id),
      isOwn: senderId === String(currentUserId.value),
      is_recalled: Boolean(message.is_recalled),
      reply_to: normalizeReply(message.reply_to),
      reactions: normalizeReactions(message.reactions),
    }
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
        messages.value.push(msg)
      }
      const conv = conversations.value.find((c) => c.id.toString() === msg.conversation_id)
      if (conv) {
        conv.lastMessage = msg
        if (msg.conversation_id !== activeId.value) conv.unreadCount++
      }
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
        unreadCount: 0,
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
    try {
      await notificationsStore.markConversationMessagesRead(conversationId)
      const data: Message[] = await chatApi.getMessages(conversationId, currentUserId.value)
      messages.value = data.map((m) => normalizeMessage(m))
      replyingTo.value = null
      await refreshActiveConversationMembers()
      const conv = conversations.value.find((c) => c.id.toString() === conversationId)
      if (conv) conv.unreadCount = 0
    } catch (e) {
      console.error('[chat store] openConversation', e)
    } finally {
      isLoadingMsgs.value = false
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
    socket?.emit('send_message', {
      conversationId: activeId.value,
      senderId: currentUserId.value.toString(),
      content,
      replyToMessageId: replyingTo.value?.id ?? null,
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
