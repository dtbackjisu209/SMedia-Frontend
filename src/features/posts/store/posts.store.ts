import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import router from '@/app/router'
import {
  createPostApi,
  deletePostApi,
  fetchPostDetailApi,
  fetchPostsApi,
  likePostApi,
  unlikePostApi,
  updatePostApi,
  type CreatePostInput,
  type UpdatePostInput,
} from '@/features/posts/api/posts.api'
import { ROUTE_PATHS } from '@/shared/constants/routes'
import type { Post } from '@/shared/types/social'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const selectedPost = ref<Post | null>(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const errorMessage = ref('')
  const likeActionError = ref('')
  const updateActionError = ref('')
  const deleteActionError = ref('')
  const likeLoadingPostIds = ref<Set<string>>(new Set())
  const deletingPostIds = ref<Set<string>>(new Set())
  const isUpdating = ref(false)

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

  function setDeleteLoading(postId: string, isLoadingState: boolean) {
    const next = new Set(deletingPostIds.value)
    if (isLoadingState) {
      next.add(postId)
    } else {
      next.delete(postId)
    }
    deletingPostIds.value = next
  }

  function isLikeLoading(postId: string): boolean {
    return likeLoadingPostIds.value.has(postId)
  }

  function isDeleteLoading(postId: string): boolean {
    return deletingPostIds.value.has(postId)
  }

  function removePostById(postId: string) {
    posts.value = posts.value.filter((post) => post.id !== postId)

    if (selectedPost.value?.id === postId) {
      selectedPost.value = null
    }
  }

  async function resolveActionMessage(error: unknown, fallbackMessage: string): Promise<string> {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const backendMessage =
        typeof error.response?.data === 'object' && error.response?.data
          ? String((error.response.data as { message?: string }).message ?? '')
          : ''

      if (status === 400) {
        return backendMessage || fallbackMessage
      }

      if (status === 401) {
        await router.push(ROUTE_PATHS.login)
        return 'Phien dang nhap da het han. Vui long dang nhap lai.'
      }

      if (status === 403) {
        return 'Ban chi co the sua/xoa bai viet cua minh.'
      }

      if (status === 404) {
        return 'Bai viet khong con ton tai.'
      }

      if (typeof status === 'number' && status >= 500) {
        return 'Co loi he thong, vui long thu lai.'
      }

      return backendMessage || fallbackMessage
    }

    return error instanceof Error ? error.message : fallbackMessage
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
      errorMessage.value = await resolveActionMessage(error, 'Khong the tai chi tiet bai viet luc nay.')
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

  async function updatePost(postId: string, payload: UpdatePostInput) {
    if (isUpdating.value) return null

    isUpdating.value = true
    updateActionError.value = ''

    try {
      const updatedPost = await updatePostApi(postId, payload)
      updatePostById(postId, (post) => ({
        ...post,
        ...updatedPost,
        media: updatedPost.media.length > 0 ? updatedPost.media : post.media,
      }))

      if (selectedPost.value?.id === postId) {
        selectedPost.value = {
          ...selectedPost.value,
          ...updatedPost,
          media: updatedPost.media.length > 0 ? updatedPost.media : selectedPost.value.media,
        }
      }

      return updatedPost
    } catch (error) {
      updateActionError.value = await resolveActionMessage(error, 'Khong the cap nhat bai viet ngay bay gio.')
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  async function deletePost(postId: string) {
    if (isDeleteLoading(postId)) return null

    setDeleteLoading(postId, true)
    deleteActionError.value = ''

    try {
      const result = await deletePostApi(postId)
      removePostById(postId)
      return result
    } catch (error) {
      deleteActionError.value = await resolveActionMessage(error, 'Khong the xoa bai viet ngay bay gio.')
      throw error
    } finally {
      setDeleteLoading(postId, false)
    }
  }

  return {
    posts,
    selectedPost,
    isLoading,
    isDetailLoading,
    errorMessage,
    likeActionError,
    updateActionError,
    deleteActionError,
    likeLoadingPostIds,
    deletingPostIds,
    isUpdating,
    fetchPosts,
    createPost,
    fetchPostDetail,
    togglePostLike,
    updatePost,
    deletePost,
    isLikeLoading,
    isDeleteLoading,
  }
})
