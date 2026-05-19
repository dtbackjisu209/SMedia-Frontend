<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileHighlight } from '../types/profile'
import { resolveAvatar, resolveMediaUrl } from '@/shared/constants/avatar'

const props = defineProps<{
  highlights: ProfileHighlight[]
  canManage?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-highlight', highlight: ProfileHighlight): void
  (e: 'create-highlight'): void
  (e: 'manage-highlight', highlight: ProfileHighlight): void
}>()

const visibleHighlights = computed(() => props.highlights.filter((highlight) => highlight.story_count > 0))
</script>

<template>
  <section v-if="visibleHighlights.length || canManage" class="highlight-strip">
    <button
      v-if="canManage"
      type="button"
      class="highlight-strip__item highlight-strip__item--create"
      @click="emit('create-highlight')"
    >
      <div class="highlight-strip__cover highlight-strip__cover--create">
        <span class="highlight-strip__plus">+</span>
      </div>
      <strong class="highlight-strip__title">Mới</strong>
      <span class="highlight-strip__meta">Tạo tin nổi bật</span>
    </button>

    <button
      v-for="highlight in visibleHighlights"
      :key="highlight.id"
      type="button"
      class="highlight-strip__item"
      @click="emit('open-highlight', highlight)"
      >
        <div class="highlight-strip__cover">
          <img
            :src="resolveMediaUrl(highlight.cover_media_url) || resolveAvatar(null)"
            :alt="highlight.title"
            class="highlight-strip__image"
          />
          <button
            v-if="canManage"
            type="button"
            class="highlight-strip__manage"
            aria-label="Manage highlight"
            @click.stop="emit('manage-highlight', highlight)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>
      <strong class="highlight-strip__title">{{ highlight.title }}</strong>
      <span class="highlight-strip__meta">{{ highlight.story_count }} story</span>
    </button>
  </section>
</template>

<style scoped>
.highlight-strip {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding: 18px 4px 8px;
  margin-bottom: 8px;
}

.highlight-strip__item {
  flex: 0 0 auto;
  width: 92px;
  text-align: center;
  color: #0f172a;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.highlight-strip__cover {
  position: relative;
  width: 76px;
  height: 76px;
  margin: 0 auto 10px;
  padding: 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, #dbe4f0 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.highlight-strip__cover--create {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #1f2937 0%, #111827 100%);
  border-color: rgba(148, 163, 184, 0.4);
}

.highlight-strip__plus {
  color: #fff;
  font-size: 2.5rem;
  line-height: 1;
  font-weight: 300;
}

.highlight-strip__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 999px;
  display: block;
  background: #e2e8f0;
}

.highlight-strip__manage {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: #0f172a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.22);
}

.highlight-strip__title {
  display: block;
  font-size: 0.8rem;
  line-height: 1.25;
  font-weight: 700;
}

.highlight-strip__meta {
  display: block;
  margin-top: 2px;
  font-size: 0.72rem;
  color: #64748b;
}
</style>
