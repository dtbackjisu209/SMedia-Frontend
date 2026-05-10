<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useFollowStore } from '@/features/auth/store/follow.store'
import DeletePostConfirmModal from '@/features/posts/components/DeletePostConfirmModal.vue'
import type { Post } from '@/shared/types/social'

const postsStore = usePostsStore()
const authStore = useAuthStore()
const followStore = useFollowStore()
const router = useRouter()
const followLoadingUserId = ref<number | null>(null)
const followError = ref('')
const deleteTargetPostId = ref<string | null>(null)
const actionMessage = ref('')
const isDeleteModalDeleting = computed(() => {
  if (!deleteTargetPostId.value) return false
  return postsStore.isDeleteLoading(deleteTargetPostId.value)
})

const myUserId = computed(() => Number(authStore.userId ?? 0))

onMounted(async () => {
  if (!myUserId.value) return
  try {
    await followStore.loadMyFollowing(myUserId.value)
  } catch (error) {
    followError.value = error instanceof Error ? error.message : 'Could not load follow status.'
  }
})

function openPostDetail(postId: string) {
  router.push(`/posts/${postId}`)
}

function authorId(post: Post): number {
  return Number(post.author.id)
}

function firstMedia(post: Post): Post['media'][number] | null {
  if (!Array.isArray(post.media) || post.media.length === 0) return null

  const sorted = [...post.media].sort((a, b) => a.position - b.position)
  return sorted[0] ?? null
}

function canFollow(post: Post): boolean {
  const id = authorId(post)
  return Boolean(myUserId.value && id && id !== myUserId.value)
}

function isOwner(post: Post): boolean {
  const authorNumericId = authorId(post)
  return Boolean(myUserId.value && authorNumericId && authorNumericId === myUserId.value)
}

function followLabel(post: Post): string {
  const id = authorId(post)
  if (followStore.isFollowing(id)) return 'Following'
  if (followStore.isPending(id)) return 'Requested'
  return 'Follow'
}

async function toggleFollow(post: Post): Promise<void> {
  const id = authorId(post)
  if (!id || followLoadingUserId.value === id) return

  followError.value = ''
  followLoadingUserId.value = id

  try {
    await followStore.toggleFollow(id)
  } catch (error) {
    followError.value = error instanceof Error ? error.message : 'Follow action failed.'
  } finally {
    followLoadingUserId.value = null
  }
}

async function togglePostLike(post: Post): Promise<void> {
  try {
    await postsStore.togglePostLike(post.id, post.isLiked)
  } catch {
    // Error state is already exposed through the store.
  }
}

function openEditPost(post: Post): void {
  router.push({
    path: `/posts/${post.id}`,
    query: { action: 'edit' },
  })
}

function openDeleteConfirm(post: Post): void {
  actionMessage.value = ''
  deleteTargetPostId.value = post.id
}

function closeDeleteConfirm(): void {
  if (deleteTargetPostId.value && postsStore.isDeleteLoading(deleteTargetPostId.value)) return
  deleteTargetPostId.value = null
}

async function confirmDeletePost(): Promise<void> {
  if (!deleteTargetPostId.value) return

  actionMessage.value = ''
  try {
    await postsStore.deletePost(deleteTargetPostId.value)
    actionMessage.value = 'Da xoa bai viet.'
    deleteTargetPostId.value = null
  } catch {
    // Error state is already exposed through the store.
  }
}
</script>

