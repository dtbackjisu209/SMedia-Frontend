<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useFollowStore } from '@/features/auth/store/follow.store'
import type { Post } from '@/shared/types/social'

const postsStore = usePostsStore()
const authStore = useAuthStore()
const followStore = useFollowStore()
const router = useRouter()
const followLoadingUserId = ref<number | null>(null)
const followError = ref('')

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

function canFollow(post: Post): boolean {
  const id = authorId(post)
  return Boolean(myUserId.value && id && id !== myUserId.value)
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
</script>

<template>
  <section class="feed-wrap">
    <h3 class="section-title">Latest Posts</h3>
    <p v-if="postsStore.errorMessage" class="error">{{ postsStore.errorMessage }}</p>
    <p v-if="postsStore.likeActionError" class="error">{{ postsStore.likeActionError }}</p>
    <p v-if="followError" class="error">{{ followError }}</p>
    <p v-if="postsStore.isLoading" class="muted">Loading posts...</p>
    <p v-else-if="postsStore.posts.length === 0" class="empty muted">
      Your feed is empty. Be the first one to publish a post.
    </p>
    <ul v-else class="list">
      <li v-for="post in postsStore.posts" :key="post.id" class="card item" @click="openPostDetail(post.id)">
        <header class="item-head">
          <div class="author-wrap">
            <span class="avatar"></span>
            <div>
              <strong class="author">{{ post.author.fullName || post.author.username }}</strong>
              <p class="time muted">{{ dayjs(post.createdAt).format('HH:mm DD/MM/YYYY') }}</p>
            </div>
          </div>
          <div class="head-actions">
            <button
              v-if="canFollow(post)"
              class="action action--follow"
              type="button"
              :disabled="followLoadingUserId === authorId(post)"
              @click.stop="toggleFollow(post)"
            >
              {{ followLoadingUserId === authorId(post) ? 'Loading...' : followLabel(post) }}
            </button>
            <button class="more" type="button" @click.stop>...</button>
          </div>
        </header>

        <img v-if="post.thumbnail" :src="post.thumbnail" class="media" alt="Post thumbnail" loading="lazy" />
        <div v-else class="media media-fallback"></div>

        <p v-if="post.caption" class="content">{{ post.caption }}</p>
        <p v-if="post.location" class="muted location">{{ post.location }}</p>

        <footer class="actions">
          <button
            class="action"
            type="button"
            :disabled="postsStore.isLikeLoading(post.id)"
            @click.stop="togglePostLike(post)"
          >
            {{ postsStore.isLikeLoading(post.id) ? 'Loading...' : post.isLiked ? 'Unlike' : 'Like' }}
            {{ post.likeCount }}
          </button>
          <button class="action" type="button" @click.stop>Comment {{ post.commentCount }}</button>
          <button class="action" type="button" @click.stop>Media {{ post.mediaCount }}</button>
        </footer>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.feed-wrap {
  display: grid;
  gap: 10px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.item {
  padding: 0;
  overflow: hidden;
  cursor: pointer;
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  gap: 8px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--story-ring);
  position: relative;
}

.avatar::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #fff;
}

.author {
  font-size: 14px;
}

.time {
  margin: 0;
  font-size: 11px;
}

.more {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.media {
  width: 100%;
  object-fit: cover;
  height: 340px;
}

.media-fallback {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.05)),
    radial-gradient(circle at 10% 10%, #f5f5f5, #e9e9e9);
}

.content {
  margin: 0;
  padding: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.location {
  margin: -4px 0 10px;
  padding: 0 12px;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

.action {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.action--follow {
  font-weight: 600;
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

@media (max-width: 900px) {
  .media {
    height: 260px;
  }
}
</style>
