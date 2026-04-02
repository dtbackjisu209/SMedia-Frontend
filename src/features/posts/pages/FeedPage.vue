<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CreatePostForm from '@/features/posts/components/CreatePostForm.vue'
import PostFeed from '@/features/posts/components/PostFeed.vue'
import { usePostsStore } from '@/features/posts/store/posts.store'

const postsStore = usePostsStore()
const isCreateModalOpen = ref(false)

onMounted(() => {
  postsStore.fetchPosts()
})

function openCreateModal() {
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  isCreateModalOpen.value = false
}
</script>

<template>
  <section class="feed-page">
    <section class="card stories">
      <button v-for="index in 8" :key="index" class="story-item" type="button">
        <span class="story-avatar"></span>
        <span class="story-name">story{{ index }}</span>
      </button>
    </section>

    <button class="create-trigger" type="button" @click="openCreateModal">+</button>

    <div v-if="isCreateModalOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <section class="modal-card card" role="dialog" aria-modal="true" aria-label="Create post">
        <CreatePostForm @submitted="closeCreateModal" @cancel="closeCreateModal" />
      </section>
    </div>

    <PostFeed />
  </section>
</template>

<style scoped>
.feed-page {
  display: grid;
  gap: 14px;
}

.stories {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 14px;
}

.story-item {
  border: none;
  background: transparent;
  cursor: pointer;
  display: grid;
  gap: 6px;
  justify-items: center;
  min-width: 70px;
  padding: 0;
}

.story-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--story-ring);
  position: relative;
}

.story-avatar::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #fff;
}

.story-name {
  font-size: 12px;
  color: var(--muted);
}

.create-trigger {
  position: fixed;
  right: 24px;
  bottom: 94px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: #fff;
  font-size: 36px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(0, 149, 246, 0.35);
  z-index: 30;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  padding: 14px;
}

.modal-card {
  width: min(640px, 100%);
  max-height: 92vh;
  overflow: auto;
}

@media (max-width: 900px) {
  .stories {
    padding: 10px;
    gap: 10px;
  }

  .story-avatar {
    width: 52px;
    height: 52px;
  }

  .create-trigger {
    right: 16px;
    bottom: 88px;
    width: 52px;
    height: 52px;
  }
}
</style>
