import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createPostApi,
  fetchPostDetailApi,
  fetchPostsApi,
  type CreatePostInput,
} from '@/features/posts/api/posts.api'
import type { Post } from '@/shared/types/social'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const selectedPost = ref<Post | null>(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const errorMessage = ref('')

  async function fetchPosts() {
    isLoading.value = true
    errorMessage.value = ''
    try {
      posts.value = await fetchPostsApi()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Cannot load feed right now.'
    } finally {
      isLoading.value = false
    }
  }

  async function createPost(payload: CreatePostInput) {
    if (!Array.isArray(payload.media) || payload.media.length === 0) {
      throw new Error('Post must include at least one media item.')
    }

    errorMessage.value = ''
    try {
      const newPost = await createPostApi(payload)
      posts.value = [newPost, ...posts.value]
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Cannot create post right now.'
      throw error
    }
  }

  async function fetchPostDetail(postId: string) {
    isDetailLoading.value = true
    errorMessage.value = ''

    try {
      selectedPost.value = await fetchPostDetailApi(postId)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Cannot load post detail right now.'
      throw error
    } finally {
      isDetailLoading.value = false
    }
  }

  return {
    posts,
    selectedPost,
    isLoading,
    isDetailLoading,
    errorMessage,
    fetchPosts,
    createPost,
    fetchPostDetail,
  }
})
