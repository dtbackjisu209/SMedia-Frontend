<template>
  <section class="chat-window" @click="closeMenu">
    <div v-if="!conversation" class="cw-empty">
      <div class="cw-empty-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <p class="cw-empty-title">Chon cuoc tro chuyen</p>
      <p class="cw-empty-sub">hoac bat dau mot cuoc chat moi</p>
      <div class="cw-empty-btns">
        <button class="btn btn--primary" @click="$emit('new-chat')">Chat 1-1</button>
        <button class="btn btn--ghost" @click="$emit('new-group')">Tao nhom</button>
      </div>
    </div>

    <template v-else>
      <div class="cw-header">
        <div class="cw-header-left">
          <div class="cw-avatar" :class="conversation.type === 'group' ? 'cw-avatar--group' : ''">
            {{ initial }}
          </div>
          <div>
            <p class="cw-name">{{ convName }}</p>
            <p v-if="conversation.type === 'group'" class="cw-sub">{{ conversation.members.length }} thanh vien</p>
            <p v-else class="cw-sub" :class="props.isOtherOnline ? 'cw-sub--online' : 'cw-sub--offline'">
              {{ props.isOtherOnline ? 'Online' : 'Offline' }}
            </p>
          </div>
        </div>
        <div class="cw-header-actions">
          <button class="icon-btn" @click="$emit('open-settings')" title="Cai dat chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.13.32.2.66.2 1s-.07.68-.2 1a1.65 1.65 0 0 0 .33 1.82" />
            </svg>
          </button>
          <button v-if="conversation.type === 'group'" class="icon-btn" @click="$emit('show-members')" title="Thanh vien">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
          <button v-if="conversation.type === 'group'" class="icon-btn" @click="$emit('manage-members')" title="Quan ly thanh vien">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <div class="cw-messages" ref="msgEl">
        <div v-if="isLoading" class="cw-loading">
          <div class="spinner"></div>
        </div>
        <template v-else>
          <p v-if="messages.length === 0" class="cw-no-msgs">Hay gui tin nhan dau tien!</p>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg"
            :class="[msg.isOwn ? 'msg--own' : 'msg--other', { 'msg--with-reactions': Boolean(msg.reactions?.length) }]"
          >
            <div v-if="!msg.isOwn" class="msg-av">{{ msg.sender_name?.[0]?.toUpperCase() }}</div>
            <div class="msg-body">
              <span v-if="!msg.isOwn && conversation.type === 'group'" class="msg-sender">
                {{ msg.sender_name }}
              </span>
              <div class="msg-bubble-wrap">
                <div class="msg-bubble" :class="{ 'msg-bubble--recalled': msg.is_recalled }">
                  <div v-if="msg.reply_to" class="msg-reply-preview">
                    <span class="msg-reply-author">{{ msg.reply_to.sender_name }}</span>
                    <p class="msg-reply-text">{{ msg.reply_to.content }}</p>
                  </div>
                  <p class="msg-text" :class="{ 'msg-text--recalled': msg.is_recalled }">{{ msg.content }}</p>
                  <span class="msg-time">{{ fmtTime(msg.created_at) }}</span>
                </div>

                <div v-if="msg.reactions?.length" class="msg-reactions">
                  <button
                    v-for="reaction in msg.reactions"
                    :key="`${msg.id}-${reaction.emoji}`"
                    class="msg-reaction-pill"
                    :class="{ 'msg-reaction-pill--active': reaction.user_ids.includes(String(currentUserId)) }"
                    type="button"
                    @click.stop="handleReaction(msg.id, reaction.emoji)"
                  >
                    <span>{{ reaction.emoji }}</span>
                    <span>{{ reaction.count }}</span>
                  </button>
                </div>

                <div class="msg-quick-actions">
                  <button class="msg-quick-btn" type="button" title="Tha tim" @click.stop="handleReaction(msg.id, '❤️')">❤️</button>
                  <button class="msg-quick-btn" type="button" title="Tra loi" @click.stop="handleReply(msg.id)">↩</button>
                </div>

                <button
                  v-if="msg.isOwn && !msg.is_recalled"
                  class="msg-more-btn"
                  type="button"
                  :aria-expanded="openMenuId === msg.id"
                  aria-label="Mo thao tac tin nhan"
                  @click.stop="toggleMenu(msg.id)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                <div
                  v-if="openMenuId === msg.id"
                  class="msg-menu"
                  :class="[
                    { 'msg-menu--own': msg.isOwn },
                    menuPlacementById[msg.id] === 'below' ? 'msg-menu--below' : 'msg-menu--above',
                  ]"
                  @click.stop
                  :ref="(el) => setMenuRef(msg.id, el)"
                >
                  <div class="msg-menu-time">{{ fmtMenuTime(msg.created_at) }}</div>
                  <button class="msg-menu-item" type="button" @click="handleDelete(msg.id, 'self')">
                    <span>Xoa ben ban</span>
                    <span class="msg-menu-icon">🗑</span>
                  </button>
                  <button class="msg-menu-item msg-menu-item--danger" type="button" @click="handleDelete(msg.id, 'everyone')">
                    <span>Thu hoi</span>
                    <span class="msg-menu-icon">↩</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isTyping" class="typing-row">
            <div class="typing-dots"><span/><span/><span/></div>
            <p class="typing-label">{{ typingText }}</p>
          </div>
        </template>
      </div>

      <div class="cw-input-bar">
        <p v-if="memberActionError" class="cw-error">{{ memberActionError }}</p>
        <p v-if="messageActionError" class="cw-error">{{ messageActionError }}</p>
        <div v-if="replyingTo" class="cw-replying">
          <div class="cw-replying-copy">
            <span class="cw-replying-label">Dang tra loi {{ replyingTo.sender_name }}</span>
            <p class="cw-replying-text">{{ replyingTo.content }}</p>
          </div>
          <button class="cw-replying-close" type="button" @click="$emit('cancel-reply')">×</button>
        </div>
        <textarea
          v-model="draft"
          class="cw-textarea"
          placeholder="Nhap tin nhan..."
          rows="1"
          @keydown.enter.exact.prevent="send"
          @input="onTyping"
        />
        <button class="cw-send" :disabled="!draft.trim()" @click="send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Conversation, Message, MessageReply } from '../store/chat.store'

