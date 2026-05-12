<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'
import { useCommentsStore } from '@/features/posts/store/comments.store'
import { useAuthStore } from '@/features/auth/store/auth.store'
import EditPostModal from '@/features/posts/components/EditPostModal.vue'
import DeletePostConfirmModal from '@/features/posts/components/DeletePostConfirmModal.vue'
import CommentSection from '@/features/posts/components/CommentSection.vue'
import type { UpdatePostInput } from '@/features/posts/api/posts.api'
import { resolveAvatar } from '@/shared/constants/avatar'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const commentsStore = useCommentsStore()
const authStore = useAuthStore()
const currentMediaIndex = ref(0)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const actionMessage = ref('')
const isMenuOpen = ref(false)

function toggleMenu() {
  if (!isOwner.value) return
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.more-wrap')) {
    closeMenu()
  }
}

const postId = computed(() => String(route.params.postId ?? ''))
const selectedPost = computed(() => postsStore.selectedPost)
const currentMedia = computed(() => selectedPost.value?.media[currentMediaIndex.value] ?? null)
const myUserId = computed(() => Number(authStore.userId ?? 0))
const isDetailDeleteLoading = computed(() => {
  if (!selectedPost.value) return false
  return postsStore.isDeleteLoading(selectedPost.value.id)
})
const isOwner = computed(() => {
  const authorId = Number(selectedPost.value?.author.id ?? 0)
  return Boolean(myUserId.value && authorId && myUserId.value === authorId)
})
const hasPrevious = computed(() => currentMediaIndex.value > 0)
const hasNext = computed(() => {
  const mediaCount = selectedPost.value?.media.length ?? 0
  return currentMediaIndex.value < mediaCount - 1
})

// Live comment count: prefer loaded store count, else post.commentCount from API
const postState = computed(() => commentsStore.getState(postId.value))
const displayCommentCount = computed(() => {
  const state = postState.value
  if (!state || !state.initialized) return selectedPost.value?.commentCount ?? 0
  return state.comments.length
})

async function loadDetail() {
  if (!postId.value) return
  try {
    await postsStore.fetchPostDetail(postId.value)
  } catch {
    if (postsStore.errorMessage === 'Bai viet khong con ton tai.') {
      router.push('/')
    }
  }
  currentMediaIndex.value = 0

  if (route.query.action === 'edit' && isOwner.value) {
    isEditModalOpen.value = true
  }
}

onMounted(() => {
  loadDetail()
  if (typeof document !== 'undefined') {
    document.body.classList.add('detail-view')
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('detail-view')
    document.removeEventListener('click', handleClickOutside)
  }
})

watch(postId, () => {
  loadDetail()
})

function goBack() {
  router.back()
}

function goPreviousMedia() {
  if (!hasPrevious.value) return
  currentMediaIndex.value -= 1
}

function goNextMedia() {
  if (!hasNext.value) return
  currentMediaIndex.value += 1
}

async function openEditModal() {
  if (!postId.value || !isOwner.value || postsStore.isUpdating) return

  actionMessage.value = ''
  try {
    await postsStore.fetchPostDetail(postId.value)
    isEditModalOpen.value = true
  } catch {
    // Error state is already exposed through the store.
  }
}

function openDeleteModal() {
  if (!isOwner.value) return
  actionMessage.value = ''
  isDeleteModalOpen.value = true
}

async function handleUpdatePost(payload: UpdatePostInput) {
  if (!postId.value) return

  try {
    await postsStore.updatePost(postId.value, payload)
    actionMessage.value = 'Đã cập nhật bài viết.'
    isEditModalOpen.value = false
    if (route.query.action === 'edit') {
      router.replace({ path: `/posts/${postId.value}` })
    }
  } catch {
    // Error state is already exposed through the store.
  }
}

async function handleDeletePost() {
  if (!postId.value) return

  try {
    await postsStore.deletePost(postId.value)
    isDeleteModalOpen.value = false
    router.push('/')
  } catch {
    // Error state is already exposed through the store.
  }
}

async function toggleCurrentPostLike() {
  const post = postsStore.selectedPost
  if (!post) return

  try {
    await postsStore.togglePostLike(post.id, post.isLiked)
  } catch {
    // Error state is already exposed through the store.
  }
}
</script>

