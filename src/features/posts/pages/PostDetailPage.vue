<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'
import { useCommentsStore } from '@/features/posts/store/comments.store'
import { useAuthStore } from '@/features/auth/store/auth.store'
import EditPostModal from '@/features/posts/components/EditPostModal.vue'
import DeletePostConfirmModal from '@/features/posts/components/DeletePostConfirmModal.vue'
import CommentSection from '@/features/posts/components/CommentSection.vue'
import type { UpdatePostInput } from '@/features/posts/api/posts.api'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const commentsStore = useCommentsStore()
const authStore = useAuthStore()
const currentMediaIndex = ref(0)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const actionMessage = ref('')

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
      <!-- Header -->
      <header class="head">
        <div class="author-info">
          <div class="avatar">
            <img
              v-if="postsStore.selectedPost.author.avatarUrl"
              :src="postsStore.selectedPost.author.avatarUrl"
              :alt="postsStore.selectedPost.author.fullName"
              class="avatar-img"
            />
            <span v-else class="avatar-initials">
              {{ (postsStore.selectedPost.author.fullName || postsStore.selectedPost.author.username || '?')[0].toUpperCase() }}
            </span>
          </div>
          <div>
            <h2 class="section-title">{{ postsStore.selectedPost.author.fullName || postsStore.selectedPost.author.username }}</h2>
            <p class="muted time">{{ dayjs(postsStore.selectedPost.createdAt).format('HH:mm · DD/MM/YYYY') }}</p>
          </div>
        </div>
        <div v-if="isOwner" class="owner-actions">
          <button class="button secondary small-btn" type="button" :disabled="postsStore.isUpdating" @click="openEditModal">
            {{ postsStore.isUpdating ? 'Đang lưu...' : 'Chỉnh sửa' }}
          </button>
          <button
            class="button small-btn danger-btn"
            type="button"
            :disabled="postsStore.isDeleteLoading(postsStore.selectedPost.id)"
            @click="openDeleteModal"
          >
            {{ postsStore.isDeleteLoading(postsStore.selectedPost.id) ? 'Đang xóa...' : 'Xóa' }}
          </button>
        </div>
      </header>

      <!-- Caption & location -->
      <p v-if="postsStore.selectedPost.caption" class="caption">{{ postsStore.selectedPost.caption }}</p>
      <p v-if="postsStore.selectedPost.location" class="location muted">📍 {{ postsStore.selectedPost.location }}</p>

      <!-- Media viewer -->
      <section v-if="postsStore.selectedPost.media.length > 0" class="media-viewer">
        <button class="arrow" type="button" :disabled="!hasPrevious" @click="goPreviousMedia">&#8249;</button>

        <article v-if="currentMedia" class="media-item">
          <img
            v-if="currentMedia.mediaType === 'image'"
            :src="currentMedia.mediaUrl"
            alt="Post image"
            class="media"
          />
          <video v-else :src="currentMedia.mediaUrl" class="media" controls playsinline></video>
        </article>

        <button class="arrow" type="button" :disabled="!hasNext" @click="goNextMedia">&#8250;</button>
      </section>

      <p v-if="selectedPost && selectedPost.media.length > 1" class="muted media-index">
        {{ currentMediaIndex + 1 }} / {{ selectedPost.media.length }}
      </p>

      <!-- Stats & like -->
      <footer class="stats">
        <button
          class="like-btn"
          :class="{ 'like-btn--liked': postsStore.selectedPost.isLiked }"
          type="button"
          :aria-label="postsStore.selectedPost.isLiked ? 'Unlike bài viết' : 'Like bài viết'"
          :disabled="postsStore.isLikeLoading(postsStore.selectedPost.id)"
          @click="toggleCurrentPostLike"
        >
          <span class="like-icon">{{ postsStore.selectedPost.isLiked ? '❤️' : '🤍' }}</span>
          <span>{{ postsStore.selectedPost.likeCount }}</span>
        </button>
        <span class="stat-badge">💬 {{ displayCommentCount }}</span>
        <span class="stat-badge">🖼 {{ postsStore.selectedPost.mediaCount }}</span>
      </footer>

      <!-- Tags -->
      <div v-if="postsStore.selectedPost.tags.length > 0" class="tags">
        <span v-for="tag in postsStore.selectedPost.tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>

      <!-- Comment section -->
      <div class="comment-wrap">
        <CommentSection
          :post-id="postId"
          :comment-count="displayCommentCount"
        />
      </div>
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
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--primary, #6366f1);
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

.owner-actions {
  display: flex;
  gap: 8px;
}

.small-btn {
  padding: 7px 12px;
}

.danger-btn {
  background: #b91c1c;
}

.caption {
  margin: 0;
  padding: 0 16px 8px;
  line-height: 1.6;
}

.location {
  margin: 0 0 8px;
  padding: 0 16px;
  font-size: 12px;
}

.media-viewer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 0 8px;
}

.media-item {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
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
  max-height: 520px;
  object-fit: cover;
  display: block;
}

.media-index {
  margin: 8px 0 0;
  text-align: center;
  font-size: 12px;
}

/* ── Stats ─────────────────────────────────────────────────────────────── */
.stats {
  margin: 12px 0 0;
  padding: 0 16px 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border, #e5e7eb);
  background: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.like-btn:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
}

.like-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.like-btn--liked {
  border-color: #fca5a5;
  background: #fff5f5;
}

.like-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.like-icon {
  font-size: 16px;
  line-height: 1;
}

.stat-badge {
  font-size: 13px;
  color: var(--muted, #6b7280);
}

/* ── Tags ──────────────────────────────────────────────────────────────── */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px 4px;
}

.tag {
  font-size: 12px;
  color: var(--primary, #6366f1);
  background: rgba(99, 102, 241, 0.08);
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
</style>