const props = defineProps<{
  conversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  typingText: string
  currentUserId: number
  isOtherOnline: boolean
  memberActionError?: string
  messageActionError?: string
  replyingTo?: MessageReply | null
}>()

const emit = defineEmits<{
  send: [content: string]
  typing: []
  'new-chat': []
  'new-group': []
  'show-members': []
  'manage-members': []
  'open-settings': []
  'delete-message': [payload: { messageId: string; mode: 'self' | 'everyone' }]
  'reply-message': [payload: { messageId: string }]
  'react-message': [payload: { messageId: string; emoji: string }]
  'cancel-reply': []
}>()

const draft = ref('')
const msgEl = ref<HTMLElement | null>(null)
const openMenuId = ref<string | null>(null)
const menuPlacementById = ref<Record<string, 'above' | 'below'>>({})
const menuRefs = new Map<string, HTMLElement>()

const convName = computed(() => {
  if (!props.conversation) return ''
  if (props.conversation.nickname) return props.conversation.nickname
  if (props.conversation.type === 'group') {
    return props.conversation.name || `Group chat #${props.conversation.id}`
  }
  if (props.conversation.name) return props.conversation.name
  const other = props.conversation.members.find((m) => Number(m.user_id) !== Number(props.currentUserId))
  return other?.name || `Chat #${props.conversation.id}`
})

const initial = computed(() => convName.value?.[0]?.toUpperCase() || '?')

watch(
  () => props.messages,
  () => {
    nextTick(() => {
      if (msgEl.value) msgEl.value.scrollTop = msgEl.value.scrollHeight
    })
  },
  { deep: true },
)

function send() {
  if (!draft.value.trim()) return
  emit('send', draft.value)
  draft.value = ''
}

function onTyping() {
  emit('typing')
}

function toggleMenu(messageId: string) {
  if (openMenuId.value === messageId) {
    openMenuId.value = null
    return
  }

  openMenuId.value = messageId
  menuPlacementById.value = {
    ...menuPlacementById.value,
    [messageId]: 'above',
  }
  nextTick(() => updateMenuPlacement(messageId))
}

function closeMenu() {
  openMenuId.value = null
}

function setMenuRef(messageId: string, el: unknown) {
  if (!(el instanceof HTMLElement)) {
    menuRefs.delete(messageId)
    return
  }

  menuRefs.set(messageId, el)
}

function updateMenuPlacement(messageId: string) {
  const menuEl = menuRefs.get(messageId)
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const estimatedHeight = rect.height || 170
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom

  menuPlacementById.value = {
    ...menuPlacementById.value,
    [messageId]: spaceAbove >= estimatedHeight || spaceAbove > spaceBelow ? 'above' : 'below',
  }
}

