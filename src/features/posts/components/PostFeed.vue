<script setup lang="ts">
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'

const postsStore = usePostsStore()
const router = useRouter()

function openPostDetail(postId: string) {
  router.push(`/posts/${postId}`)
}
</script>

<template>
  <section class="feed-wrap">
    <h3 class="section-title">Latest Posts</h3>
    <p v-if="postsStore.errorMessage" class="error">{{ postsStore.errorMessage }}</p>
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
          <button class="more" type="button" @click.stop>...</button>
        </header>

        <img v-if="post.thumbnail" :src="post.thumbnail" class="media" alt="Post thumbnail" loading="lazy" />
        <div v-else class="media media-fallback"></div>

        <p v-if="post.caption" class="content">{{ post.caption }}</p>
        <p v-if="post.location" class="muted location">{{ post.location }}</p>

        <footer class="actions">
          <button class="action" type="button" @click.stop>Like {{ post.likeCount }}</button>
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
