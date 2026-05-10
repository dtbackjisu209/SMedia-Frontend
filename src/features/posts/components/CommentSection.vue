<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCommentsStore } from '@/features/posts/store/comments.store'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'
import type { CommentItem } from '@/shared/types/social'
import { resolveAvatar } from '@/shared/constants/avatar'

dayjs.extend(relativeTime)
dayjs.locale('vi')

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  postId: string
  commentCount?: number
}>()

// ─── Stores ───────────────────────────────────────────────────────────────────

const commentsStore = useCommentsStore()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

// ─── Local state ─────────────────────────────────────────────────────────────

const newCommentText = ref('')
const replyingTo = ref<CommentItem | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const listRef = ref<HTMLDivElement | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

const postState = computed(() => commentsStore.getState(props.postId))
const comments = computed(() => postState.value?.comments ?? [])
const nextCursor = computed(() => postState.value?.nextCursor ?? null)
const isLoading = computed(() => postState.value?.isLoading ?? false)
const isLoadingMore = computed(() => postState.value?.isLoadingMore ?? false)
const isSending = computed(() => postState.value?.isSending ?? false)
const errorMessage = computed(() => postState.value?.errorMessage ?? '')
const hasMore = computed(() => nextCursor.value !== null)
const myUserId = computed(() => Number(authStore.userId ?? 0))
const isAuthenticated = computed(() => authStore.isAuthenticated)
const charCount = computed(() => newCommentText.value.length)
const isOverLimit = computed(() => charCount.value > 2000)
const currentUserAvatar = computed(() => authStore.user?.avatarUrl ?? '')
const currentUserInitials = computed(() =>
  getAvatarInitials(authStore.user?.fullName || authStore.user?.username || 'User'),
)

// Top-level comments (no parent)
const topLevelComments = computed(() =>
  comments.value.filter((c) => c.parent_id === null),
)

// Replies indexed by parent_id
const repliesMap = computed(() => {
  const map = new Map<number, CommentItem[]>()
  for (const c of comments.value) {
    if (c.parent_id !== null) {
      const existing = map.get(c.parent_id) ?? []
      map.set(c.parent_id, [...existing, c])
    }
  }
  return map
})

// ─── Init ─────────────────────────────────────────────────────────────────────

let cleanupCommentSocket: (() => void) | null = null

function setupSocket(postId: string) {
  cleanupCommentSocket?.()
  cleanupCommentSocket = null
  notificationsStore.joinPost(postId)
  cleanupCommentSocket = notificationsStore.onNewComment((incoming) => {
    if (String(incoming.post_id) !== postId) return
    commentsStore.appendCommentIfNew(postId, incoming)
  })
}

onMounted(() => {
  // Reset và fetch fresh — tránh hiển thị comment cũ từ lần navigate trước
  commentsStore.resetPostComments(props.postId)
  commentsStore.fetchComments(props.postId)
  setupSocket(props.postId)
})

onUnmounted(() => {
  notificationsStore.leavePost(props.postId)
  cleanupCommentSocket?.()
  cleanupCommentSocket = null
})

// Khi navigate sang post khác (same component instance): reset + fetch lại
watch(
  () => props.postId,
  (newId, oldId) => {
    if (newId === oldId) return
    notificationsStore.leavePost(oldId)
    commentsStore.resetPostComments(newId)
    commentsStore.fetchComments(newId)
    setupSocket(newId)
  },
)


// ─── Actions ──────────────────────────────────────────────────────────────────

function startReply(comment: CommentItem) {
  replyingTo.value = comment
  newCommentText.value = ''
  nextTick(() => inputRef.value?.focus())
}

function cancelReply() {
  replyingTo.value = null
  newCommentText.value = ''
}

async function submitComment() {
  const text = newCommentText.value.trim()
  if (!text || isOverLimit.value || isSending.value) return

  const user = authStore.user
  if (!user) return

  const parentId = replyingTo.value?.id

  try {
    await commentsStore.createComment(props.postId, text, user, parentId)
    newCommentText.value = ''
    replyingTo.value = null

    await nextTick()
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  } catch {
    // Error is exposed via store
  }
}

async function handleDeleteComment(commentId: number) {
  try {
    await commentsStore.deleteComment(props.postId, commentId)
  } catch {
    // Error exposed via store
  }
}

function isOwner(comment: CommentItem): boolean {
  return Boolean(myUserId.value && comment.user_id === myUserId.value)
}