function handleDelete(messageId: string, mode: 'self' | 'everyone') {
  emit('delete-message', { messageId, mode })
  closeMenu()
}

function handleReply(messageId: string) {
  emit('reply-message', { messageId })
  closeMenu()
}

function handleReaction(messageId: string, emoji: string) {
  emit('react-message', { messageId, emoji })
}

function fmtTime(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hom qua'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function fmtMenuTime(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fafafa;
}

.cw-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8a8fa8;
}

.cw-empty-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: rgba(214, 82, 135, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d65287;
  margin-bottom: 4px;
}

.cw-empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.cw-empty-sub {
  font-size: 0.82rem;
  margin: 0;
}

.cw-empty-btns {
  display: flex;
  gap: 9px;
  margin-top: 8px;
}

.cw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #efefef;
  flex-shrink: 0;
}

.cw-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cw-header-actions {
  display: flex;
  gap: 8px;
}

.cw-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7a8c5, #d65287);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.82rem;
  color: #fff;
}

.cw-avatar--group {
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}

.cw-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.cw-sub {
  font-size: 0.73rem;
  color: #8a8fa8;
  margin: 0;
}

.cw-sub--online {
  color: #22c55e;
}

.cw-sub--offline {
  color: #94a3b8;
}

.cw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cw-messages::-webkit-scrollbar {
  width: 3px;
}

.cw-messages::-webkit-scrollbar-thumb {
  background: #efefef;
  border-radius: 3px;
}

.cw-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cw-no-msgs {
  text-align: center;
  color: #8a8fa8;
  font-size: 0.85rem;
  margin: auto;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid #efefef;
  border-top-color: #d65287;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.msg {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin-bottom: 1px;
}

.msg--own {
  flex-direction: row-reverse;
}

.msg-av {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7a8c5, #d65287);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #fff;
}

.msg-body {
  display: flex;
  flex-direction: column;
  max-width: 66%;
}

.msg--own .msg-body {
  align-items: flex-end;
}

.msg-sender {
  font-size: 0.68rem;
  color: #8a8fa8;
  font-weight: 600;
  margin-bottom: 2px;
  margin-left: 4px;
}

.msg-bubble-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg--own .msg-bubble-wrap {
  flex-direction: row-reverse;
}

.msg-bubble {
  padding: 8px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #efefef;
}

.msg-reply-preview {
  margin-bottom: 7px;
  padding: 7px 9px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.06);
}

.msg--own .msg-reply-preview {
  background: rgba(255, 255, 255, 0.18);
}

.msg-reply-author {
  display: block;
  margin-bottom: 2px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #d65287;
}

.msg--own .msg-reply-author {
  color: #fff;
}

.msg-reply-text {
  margin: 0;
  font-size: 0.74rem;
  color: #667085;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg--own .msg-reply-text {
  color: rgba(255, 255, 255, 0.8);
}

.msg-bubble--recalled {
  background: #f6f7f9;
}

.msg--other .msg-bubble {
  border-bottom-left-radius: 3px;
}

.msg--own .msg-bubble {
  border-bottom-right-radius: 3px;
  background: linear-gradient(135deg, #d65287, #e8799f);
  border-color: transparent;
}

.msg--own .msg-bubble--recalled {
  background: #f6f7f9;
  border-color: #efefef;
}

.msg-text {
  font-size: 0.865rem;
  line-height: 1.5;
  word-break: break-word;
  margin: 0;
  color: #1a1a2e;
}

.msg--own .msg-text {
  color: #fff;
}

.msg-text--recalled {
  color: #8a8fa8 !important;
  font-style: italic;
}

.msg-time {
  font-size: 0.62rem;
  color: #8a8fa8;
  display: block;
  margin-top: 3px;
  text-align: right;
}

.msg--own .msg-time {
  color: rgba(255, 255, 255, 0.6);
}

.msg--own .msg-bubble--recalled .msg-time {
  color: #8a8fa8;
}

.msg-more-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.1);
  color: #667085;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease, transform 0.14s ease, background 0.14s ease, color 0.14s ease;
  transform: translateY(2px);
}

.msg:hover .msg-more-btn,
.msg:focus-within .msg-more-btn,
.msg-more-btn[aria-expanded='true'] {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.msg-more-btn:hover {
  background: rgba(15, 23, 42, 0.18);
  color: #344054;
}

.msg-quick-actions {
  position: absolute;
  top: 50%;
  right: calc(100% + 10px);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease, transform 0.14s ease;
  transform: translateY(-50%);
  z-index: 4;
}

.msg--other .msg-quick-actions {
  right: auto;
  left: calc(100% + 10px);
}

.msg:hover .msg-quick-actions,
.msg:focus-within .msg-quick-actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%);
}

