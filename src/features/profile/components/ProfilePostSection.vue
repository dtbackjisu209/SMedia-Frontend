<script setup lang="ts">
import dayjs from 'dayjs'
import type { ProfilePostItem } from '../types/profile.types'

defineProps<{
  posts: ProfilePostItem[]
  isLoading: boolean
  errorMessage: string
}>()

defineEmits<{
  openPost: [postId: number]
}>()
</script>

<template>
  <section class="profile-posts card">
    <div class="section-head">
      <h3 class="section-title">Posts</h3>
      <span class="section-count">{{ posts.length }}</span>
    </div>

    <p v-if="isLoading" class="muted">Loading posts...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-else-if="posts.length === 0" class="empty muted">This user has not posted anything yet.</p>

    <div v-else class="post-grid">
      <button
        v-for="post in posts"
        :key="post.id"
        class="post-card"
        type="button"
        @click="$emit('openPost', post.id)"
      >
        <img v-if="post.thumbnail" :src="post.thumbnail" class="post-thumb" :alt="post.caption || 'Post media'" />
        <div v-else class="post-thumb post-thumb--empty"></div>

        <div class="post-overlay">
          <div class="post-overlay-stats">
            <span>{{ post.like_count }} likes</span>
            <span>{{ post.comment_count }} comments</span>
          </div>
          <p class="post-caption">{{ post.caption || 'No caption' }}</p>
          <p class="post-time">{{ dayjs(post.created_at).format('HH:mm DD/MM/YYYY') }}</p>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.profile-posts {
  padding: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  margin: 0;
}

.section-count {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--muted);
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.post-card {
  position: relative;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  border-radius: 18px;
}

.post-thumb {
  display: block;
  width: 100%;
  height: 260px;
  object-fit: cover;
  background: #f4f4f4;
}

.post-thumb--empty {
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.8), transparent 30%),
    linear-gradient(135deg, #f5d0fe, #fde68a);
}

.post-overlay {
  position: absolute;
  inset: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #fff;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.18s ease;
}

.post-card:hover .post-overlay {
  opacity: 1;
}

.post-overlay-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
}

.post-caption,
.post-time,
.empty,
.error {
  margin: 0;
}

.post-caption {
  font-size: 13px;
  line-height: 1.45;
}

.post-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.error {
  color: var(--danger);
}

@media (max-width: 900px) {
  .post-grid {
    grid-template-columns: 1fr;
  }

  .post-thumb {
    height: 220px;
  }
}
</style>