<template>
  <section class="feed-wrap">
    <h3 class="section-title feed-title">Latest Posts</h3>
    <p v-if="postsStore.errorMessage" class="error">{{ postsStore.errorMessage }}</p>
    <p v-if="postsStore.likeActionError" class="error">{{ postsStore.likeActionError }}</p>
    <p v-if="postsStore.deleteActionError" class="error">{{ postsStore.deleteActionError }}</p>
    <p v-if="followError" class="error">{{ followError }}</p>
    <p v-if="actionMessage" class="success">{{ actionMessage }}</p>
    <p v-if="postsStore.isLoading" class="muted">Loading posts...</p>
    <p v-else-if="postsStore.posts.length === 0" class="empty muted">
      Your feed is empty. Be the first one to publish a post.
    </p>
    <ul v-else class="list">
      <li v-for="post in postsStore.posts" :key="post.id" class="card item" @click="openPostDetail(post.id)">
        <header class="item-head">
          <div class="author-wrap">
            <span class="avatar">{{ (post.author.fullName || post.author.username || '?')[0].toUpperCase() }}</span>
            <div class="author-meta">
              <strong class="author">{{ post.author.fullName || post.author.username }}</strong>
              <p class="time muted">{{ dayjs(post.createdAt).format('HH:mm DD/MM/YYYY') }}</p>
            </div>
          </div>
        </header>

        <template v-if="firstMedia(post)">
          <div class="media-box">
            <video
              v-if="firstMedia(post)?.mediaType === 'video'"
              class="media"
              :src="firstMedia(post)?.mediaUrl"
              controls
              preload="metadata"
              playsinline
              @click.stop
            ></video>
            <img
              v-else
              :src="firstMedia(post)?.mediaUrl || post.thumbnail"
              class="media"
              alt="Post image"
              loading="lazy"
            />
          </div>
        </template>
        <div v-else-if="post.thumbnail" class="media-box">
          <img :src="post.thumbnail" class="media" alt="Post thumbnail" loading="lazy" />
        </div>
        <div v-else class="media media-fallback"></div>

        <p v-if="post.caption" class="content">{{ post.caption }}</p>
        <p v-if="post.location" class="muted location">{{ post.location }}</p>

        <footer class="actions">
          <button
            class="action action--icon"
            type="button"
            :aria-label="post.isLiked ? 'Unlike' : 'Like'"
            :disabled="postsStore.isLikeLoading(post.id)"
            @click.stop="togglePostLike(post)"
          >
            <svg class="action-icon" :class="{ 'action-icon--active': post.isLiked }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.8 9.6a5.5 5.5 0 0 0-9-4.2L12 6l.2-.6a5.5 5.5 0 0 0-9 4.2c0 6.4 8.8 10.8 8.8 10.8s8.8-4.4 8.8-10.8z" />
            </svg>
            <span class="action-count">{{ post.likeCount }}</span>
          </button>
          <button class="action action--icon" type="button" aria-label="Comments" @click.stop="openPostDetail(post.id)">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span class="action-count">{{ post.commentCount }}</span>
          </button>
          <button class="action action--icon" type="button" aria-label="Media" @click.stop>
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M21 16l-5-5-4 4-3-3-4 4" />
            </svg>
            <span class="action-count">{{ post.mediaCount }}</span>
          </button>
        </footer>
      </li>
    </ul>

    <DeletePostConfirmModal
      :model-value="Boolean(deleteTargetPostId)"
      :is-deleting="isDeleteModalDeleting"
      :error-message="postsStore.deleteActionError"
      @update:model-value="(visible) => !visible && closeDeleteConfirm()"
      @confirm="confirmDeletePost"
    />
  </section>
</template>

<style scoped>
.feed-wrap {
  display: grid;
  gap: 10px;
}

.feed-title {
  width: 100%;
  margin: 0;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 16px;
}

.item {
  padding: 14px;
  overflow: hidden;
  display: grid;
  gap: 10px;
  cursor: pointer;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-soft);
  width: 100%;
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.author-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
}

.author-meta {
  display: grid;
  gap: 2px;
}

.author {
  font-size: 14px;
}

.time {
  margin: 0;
  font-size: 12px;
}

/* ── Media ────────────────────────────────────────────────────────────────── */
.media-box {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 600px;
}

.media {
  width: 100%;
  max-height: 600px;
  object-fit: contain;
  display: block;
}

.media-fallback {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.05)),
    radial-gradient(circle at 10% 10%, #f5f5f5, #e9e9e9);
}

.content {
  margin: 0;
  padding: 0;
  line-height: 1.65;
  white-space: pre-wrap;
}

.location {
  margin: 0;
  padding: 0;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 14px;
  padding-top: 6px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.action {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px 4px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action--icon {
  min-width: auto;
  justify-content: center;
}

.action-icon {
  width: 16px;
  height: 16px;
  color: var(--muted);
  transition: color 0.15s ease;
}

.action:hover .action-icon,
.action:hover .action-count {
  color: var(--primary);
}

.action-icon--active {
  color: #ef4444;
}

.action-count {
  font-weight: 600;
  color: var(--muted);
}



.empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 16px;
  margin: 0;
}

.error {
  margin: 0;
  color: var(--danger);
}

.success {
  margin: 0;
  color: #166534;
}

@media (max-width: 900px) {
  .media-box,
  .media {
    max-height: 420px;
  }
}

@media (max-width: 768px) {
  .item {
    max-width: 100%;
  }
}
</style>