.msg-quick-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #344054;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

.msg-reactions {
  position: absolute;
  bottom: -14px;
  left: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.msg--own .msg-reactions {
  left: auto;
  right: 10px;
}

.msg--with-reactions {
  margin-bottom: 18px;
}

.msg-reaction-pill {
  border: 1px solid #efefef;
  background: #fff;
  border-radius: 999px;
  padding: 3px 7px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.msg-reaction-pill--active {
  border-color: rgba(214, 82, 135, 0.45);
  background: #fff1f6;
}

.msg-menu {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  min-width: 220px;
  background: rgba(41, 41, 41, 0.96);
  color: #fff;
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.38);
  overflow: hidden;
  z-index: 20;
}

.msg-menu--own {
  left: auto;
  right: 0;
}

.msg-menu--below {
  top: calc(100% + 12px);
  bottom: auto;
}

.msg-menu::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 28px;
  border-width: 10px 10px 0 10px;
  border-style: solid;
  border-color: rgba(41, 41, 41, 0.96) transparent transparent transparent;
}

.msg-menu--own::after {
  left: auto;
  right: 28px;
}

.msg-menu--below::after {
  top: -10px;
  bottom: auto;
  border-width: 0 10px 10px 10px;
  border-color: transparent transparent rgba(41, 41, 41, 0.96) transparent;
}

.msg-menu-time {
  padding: 16px 20px 12px;
  font-size: 0.92rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.msg-menu-item {
  width: 100%;
  border: none;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 0.98rem;
  padding: 14px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.msg-menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.msg-menu-item--danger {
  color: #ff5b69;
}

.msg-menu-icon {
  font-size: 1rem;
  opacity: 0.85;
}

.typing-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #efefef;
  border-radius: 14px;
  border-bottom-left-radius: 3px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #d65287;
  animation: bounce 1.1s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.18s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }

  30% {
    transform: translateY(-5px);
  }
}

.typing-label {
  font-size: 0.7rem;
  color: #8a8fa8;
  font-style: italic;
}

.cw-input-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  padding: 11px 14px;
  background: #fff;
  border-top: 1px solid #efefef;
  flex-shrink: 0;
}

.cw-error {
  width: 100%;
  margin: 0;
  color: #dc2626;
  font-size: 0.75rem;
}

.cw-replying {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff4f8;
  border: 1px solid rgba(214, 82, 135, 0.18);
}

.cw-replying-copy {
  min-width: 0;
}

.cw-replying-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: #d65287;
  margin-bottom: 2px;
}

.cw-replying-text {
  margin: 0;
  font-size: 0.79rem;
  color: #667085;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cw-replying-close {
  border: none;
  background: transparent;
  color: #8a8fa8;
  font-size: 1rem;
  cursor: pointer;
}

.cw-textarea {
  flex: 1;
  padding: 9px 13px;
  background: #fafafa;
  border: 1.5px solid #efefef;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.865rem;
  color: #1a1a2e;
  outline: none;
  resize: none;
  max-height: 110px;
  line-height: 1.5;
  transition: border-color 0.16s;
}

.cw-textarea:focus {
  border-color: #d65287;
}

.cw-textarea::placeholder {
  color: #8a8fa8;
}

.cw-send {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  background: linear-gradient(135deg, #d65287, #e8799f);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s, opacity 0.1s;
  box-shadow: 0 3px 12px rgba(214, 82, 135, 0.32);
}

.cw-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.cw-send:not(:disabled):hover {
  transform: scale(1.06);
}

.cw-send:not(:disabled):active {
  transform: scale(0.93);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #8a8fa8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.13s, color 0.13s;
}

.icon-btn:hover {
  background: rgba(214, 82, 135, 0.1);
  color: #d65287;
}

.btn {
  padding: 8px 18px;
  border-radius: 9px;
  border: none;
  font-family: inherit;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.13s, transform 0.1s;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn:active:not(:disabled) {
  transform: scale(0.96);
}

.btn--primary {
  background: linear-gradient(135deg, #d65287, #e8799f);
  color: #fff;
  box-shadow: 0 3px 12px rgba(214, 82, 135, 0.25);
}

.btn--primary:hover:not(:disabled) {
  opacity: 0.88;
}

.btn--ghost {
  background: transparent;
  color: #8a8fa8;
  border: 1.5px solid #efefef;
}

.btn--ghost:hover {
  border-color: #d65287;
  color: #d65287;
}
</style>
