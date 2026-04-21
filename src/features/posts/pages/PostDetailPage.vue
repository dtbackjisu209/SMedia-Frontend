<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePostsStore } from '@/features/posts/store/posts.store'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const currentMediaIndex = ref(0)

const postId = computed(() => String(route.params.postId ?? ''))
const selectedPost = computed(() => postsStore.selectedPost)
const currentMedia = computed(() => selectedPost.value?.media[currentMediaIndex.value] ?? null)
const hasPrevious = computed(() => currentMediaIndex.value > 0)
const hasNext = computed(() => {
  const mediaCount = selectedPost.value?.media.length ?? 0
  return currentMediaIndex.value < mediaCount - 1
})

async function loadDetail() {
  if (!postId.value) return
  await postsStore.fetchPostDetail(postId.value)
  currentMediaIndex.value = 0
}

onMounted(() => {
  loadDetail()
})

watch(postId, () => {
  loadDetail()
})

function goBack() {
  router.back()
}

function goPreviousMedia() {
  if (!hasPrevious.value) return
  currentMediaIndex.value -= 1
}

function goNextMedia() {
  if (!hasNext.value) return
  currentMediaIndex.value += 1
}

async function toggleCurrentPostLike() {
  const post = postsStore.selectedPost
  if (!post) return

  try {
    await postsStore.togglePostLike(post.id, post.isLiked)
  } catch {
    // Error state is already exposed through the store.
  }
}
</script>

<template>
  <section class="detail-page">
    <button class="button secondary back-btn" type="button" @click="goBack">Back to feed</button>

    <p v-if="postsStore.isDetailLoading" class="muted">Loading post detail...</p>
    <p v-else-if="postsStore.errorMessage" class="error">{{ postsStore.errorMessage }}</p>
    <p v-if="postsStore.likeActionError" class="error">{{ postsStore.likeActionError }}</p>

    <article v-else-if="postsStore.selectedPost" class="card detail-card">
      <header class="head">
        <div>
          <h2 class="section-title">{{ postsStore.selectedPost.author.fullName || postsStore.selectedPost.author.username }}</h2>
          <p class="muted">{{ dayjs(postsStore.selectedPost.createdAt).format('HH:mm DD/MM/YYYY') }}</p>
        </div>
      </header>

      <p v-if="postsStore.selectedPost.caption" class="caption">{{ postsStore.selectedPost.caption }}</p>
      <p v-if="postsStore.selectedPost.location" class="location muted">{{ postsStore.selectedPost.location }}</p>

      <section class="media-viewer" v-if="postsStore.selectedPost.media.length > 0">
        <button class="arrow" type="button" :disabled="!hasPrevious" @click="goPreviousMedia">&lsaquo;</button>

        <article class="media-item" v-if="currentMedia">
          <img
            v-if="currentMedia.mediaType === 'image'"
            :src="currentMedia.mediaUrl"
            alt="Post image"
            class="media"
          />
          <video v-else :src="currentMedia.mediaUrl" class="media" controls playsinline></video>
        </article>

        <button class="arrow" type="button" :disabled="!hasNext" @click="goNextMedia">&rsaquo;</button>
      </section>

      <p v-if="selectedPost && selectedPost.media.length > 1" class="muted media-index">
        {{ currentMediaIndex + 1 }} / {{ selectedPost.media.length }}
      </p>

      <footer class="stats">
        <button
          class="like-btn"
          type="button"
          :disabled="postsStore.isLikeLoading(postsStore.selectedPost.id)"
          @click="toggleCurrentPostLike"
        >
          {{ postsStore.isLikeLoading(postsStore.selectedPost.id) ? 'Loading...' : postsStore.selectedPost.isLiked ? 'Unlike' : 'Like' }}
        </button>
        <span>Likes: {{ postsStore.selectedPost.likeCount }}</span>
        <span>Comments: {{ postsStore.selectedPost.commentCount }}</span>
        <span>Media: {{ postsStore.selectedPost.mediaCount }}</span>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.detail-page {
  display: grid;
  gap: 12px;
}

.back-btn {
  width: auto;
  justify-self: start;
  padding: 8px 14px;
}

.detail-card {
  padding: 16px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.caption {
  margin: 8px 0 6px;
  line-height: 1.6;
}

.location {
  margin: 0 0 12px;
}

.media-viewer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.media-item {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.arrow:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.media {
  width: 100%;
  max-height: 520px;
  object-fit: cover;
  display: block;
}

.media-index {
  margin: 8px 0 0;
  text-align: center;
}

.stats {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 13px;
}

.like-btn {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.like-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.error {
  margin: 0;
  color: var(--danger);
}
</style>
