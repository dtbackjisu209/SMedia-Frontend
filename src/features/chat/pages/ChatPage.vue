<template>
  <div class="chat-page card">
    <ChatThreadList
      :conversations="store.conversations"
      :active-id="store.activeId"
      :current-user-id="ME.id"
      @select="onSelect"
      @new-chat="showNewChat = true"
      @new-group="showNewGroup = true"
    />

    <ChatWindow
      :conversation="store.activeConversation"
      :messages="store.messages"
      :is-loading="store.isLoadingMsgs"
      :is-typing="store.isTyping"
      :typing-text="store.typingText"
      :current-user-id="ME.id"
      :is-other-online="isActivePeerOnline"
      @send="store.sendMessage"
      @typing="store.startTyping"
      @new-chat="showNewChat = true"
      @new-group="showNewGroup = true"
      @show-members="showMembers = true"
    />

    <Transition name="modal">
      <div v-if="showNewChat" class="overlay" @click.self="closePrivateChatModal">
        <div class="modal card">
          <div class="modal-hd">
            <h3 class="modal-title">Chat 1-1</h3>
            <button class="x-btn" @click="closePrivateChatModal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-bd">
            <label class="field-lbl">Search by username or full name</label>
            <input
              v-model="privateKeyword"
              type="text"
              class="field-inp"
              placeholder="Type at least 2 characters..."
              autocomplete="off"
            />

            <p v-if="privateSearchLoading" class="helper-text">Searching...</p>
            <p v-else-if="privateSearchError" class="helper-text error-text">{{ privateSearchError }}</p>
            <p v-else-if="privateKeyword.trim().length >= 2 && privateSearchResults.length === 0" class="helper-text">
              No users found.
            </p>

            <div v-if="privateSearchResults.length > 0" class="user-results">
              <button
                v-for="u in privateSearchResults"
                :key="u.id"
                class="user-result"
                type="button"
                @click="startPrivateChatWithUser(u.id)"
              >
                <span class="user-avatar">{{ u.username?.[0]?.toUpperCase() }}</span>
                <span class="user-meta">
                  <strong>@{{ u.username }}</strong>
                  <small>{{ u.full_name || 'No full name' }}</small>
                </span>
              </button>
            </div>
          </div>
          <div class="modal-ft">
            <button class="btn btn--ghost" @click="closePrivateChatModal">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="showNewGroup" class="overlay" @click.self="showNewGroup = false">
        <div class="modal card">
          <div class="modal-hd">
            <h3 class="modal-title">Create group chat</h3>
            <button class="x-btn" @click="showNewGroup = false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-bd">
            <label class="field-lbl">Group name</label>
            <input v-model="groupName" type="text" class="field-inp" placeholder="Example: Team Dev" />

            <label class="field-lbl" style="margin-top:13px">Add members</label>
            <input v-model="groupQuery" type="text" class="field-inp" placeholder="Search followers or recent chats..." />

            <p v-if="groupLoading" class="helper-text">Loading members...</p>
            <p v-else-if="groupError" class="helper-text error-text">{{ groupError }}</p>
            <p v-else-if="filteredGroupCandidates.length === 0" class="helper-text">No candidates found.</p>

            <div v-if="filteredGroupCandidates.length > 0" class="user-results">
              <button
                v-for="u in filteredGroupCandidates"
                :key="u.id"
                class="user-result"
                type="button"
                @click="toggleGroupMember(u.id)"
              >
                <span class="user-avatar">{{ u.username?.[0]?.toUpperCase() }}</span>
                <span class="user-meta">
                  <strong>@{{ u.username }}</strong>
                  <small>{{ u.full_name || 'No full name' }}</small>
                </span>
                <span class="pick-pill" :class="{ 'pick-pill--active': selectedGroupMembers.has(u.id) }">
                  {{ selectedGroupMembers.has(u.id) ? 'Added' : 'Add' }}
                </span>
              </button>
            </div>
          </div>
          <div class="modal-ft">
            <button class="btn btn--ghost" @click="showNewGroup = false">Cancel</button>
            <button
              class="btn btn--primary"
              :disabled="!groupName || selectedGroupMembers.size === 0"
              @click="doCreateGroup"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="showMembers" class="overlay" @click.self="showMembers = false">
        <div class="modal card">
          <div class="modal-hd">
            <h3 class="modal-title">Group members</h3>
            <button class="x-btn" @click="showMembers = false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-bd">
            <div v-for="m in store.activeConversation?.members" :key="m.user_id" class="member-row">
              <div class="m-av">{{ m.name?.[0]?.toUpperCase() }}</div>
              <span class="m-name">{{ m.name }}</span>
            </div>
          </div>
          <div class="modal-ft">
            <button class="btn btn--primary" @click="showMembers = false">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useChatStore, type Conversation } from '../store/chat.store'