<template>
  <section class="detail-page">
    <button class="button secondary back-btn" type="button" @click="goBack">← Quay lại</button>

    <p v-if="postsStore.isDetailLoading" class="muted">Đang tải bài viết...</p>
    <p v-else-if="postsStore.errorMessage" class="error">{{ postsStore.errorMessage }}</p>
    <p v-if="postsStore.likeActionError" class="error">{{ postsStore.likeActionError }}</p>
    <p v-if="postsStore.updateActionError" class="error">{{ postsStore.updateActionError }}</p>
    <p v-if="postsStore.deleteActionError" class="error">{{ postsStore.deleteActionError }}</p>
    <p v-if="actionMessage" class="success">{{ actionMessage }}</p>

    <article v-else-if="postsStore.selectedPost" class="card detail-card">
      <div class="detail-main">
        <!-- Header -->
        <header class="head">
          <div class="author-info">
            <div class="avatar">
              <img
                :src="resolveAvatar(postsStore.selectedPost.author.avatarUrl)"
                :alt="postsStore.selectedPost.author.fullName"
                class="avatar-img"
              />
            </div>
            <div>
              <h2 class="section-title">{{ postsStore.selectedPost.author.fullName || postsStore.selectedPost.author.username }}</h2>
              <p class="muted time">{{ dayjs(postsStore.selectedPost.createdAt).format('HH:mm · DD/MM/YYYY') }}</p>
            </div>
          </div>

          <!-- 3-dot menu (owner only) -->
          <div v-if="isOwner" class="more-wrap">
            <button
              class="more-btn"
              type="button"
              aria-label="More actions"
              :aria-expanded="isMenuOpen"
              @click.stop="toggleMenu"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            <transition name="menu-pop">
              <div v-if="isMenuOpen" class="more-menu" role="menu">
                <button
                  class="more-menu-item"
                  role="menuitem"
                  type="button"
                  @click="() => { closeMenu(); openEditModal() }"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Chỉnh sửa bài
                </button>
                <button
                  class="more-menu-item more-menu-item--danger"
                  role="menuitem"
                  type="button"
                  @click="() => { closeMenu(); openDeleteModal() }"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Xóa bài viết
                </button>
              </div>
            </transition>
          </div>
        </header>

        <!-- Media viewer -->
        <section v-if="postsStore.selectedPost.media.length > 0" class="media-viewer">
          <button
            v-if="postsStore.selectedPost.media.length > 1"
            class="arrow"
            type="button"
            :disabled="!hasPrevious"
            @click="goPreviousMedia"
          >
            &#8249;
          </button>

          <article v-if="currentMedia" class="media-item">
            <img
              v-if="currentMedia.mediaType === 'image'"
              :src="currentMedia.mediaUrl"
              alt="Post image"
              class="media"
            />
            <video v-else :src="currentMedia.mediaUrl" class="media" controls playsinline></video>
          </article>

          <button
            v-if="postsStore.selectedPost.media.length > 1"
            class="arrow"
            type="button"
            :disabled="!hasNext"
            @click="goNextMedia"
          >
            &#8250;
          </button>
        </section>

        <!-- Caption & location -->
        <div class="caption-block">
          <p v-if="postsStore.selectedPost.caption" class="caption-title">{{ postsStore.selectedPost.caption }}</p>
          <p v-if="postsStore.selectedPost.location" class="caption-body muted">{{ postsStore.selectedPost.location }}</p>
        </div>

        <!-- Tags -->
        <div v-if="postsStore.selectedPost.tags.length > 0" class="tags">
          <span v-for="tag in postsStore.selectedPost.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>

        <!-- Actions -->
        <footer class="detail-actions">
          <button
            class="detail-action"
            type="button"
            :aria-label="postsStore.selectedPost.isLiked ? 'Unlike post' : 'Like post'"
            :disabled="postsStore.isLikeLoading(postsStore.selectedPost.id)"
            @click="toggleCurrentPostLike"
          >
            <svg class="detail-icon" :class="{ 'detail-icon--active': postsStore.selectedPost.isLiked }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.8 9.6a5.5 5.5 0 0 0-9-4.2L12 6l.2-.6a5.5 5.5 0 0 0-9 4.2c0 6.4 8.8 10.8 8.8 10.8s8.8-4.4 8.8-10.8z" />
            </svg>
            <span>{{ postsStore.selectedPost.likeCount }}</span>
          </button>
          <button class="detail-action" type="button" aria-label="Comments">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{{ displayCommentCount }}</span>
          </button>
          <button class="detail-action" type="button" aria-label="Share">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v13" />
            </svg>
          </button>
        </footer>
      </div>

      <aside class="detail-comments">
        <CommentSection
          :post-id="postId"
          :comment-count="displayCommentCount"
        />
      </aside>
    </article>

    <EditPostModal
      v-model="isEditModalOpen"
      :post="postsStore.selectedPost"
      :is-saving="postsStore.isUpdating"
      :error-message="postsStore.updateActionError"
      @submit="handleUpdatePost"
    />

    <DeletePostConfirmModal
      v-model="isDeleteModalOpen"
      :is-deleting="isDetailDeleteLoading"
      :error-message="postsStore.deleteActionError"
      @confirm="handleDeletePost"
    />
  </section>
