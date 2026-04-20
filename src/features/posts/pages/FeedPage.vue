<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CreatePostForm from '@/features/posts/components/CreatePostForm.vue'
import PostFeed from '@/features/posts/components/PostFeed.vue'
import { usePostsStore } from '@/features/posts/store/posts.store'
import StoryBar from '@/features/stories/components/StoryBar.vue'

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
    <!-- Khu v?c StoryBar ch�nh th?c -->
    <StoryBar />

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
  z-index: 40;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-card {
  width: 100%;
  max-width: 500px;
}
</style>