import ChatThreadList from '../components/ChatThreadList.vue'
import ChatWindow from '../components/ChatWindow.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { chatApi, type ChatSearchUser, type ChatGroupCandidate } from '../api/chat.api'

const auth = useAuthStore()
const store = useChatStore()

const ME = computed(() => ({
  id: Number(auth.userId),
  name: auth.user?.fullName || auth.user?.username || 'User',
}))

const activePeerUserId = computed<number | null>(() => {
  const conv = store.activeConversation
  if (!conv || conv.type === 'group') return null
  const other = conv.members.find((m) => Number(m.user_id) !== ME.value.id)
  return other ? Number(other.user_id) : null
})

const isActivePeerOnline = computed(() => {
  if (!activePeerUserId.value) return false
  return store.isUserOnline(activePeerUserId.value)
})

watch(
  () => auth.userId,
  async (id) => {
    if (!id) return
    store.connect(Number(id), ME.value.name)
    await store.fetchConversations()
  },
  { immediate: true },
)

watch(() => auth.isAuthenticated, (isAuth) => {
  if (!isAuth) store.disconnect()
})

const showNewChat = ref(false)
const showNewGroup = ref(false)
const showMembers = ref(false)
const groupName = ref('')
const groupCandidates = ref<ChatGroupCandidate[]>([])
const groupQuery = ref('')
const selectedGroupMembers = ref<Set<number>>(new Set())
const groupLoading = ref(false)
const groupError = ref('')

function mergeCandidates(base: ChatGroupCandidate[], extra: ChatGroupCandidate[]) {
  const map = new Map<number, ChatGroupCandidate>()
  base.forEach((u) => map.set(u.id, u))
  extra.forEach((u) => map.set(u.id, u))
  return Array.from(map.values())
}

const privateKeyword = ref('')
const privateSearchResults = ref<ChatSearchUser[]>([])
const privateSearchLoading = ref(false)
const privateSearchError = ref('')
let privateSearchTimer: ReturnType<typeof setTimeout> | null = null

watch(privateKeyword, (value) => {
  if (privateSearchTimer) clearTimeout(privateSearchTimer)

  const keyword = value.trim()
  privateSearchError.value = ''

  if (keyword.length < 2) {
    privateSearchResults.value = []
    privateSearchLoading.value = false
    return
  }

  privateSearchTimer = setTimeout(async () => {
    privateSearchLoading.value = true
    try {
      privateSearchResults.value = await chatApi.searchUsers(keyword, ME.value.id)
    } catch (error) {
      privateSearchResults.value = []
      privateSearchError.value = error instanceof Error ? error.message : 'Search failed'
    } finally {
      privateSearchLoading.value = false
    }
  }, 250)
})

onUnmounted(() => {
  store.disconnect()
  if (privateSearchTimer) clearTimeout(privateSearchTimer)
})

function onSelect(conv: Conversation) {
  store.openConversation(conv.id.toString())
}

function startPrivateChatWithUser(targetUserId: number) {
  store.startPrivateChat(targetUserId)
  closePrivateChatModal()
}

function closePrivateChatModal() {
  showNewChat.value = false
  privateKeyword.value = ''
  privateSearchResults.value = []
  privateSearchError.value = ''
  privateSearchLoading.value = false
}

function doCreateGroup() {
  const ids = Array.from(selectedGroupMembers.value)
  if (ids.length === 0) return
  store.createGroup(groupName.value, ids)
  showNewGroup.value = false
  groupName.value = ''
  groupCandidates.value = []
  groupQuery.value = ''
  selectedGroupMembers.value = new Set()
  groupError.value = ''
  groupLoading.value = false
}

