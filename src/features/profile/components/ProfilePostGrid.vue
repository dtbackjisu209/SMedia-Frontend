<script setup lang="ts">
import { computed } from 'vue'
import type { ProfilePost } from '../types/profile'

const props = defineProps<{
  posts: ProfilePost[]
}>()

const emit = defineEmits<{
  openPost: [postId: number]
}>()

const orderedPosts = computed(() =>
  [...props.posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
)
</script>

<template>
  <section class="pg">
    <!-- Empty state -->
    <div v-if="!orderedPosts.length" class="pg__empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p>No posts yet.</p>
    </div>

    <!-- Uniform grid -->
    <div v-else class="pg__grid">
      <article
        v-for="post in orderedPosts"
        :key="post.id"
        class="pg__card"
        role="button"
        tabindex="0"
        @click="emit('openPost', post.id)"
        @keydown.enter="emit('openPost', post.id)"
        @keydown.space.prevent="emit('openPost', post.id)"
      >
        <!-- Media -->
        <div class="pg__media">
          <img
            v-if="post.thumbnail"
            :src="post.thumbnail"
            :alt="post.caption || `Post ${post.id}`"
            class="pg__img"
          />
          <div v-else class="pg__img-fallback">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          <!-- Hover overlay -->
          <div class="pg__overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20.8 9.6a5.5 5.5 0 0 0-9-4.2L12 6l.2-.6a5.5 5.5 0 0 0-9 4.2c0 6.4 8.8 10.8 8.8 10.8s8.8-4.4 8.8-10.8z"/>
            </svg>
            <span>{{ post.like_count ?? 0 }}</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="margin-left:12px">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ post.comment_count ?? 0 }}</span>
          </div>
        </div>

        <!-- Caption -->
        <div v-if="post.caption" class="pg__caption">
          {{ post.caption }}
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
/* ── Container ─────────────────────────────────────────────────────────────── */
.pg {
  width: 100%;
}

/* ── Empty ──────────────────────────────────────────────────────────────────── */
.pg__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  background: #fff;
  border-radius: 1.5rem;
  border: 1px solid rgba(226, 232, 240, 0.8);
  color: #94a3b8;
  font-size: 0.95rem;
}

.pg__empty svg {
  opacity: 0.4;
}

.pg__empty p {
  margin: 0;
}

/* ── Masonry grid ───────────────────────────────────────────────────────────── */
.pg__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .pg__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .pg__grid {
    grid-template-columns: 1fr;
  }
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
.pg__card {
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  background: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pg__card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

.pg__card:focus-visible {
  outline: 3px solid #1c62d6;
  outline-offset: 2px;
}

/* ── Media ──────────────────────────────────────────────────────────────────── */
.pg__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 5;
  background: #f8fafc;
}

.pg__img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  transition: transform 0.3s ease;
}

.pg__card:hover .pg__img {
  transform: scale(1.04);
}

.pg__img-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f1f5f9, #e0e7ff);
  color: #94a3b8;
}

/* ── Hover overlay ──────────────────────────────────────────────────────────── */
.pg__overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(1px);
}

.pg__card:hover .pg__overlay {
  opacity: 1;
}

/* ── Caption ────────────────────────────────────────────────────────────────── */
.pg__caption {
  padding: 10px 14px 12px;
  font-size: 0.85rem;
  color: #374151;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #fff;
}
</style>
