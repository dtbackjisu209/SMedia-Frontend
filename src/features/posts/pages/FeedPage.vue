<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import CreatePostForm from '@/features/posts/components/CreatePostForm.vue'
import PostFeed from '@/features/posts/components/PostFeed.vue'
import { usePostsStore } from '@/features/posts/store/posts.store'
import StoryBar from '@/features/stories/components/StoryBar.vue'

const postsStore = usePostsStore()
const isCreateModalOpen = ref(false)

onMounted(() => {
  postsStore.fetchPosts()
  if (typeof window !== 'undefined') {
    window.addEventListener('open-create-post', openCreateModal)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('open-create-post', openCreateModal)
  }
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
  gap: 16px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.modal-card {
  width: 100%;
  max-width: 640px;
  max-height: min(88vh, 820px);
  overflow: auto;
  padding: 0;
  border-radius: 26px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 12px;
  }

  .modal-card {
    max-height: 92vh;
    border-radius: 22px;
  }
}
</style>