function formatTime(dateStr: string): string {
  return dayjs(dateStr).fromNow()
}

function getAvatarInitials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    submitComment()
  }
}

async function loadMore() {
  await commentsStore.loadMoreComments(props.postId)
}


</script>

<template>
  <section class="comment-section">
    <h3 class="cs-title">
      Comments
      <span v-if="commentCount != null" class="cs-count">{{ commentCount }}</span>
    </h3>

    <!-- Error -->
    <p v-if="errorMessage" class="cs-error">{{ errorMessage }}</p>


    <!-- Loading skeleton -->
    <div v-if="isLoading" class="cs-skeleton-wrap">
      <div v-for="n in 3" :key="n" class="cs-skeleton" />
    </div>

    <!-- Comment list -->
    <div v-else ref="listRef" class="cs-list">
      <div v-if="comments.length === 0" class="cs-empty">
        Chưa có bình luận nào. Hãy là người đầu tiên!
      </div>

      <template v-for="comment in topLevelComments" :key="comment.id">
        <!-- Top-level comment -->
        <article class="cs-item">
          <div class="cs-avatar" :title="comment.full_name">
            <img
              :src="resolveAvatar(comment.avatar_url)"
              :alt="comment.full_name"
              class="cs-avatar-img"
            />
          </div>

          <div class="cs-body">
            <div class="cs-meta">
              <span class="cs-name">{{ comment.full_name || comment.username }}</span>
              <span class="cs-time">{{ formatTime(comment.created_at) }}</span>
            </div>
            <p class="cs-content">{{ comment.content }}</p>
            <div class="cs-actions">
              <button
                v-if="isAuthenticated"
                class="cs-action-btn"
                type="button"
                @click="startReply(comment)"
              >
                Trả lời
              </button>
              <button
                v-if="isOwner(comment)"
                class="cs-action-btn cs-action-btn--danger"
                type="button"
                :disabled="commentsStore.isDeletingComment(comment.id)"
                @click="handleDeleteComment(comment.id)"
              >
                {{ commentsStore.isDeletingComment(comment.id) ? 'Đang xóa…' : 'Xóa' }}
              </button>
            </div>
          </div>
        </article>

        <!-- Replies -->
        <article
          v-for="reply in repliesMap.get(comment.id) ?? []"
          :key="reply.id"
          class="cs-item cs-item--reply"
        >
          <div class="cs-avatar" :title="reply.full_name">
            <img
              :src="resolveAvatar(reply.avatar_url)"
              :alt="reply.full_name"
              class="cs-avatar-img"
            />
          </div>

          <div class="cs-body">
            <div class="cs-meta">
              <span class="cs-name">{{ reply.full_name || reply.username }}</span>
              <span class="cs-time">{{ formatTime(reply.created_at) }}</span>
            </div>
            <p class="cs-content">{{ reply.content }}</p>
            <div class="cs-actions">
              <button
                v-if="isOwner(reply)"
                class="cs-action-btn cs-action-btn--danger"
                type="button"
                :disabled="commentsStore.isDeletingComment(reply.id)"
                @click="handleDeleteComment(reply.id)"
              >
                {{ commentsStore.isDeletingComment(reply.id) ? 'Đang xóa…' : 'Xóa' }}
              </button>
            </div>
          </div>
        </article>
      </template>

      <!-- Load more -->
      <button
        v-if="hasMore"
        class="cs-load-more"
        type="button"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? 'Đang tải…' : 'Xem thêm bình luận' }}
      </button>
    </div>

    <!-- Input area -->
    <div v-if="isAuthenticated" class="cs-input-wrap">
      <div v-if="replyingTo" class="cs-reply-banner">
        <span>Đang trả lời <strong>{{ replyingTo.full_name || replyingTo.username }}</strong></span>
        <button class="cs-cancel-reply" type="button" @click="cancelReply">✕</button>
      </div>

      <div class="cs-input-row">
        <div class="cs-input-avatar">
          <img :src="resolveAvatar(currentUserAvatar)" alt="Current user" class="cs-avatar-img" />
        </div>
        <textarea
          ref="inputRef"
          v-model="newCommentText"
          class="cs-textarea"
          :class="{ 'cs-textarea--error': isOverLimit }"
          placeholder="Write a comment..."
          rows="2"
          :disabled="isSending"
          @keydown="handleKeydown"
        />
        <button
          class="cs-send-btn"
          type="button"
          :disabled="isSending || !newCommentText.trim() || isOverLimit"
          @click="submitComment"
        >
          <span v-if="isSending" class="cs-spinner" />
          <svg v-else viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

    </div>
    <p v-else class="cs-login-hint">
      <a href="/login">Đăng nhập</a> để bình luận.
    </p>
  </section>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.comment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  flex: 1;
}

