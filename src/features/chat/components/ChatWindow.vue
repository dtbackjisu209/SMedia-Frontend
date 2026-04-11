<template>
  <section class="chat-window">
    <div v-if="!conversation" class="cw-empty">
      <div class="cw-empty-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <p class="cw-empty-title">Chọn cuộc trò chuyện</p>
      <p class="cw-empty-sub">hoặc bắt đầu một cuộc chat mới</p>
      <div class="cw-empty-btns">
        <button class="btn btn--primary" @click="$emit('new-chat')">Chat 1-1</button>
        <button class="btn btn--ghost" @click="$emit('new-group')">Tạo nhóm</button>
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
            <p v-if="conversation.type === 'group'" class="cw-sub">{{ conversation.members.length }} thành viên</p>
            <p v-else class="cw-sub" :class="props.isOtherOnline ? 'cw-sub--online' : 'cw-sub--offline'">
              {{ props.isOtherOnline ? '● Đang hoạt động' : '● Ngoại tuyến' }}
            </p>
          </div>
        </div>
        <button v-if="conversation.type === 'group'" class="icon-btn" @click="$emit('show-members')" title="Thành viên">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </button>
      </div>

      <div class="cw-messages" ref="msgEl">
        <div v-if="isLoading" class="cw-loading">
          <div class="spinner"></div>
        </div>
        <template v-else>
          <p v-if="messages.length === 0" class="cw-no-msgs">Hãy gửi tin nhắn đầu tiên!</p>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg"
            :class="msg.isOwn ? 'msg--own' : 'msg--other'"
          >
            <div v-if="!msg.isOwn" class="msg-av">{{ msg.sender_name?.[0]?.toUpperCase() }}</div>
            <div class="msg-body">
              <span v-if="!msg.isOwn && conversation.type === 'group'" class="msg-sender">
                {{ msg.sender_name }}
              </span>
              <div class="msg-bubble">
                <p class="msg-text">{{ msg.content }}</p>
                <span class="msg-time">{{ fmtTime(msg.created_at) }}</span>
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
        <textarea
          v-model="draft"
          class="cw-textarea"
          placeholder="Nhập tin nhắn..."
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
import type { Conversation, Message } from '../store/chat.store'

const props = defineProps<{
  conversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isTyping: boolean
  typingText: string
  currentUserId: number
  isOtherOnline: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  typing: []
  'new-chat': []
  'new-group': []
  'show-members': []
}>()

const draft = ref('')
const msgEl = ref<HTMLElement | null>(null)

const convName = computed(() => {
  if (!props.conversation) return ''
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

function fmtTime(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
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

.msg-bubble {
  padding: 8px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #efefef;
}

.msg--other .msg-bubble {
  border-bottom-left-radius: 3px;
}

.msg--own .msg-bubble {
  border-bottom-right-radius: 3px;
  background: linear-gradient(135deg, #d65287, #e8799f);
  border-color: transparent;
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
  gap: 9px;
  padding: 11px 14px;
  background: #fff;
  border-top: 1px solid #efefef;
  flex-shrink: 0;
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
