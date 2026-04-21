import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createPostApi,
  fetchPostDetailApi,
  fetchPostsApi,
  likePostApi,
  unlikePostApi,
  type CreatePostInput,
} from '@/features/posts/api/posts.api'
import type { Post } from '@/shared/types/social'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const selectedPost = ref<Post | null>(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const errorMessage = ref('')
  const likeActionError = ref('')
  const likeLoadingPostIds = ref<Set<string>>(new Set())

  function updatePostById(postId: string, updater: (post: Post) => Post) {
    posts.value = posts.value.map((post) => (post.id === postId ? updater(post) : post))

    if (selectedPost.value?.id === postId) {
      selectedPost.value = updater(selectedPost.value)
    }
  }

  function setLikeLoading(postId: string, isLoadingState: boolean) {
    const next = new Set(likeLoadingPostIds.value)
    if (isLoadingState) {
      next.add(postId)
    } else {
      next.delete(postId)
    }
    likeLoadingPostIds.value = next
  }

  function isLikeLoading(postId: string): boolean {
    return likeLoadingPostIds.value.has(postId)
  }

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

  async function togglePostLike(postId: string, isCurrentlyLiked: boolean) {
    if (isLikeLoading(postId)) return

    likeActionError.value = ''
    setLikeLoading(postId, true)

    try {
      if (isCurrentlyLiked) {
        const result = await unlikePostApi(postId)

        updatePostById(postId, (post) => {
          const nextLikeCount = result.unliked ? Math.max(0, post.likeCount - 1) : post.likeCount
          return {
            ...post,
            isLiked: false,
            likeCount: nextLikeCount,
          }
        })

        return
      }

      const result = await likePostApi(postId)

      updatePostById(postId, (post) => {
        const nextLikeCount = result.liked ? post.likeCount + 1 : post.likeCount
        return {
          ...post,
          isLiked: true,
          likeCount: nextLikeCount,
        }
      })
    } catch (error) {
      likeActionError.value = error instanceof Error ? error.message : 'Like action failed.'
      throw error
    } finally {
      setLikeLoading(postId, false)
    }
  }

  return {
    posts,
    selectedPost,
    isLoading,
    isDetailLoading,
    errorMessage,
    likeActionError,
    likeLoadingPostIds,
    fetchPosts,
    createPost,
    fetchPostDetail,
    togglePostLike,
    isLikeLoading,
  }
})