.cs-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.cs-count {
  font-size: 12px;
  font-weight: 500;
  background: rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  padding: 1px 8px;
  color: var(--muted, #6b7280);
}

/* ── Real-time toast ─────────────────────────────────────────────────────── */
.cs-new-toast {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--primary, #1c62d6);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 7px 18px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s, background 0.15s;
}

.cs-new-toast:hover {
  background: var(--primary-dark, #184fb0);
  transform: translateY(-1px);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── List ────────────────────────────────────────────────────────────────── */
.cs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
  min-height: 0;
}

.cs-list::-webkit-scrollbar {
  width: 4px;
}
.cs-list::-webkit-scrollbar-track {
  background: transparent;
}
.cs-list::-webkit-scrollbar-thumb {
  background: var(--border, #e5e7eb);
  border-radius: 4px;
}

/* ── Comment item ─────────────────────────────────────────────────────────── */
.cs-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.cs-item--reply {
  margin-left: 34px;
}

.cs-item--reply .cs-body {
  background: #f4f7ff;
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */
.cs-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--primary, #1c62d6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cs-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cs-avatar-fallback {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ── Body ────────────────────────────────────────────────────────────────── */
.cs-body {
  flex: 1;
  min-width: 0;
  background: #eef4ff;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.05);
}

.cs-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.cs-name {
  font-weight: 600;
  font-size: 13px;
}

.cs-time {
  font-size: 11px;
  color: var(--muted, #9ca3af);
}

.cs-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Item actions ────────────────────────────────────────────────────────── */
.cs-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.cs-action-btn {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted, #6b7280);
  cursor: pointer;
  transition: color 0.15s;
}

.cs-action-btn:hover {
  color: var(--primary, #1c62d6);
}

.cs-action-btn--danger:hover {
  color: var(--danger, #dc2626);
}

.cs-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Load more ───────────────────────────────────────────────────────────── */
.cs-load-more {
  align-self: center;
  margin: 4px auto 0;
  border: 1px solid var(--border, #e5e7eb);
  background: #fff;
  border-radius: 999px;
  padding: 6px 18px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  color: var(--primary, #6366f1);
  transition: background 0.15s, border-color 0.15s;
}

.cs-load-more:hover:not(:disabled) {
  background: #f5f5ff;
  border-color: var(--primary, #6366f1);
}

.cs-load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Input area ──────────────────────────────────────────────────────────── */
.cs-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--border, #e5e7eb);
  padding-top: 12px;
  margin-top: auto;
}

.cs-reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f0ff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--primary, #6366f1);
}

.cs-cancel-reply {
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--muted, #9ca3af);
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}

.cs-cancel-reply:hover {
  color: var(--danger, #dc2626);
}

.cs-input-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 6px 8px;
  background: #fff;
}

.cs-input-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
}

.cs-input-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cs-textarea {
  flex: 1;
  border: none;
  border-radius: 0;
  padding: 6px 4px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: box-shadow 0.2s;
  background: transparent;
}

.cs-textarea:focus {
  box-shadow: none;
}

.cs-textarea--error {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.cs-textarea:disabled {
  opacity: 0.6;
}

.cs-send-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: var(--primary, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.cs-send-btn:hover:not(:disabled) {
  background: #295fd1;
}

.cs-send-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.cs-send-btn:disabled {
  background: var(--border, #d1d5db);
  cursor: not-allowed;
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.cs-spinner {
  display: block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Char counter ────────────────────────────────────────────────────────── */

/* ── Empty / error / hint ────────────────────────────────────────────────── */
.cs-empty {
  text-align: center;
  color: var(--muted, #9ca3af);
  font-size: 13px;
  padding: 20px 0;
}

.cs-error {
  margin: 0;
  font-size: 13px;
  color: var(--danger, #dc2626);
}

.cs-login-hint {
  font-size: 13px;
  color: var(--muted, #9ca3af);
  margin: 0;
  border-top: 1px solid var(--border, #e5e7eb);
  padding-top: 12px;
}

.cs-login-hint a {
  color: var(--primary, #6366f1);
  font-weight: 600;
  text-decoration: none;
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
.cs-skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.cs-skeleton {
  height: 54px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
