<template>
  <aside class="thread-list">
    <!-- Header -->
    <div class="tl-header">
      <h2 class="tl-title">Tin nhắn</h2>
      <div class="tl-actions">
        <button class="pill-btn" @click="$emit('new-chat')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button class="pill-btn" @click="$emit('new-group')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Nhóm
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="tl-search">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input v-model="query" class="tl-search-input" placeholder="Tìm kiếm..." />
    </div>

    <!-- List -->
    <div class="tl-items">
      <div v-if="filtered.length === 0" class="tl-empty">
        <p>Chưa có hội thoại nào</p>
        <button class="tl-link" @click="$emit('new-chat')">Bắt đầu chat mới →</button>
      </div>

      <button
        v-for="conv in filtered"
        :key="conv.id"
        class="tl-item"
        :class="{ 'tl-item--active': activeId === conv.id.toString() }"
        @click="$emit('select', conv)"
      >
        <div class="tl-avatar" :class="conv.type === 'group' ? 'tl-avatar--group' : ''">
          {{ initial(conv) }}
        </div>
        <div class="tl-info">
          <div class="tl-row">
            <span class="tl-name">{{ label(conv) }}</span>
            <span class="tl-time">{{ fmtTime(conv.lastMessage?.created_at) }}</span>
          </div>
          <div class="tl-row">
            <span class="tl-preview">{{ conv.lastMessage?.content || 'Chưa có tin nhắn' }}</span>
            <span v-if="conv.unreadCount" class="tl-badge">
              {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Conversation } from '../store/chat.store'

const props = defineProps<{
  conversations: Conversation[]
  activeId: string | null
  currentUserId: number
}>()

defineEmits<{
  select:    [conv: Conversation]
  'new-chat':   []
  'new-group':  []
}>()

const query = ref('')

const filtered = computed(() => {
  if (!query.value) return props.conversations
  const q = query.value.toLowerCase()
  return props.conversations.filter(c => label(c).toLowerCase().includes(q))
})

function label(conv: Conversation): string {
  if (conv.name) return conv.name
  const other = conv.members.find((m) => Number(m.user_id) !== Number(props.currentUserId))
  return other?.name || `Hội thoại #${conv.id}`
}

function initial(conv: Conversation) { return label(conv)?.[0]?.toUpperCase() || '?' }

function fmtTime(date?: string | null): string {
  if (!date) return ''
  const d   = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
</script>

<style scoped>
.thread-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #efefef;
}

.tl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 12px;
  border-bottom: 1px solid #efefef;
  flex-shrink: 0;
}

.tl-title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.tl-actions { display: flex; gap: 5px; }

.pill-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 99px;
  border: 1.5px solid #efefef;
  background: transparent; color: #8a8fa8;
  font-size: 0.72rem; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: all .14s;
}

.pill-btn:hover { border-color: #d65287; color: #d65287; background: rgba(214,82,135,.09); }

.tl-search {
  display: flex; align-items: center; gap: 7px;
  margin: 10px 12px 6px;
  padding: 7px 11px;
  background: #fafafa; border: 1px solid #efefef; border-radius: 9px;
  color: #8a8fa8; flex-shrink: 0;
}

.tl-search-input {
  border: none; background: none; outline: none;
  font-size: 0.82rem; color: #1a1a2e;
  width: 100%; font-family: inherit;
}
.tl-search-input::placeholder { color: #8a8fa8; }

.tl-items { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
.tl-items::-webkit-scrollbar { width: 3px; }
.tl-items::-webkit-scrollbar-thumb { background: #efefef; border-radius: 3px; }

.tl-empty {
  text-align: center; padding: 36px 12px;
  color: #8a8fa8; font-size: 0.82rem;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
}

.tl-link { background: none; border: none; color: #d65287; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; }

.tl-item {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 8px 9px;
  border-radius: 10px; border: none; background: transparent;
  cursor: pointer; text-align: left;
  transition: background .13s; margin-bottom: 1px;
  font-family: inherit;
}

.tl-item:hover { background: #fafafa; }
.tl-item--active { background: rgba(214,82,135,.1); }
.tl-item--active .tl-name { color: #d65287; }

.tl-avatar {
  width: 40px; height: 40px; min-width: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #f7a8c5, #d65287);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.88rem; color: #fff; flex-shrink: 0;
}

.tl-avatar--group { background: linear-gradient(135deg, #fde68a, #f59e0b); }

.tl-info { flex: 1; min-width: 0; }
.tl-row { display: flex; justify-content: space-between; align-items: center; gap: 4px; }

.tl-name {
  font-size: 0.85rem; font-weight: 600; color: #1a1a2e;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.tl-time { font-size: 0.67rem; color: #8a8fa8; flex-shrink: 0; }

.tl-preview {
  font-size: 0.76rem; color: #8a8fa8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
}

.tl-badge {
  background: #d65287; color: #fff;
  font-size: 0.62rem; font-weight: 700;
  padding: 1px 5px; border-radius: 99px; flex-shrink: 0;
}
</style>
