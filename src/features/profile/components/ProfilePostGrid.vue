<script setup lang="ts">
import { computed } from 'vue'
import type { ProfilePost } from '../types/profile'

const props = defineProps<{
  posts: ProfilePost[]
}>()

const orderedPosts = computed(() =>
  [...props.posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
)

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <section class="profile-posts">
    <header class="profile-posts__header">
      <h2>Posts</h2>
      <span class="profile-posts__count">{{ posts.length }}</span>
    </header>

    <div v-if="orderedPosts.length" class="profile-posts__grid">
      <article v-for="post in orderedPosts" :key="post.id" class="profile-post-card">
        <div class="profile-post-card__media">
          <img
            v-if="post.thumbnail"
            :src="post.thumbnail"
            :alt="post.caption || `Post ${post.id}`"
          />
          <div v-else class="profile-post-card__fallback">
            No media
          </div>
        </div>

        <div class="profile-post-card__body">
          <p class="profile-post-card__caption">
            {{ post.caption || 'No caption.' }}
          </p>
          <p v-if="post.location" class="profile-post-card__location">
            {{ post.location }}
          </p>
          <p class="profile-post-card__date">
            {{ formatDate(post.created_at) }}
          </p>
        </div>
      </article>
    </div>

    <div v-else class="profile-posts__empty">
      This user has not posted anything yet.
    </div>
  </section>
</template>

<style scoped>
.profile-posts {
  padding: 1.75rem;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 1.5rem;
}

.profile-posts__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-posts__header h2 {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.profile-posts__count {
  min-width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  color: #64748b;
}

.profile-posts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.profile-post-card {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1.1rem;
  background: #fff;
}

.profile-post-card__media {
  aspect-ratio: 1 / 1;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
}

.profile-post-card__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.profile-post-card__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 600;
}

.profile-post-card__body {
  padding: 1rem;
}

.profile-post-card__caption {
  margin: 0;
  color: #111827;
  line-height: 1.55;
}

.profile-post-card__location,
.profile-post-card__date {
  margin: 0.75rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.profile-posts__empty {
  padding: 1rem 0 0.25rem;
  color: #64748b;
}
</style>