</template>

<style scoped>
.detail-page {
  display: grid;
  gap: 12px;
}

.back-btn {
  width: auto;
  justify-self: start;
  padding: 8px 14px;
}

.detail-card {
  padding: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  grid-template-rows: 1fr;
  gap: 0;
  min-height: 620px;
  height: calc(100vh - 120px);
  background: #fff;
  align-self: start;
  width: 100%;
  max-width: 100%;
}

.detail-main {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  height: 100%;
  overflow: hidden;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 10px;
  flex-shrink: 0;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--primary, #1c62d6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}

.section-title {
  margin: 0;
  font-size: 15px;
}

.time {
  margin: 2px 0 0;
  font-size: 12px;
}


.more-wrap {
  position: relative;
}

.more-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  line-height: 1;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.more-btn:hover {
  background: rgba(148, 163, 184, 0.14);
  color: var(--text);
}

.more-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 6px;
  z-index: 100;
  overflow: hidden;
}

.more-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease, color 0.12s ease;
}

.more-menu-item:hover {
  background: rgba(148, 163, 184, 0.12);
}

.more-menu-item--danger {
  color: #dc2626;
}

.more-menu-item--danger:hover {
  background: rgba(220, 38, 38, 0.08);
}

/* Dropdown animation */
.menu-pop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-pop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}
.menu-pop-enter-to,
.menu-pop-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.caption {
  margin: 0;
  padding: 0 18px 8px;
  line-height: 1.6;
}

.location {
  margin: 0 0 8px;
  padding: 0 18px;
  font-size: 12px;
}

.media-viewer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 0 18px;
  flex: 1;
  min-height: 0;
}

.media-item {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: var(--shadow-soft);
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
}

.arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.arrow:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.caption-block {
  padding: 10px 18px 0;
  display: grid;
  gap: 4px;
  flex-shrink: 0;
}

.caption-title {
  margin: 0;
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
}

.caption-body {
  margin: 0;
  font-size: 13px;
}

.detail-actions {
  margin: 10px 18px 0;
  padding: 10px 0 14px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  display: flex;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
}

.detail-action {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 13px;
  color: var(--muted);
}

.detail-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-icon {
  width: 16px;
  height: 16px;
  color: var(--muted);
  transition: color 0.15s ease;
}

.detail-action:hover .detail-icon,
.detail-action:hover span {
  color: var(--primary);
}

.detail-icon--active {
  color: #ef4444;
}

/* ── Tags ──────────────────────────────────────────────────────────────── */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 18px 0;
  flex-shrink: 0;
}

.tag {
  font-size: 12px;
  color: var(--primary, #1c62d6);
  background: rgba(28, 98, 214, 0.1);
  border-radius: 999px;
  padding: 2px 10px;
  font-weight: 500;
}

/* ── Comments ──────────────────────────────────────────────────────────── */
.comment-wrap {
  padding: 16px;
}

/* ── Misc ──────────────────────────────────────────────────────────────── */
.error {
  margin: 0;
  color: var(--danger);
}

.success {
  margin: 0;
  color: #166534;
}

.detail-comments {
  padding: 16px;
  background: #f7f8fc;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(226, 232, 240, 0.9);
  overflow: hidden;
}

:global(body.detail-view .right-rail) {
  display: none;
}

:global(body.detail-view .shell) {
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 0;
}

:global(body.detail-view .content) {
  padding: 0;
  min-height: unset;
}

@media (max-width: 1200px) {
  .detail-card {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

@media (max-width: 900px) {
  .detail-card {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .detail-main {
    border-right: none;
  }

  .detail-comments {
    border-left: none;
  }
}
</style>