watch(showNewGroup, async (isOpen) => {
  if (!isOpen) {
    groupCandidates.value = []
    groupQuery.value = ''
    selectedGroupMembers.value = new Set()
    groupError.value = ''
    groupLoading.value = false
    return
  }

  const localCandidates = store.conversations
    .flatMap((c) => c.members || [])
    .filter((m) => Number(m.user_id) !== ME.value.id)
    .map((m) => ({
      id: Number(m.user_id),
      username: String(m.name || `user_${m.user_id}`),
      full_name: m.name || null,
      avatar_url: m.avatar || null,
    }))

  groupCandidates.value = mergeCandidates(localCandidates, [])

  groupLoading.value = true
  groupError.value = ''
  try {
    const remote = await chatApi.getGroupCandidates(ME.value.id)
    groupCandidates.value = mergeCandidates(groupCandidates.value, remote)
  } catch (error) {
    groupCandidates.value = mergeCandidates(groupCandidates.value, [])
    groupError.value = error instanceof Error ? error.message : 'Failed to load candidates'
  } finally {
    groupLoading.value = false
  }
})

const filteredGroupCandidates = computed(() => {
  if (!groupQuery.value.trim()) return groupCandidates.value
  const q = groupQuery.value.trim().toLowerCase()
  return groupCandidates.value.filter(
    (u) => u.username.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q),
  )
})

function toggleGroupMember(userId: number) {
  const next = new Set(selectedGroupMembers.value)
  if (next.has(userId)) next.delete(userId)
  else next.add(userId)
  selectedGroupMembers.value = next
}
</script>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: 285px 1fr;
  height: calc(100vh - 116px);
  min-height: 460px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #efefef;
  box-shadow: 0 2px 16px rgba(214, 82, 135, 0.07);
  padding: 0 !important;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 46, 0.34);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  width: 420px;
  max-width: 92vw;
  border-radius: 16px !important;
  overflow: hidden;
  padding: 0 !important;
}

.modal-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px 11px;
  border-bottom: 1px solid #efefef;
}

.modal-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.x-btn {
  width: 30px;
  height: 30px;
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

.x-btn:hover {
  background: rgba(214, 82, 135, 0.1);
  color: #d65287;
}

.modal-bd {
  padding: 16px;
  display: flex;
  flex-direction: column;
  max-height: 55vh;
  overflow-y: auto;
}

.modal-ft {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding: 11px 16px 14px;
  border-top: 1px solid #efefef;
}

.field-lbl {
  font-size: 0.71rem;
  font-weight: 700;
  color: #8a8fa8;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
  display: block;
}

.field-inp {
  padding: 9px 12px;
  background: #fafafa;
  border: 1.5px solid #efefef;
  border-radius: 9px;
  font-family: inherit;
  font-size: 0.865rem;
  color: #1a1a2e;
  outline: none;
  transition: border-color 0.16s;
  width: 100%;
}

.field-inp:focus {
  border-color: #d65287;
}

.helper-text {
  margin: 10px 2px 0;
  font-size: 12px;
  color: #8a8fa8;
}

.error-text {
  color: #dc2626;
}

.user-results {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.user-result {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #efefef;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
}

.user-result:hover {
  border-color: #d65287;
  background: #fff7fa;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7a8c5, #d65287);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.user-meta {
  display: grid;
}

.user-meta strong {
  font-size: 13px;
}

.user-meta small {
  font-size: 12px;
  color: #8a8fa8;
}

.pick-pill {
  margin-left: auto;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #8a8fa8;
  border: 1px solid #efefef;
}

.pick-pill--active {
  color: #d65287;
  border-color: rgba(214, 82, 135, 0.4);
  background: rgba(214, 82, 135, 0.08);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-bottom: 1px solid #efefef;
}

.member-row:last-child {
  border-bottom: none;
}

.m-av {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7a8c5, #d65287);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
}

.m-name {
  font-size: 0.865rem;
  color: #1a1a2e;
  font-weight: 500;
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.16s, transform 0.16s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 700px) {
  .chat-page {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
