import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import axios from 'axios'
import { fetchCommentsApi, createCommentApi, deleteCommentApi } from '@/features/posts/api/comments.api'
import type { CommentItem } from '@/shared/types/social'

/**
 * Per-post comment state — keyed by postId string.
 * Dùng reactive() để Vue track thay đổi nested property chính xác.
 */
interface PostCommentState {
  comments: CommentItem[]
  nextCursor: number | null
  isLoading: boolean
  isLoadingMore: boolean
  isSending: boolean
  errorMessage: string
  initialized: boolean
}

function createInitialState(): PostCommentState {
  return {
    comments: [],
    nextCursor: null,
    isLoading: false,
    isLoadingMore: false,
    isSending: false,
    errorMessage: '',
    initialized: false,
  }
}

export const useCommentsStore = defineStore('comments', () => {
  // reactive() để Vue track thay đổi nested (state.comments = [...]) đúng cách
  const stateMap = reactive<Record<string, PostCommentState>>({})
  const deletingCommentIds = ref<Set<number>>(new Set())

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function ensureState(postId: string): PostCommentState {
    if (!stateMap[postId]) {
      stateMap[postId] = createInitialState()
    }
    return stateMap[postId]
  }

  function getState(postId: string): PostCommentState | null {
    return stateMap[postId] ?? null
  }

  function setDeletingComment(commentId: number, loading: boolean) {
    const next = new Set(deletingCommentIds.value)
    loading ? next.add(commentId) : next.delete(commentId)
    deletingCommentIds.value = next
  }

  function isDeletingComment(commentId: number): boolean {
    return deletingCommentIds.value.has(commentId)
  }

  async function resolveErrorMessage(error: unknown, fallback: string): Promise<string> {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const msg =
        typeof error.response?.data === 'object' && error.response?.data
          ? String((error.response.data as { message?: string }).message ?? '')
          : ''

      if (status === 401) return 'Vui lòng đăng nhập để bình luận.'
      if (status === 403) return 'Bạn không có quyền thực hiện hành động này.'
      if (status === 404) return 'Bình luận không tồn tại.'
      if (msg) return msg
      if (typeof status === 'number' && status >= 500) return 'Lỗi hệ thống, vui lòng thử lại.'
    }
    return error instanceof Error ? error.message : fallback
  }

  // ─── Seed initial comments from post detail response ──────────────────────

  function seedComments(
    postId: string,
    comments: CommentItem[],
    nextCursor: number | null,
  ) {
    const state = ensureState(postId)
    state.comments = comments
    state.nextCursor = nextCursor
    state.initialized = true
    state.errorMessage = ''
  }

  // ─── Fetch first page ─────────────────────────────────────────────────────

  async function fetchComments(postId: string, limit = 20) {
    const state = ensureState(postId)
    if (state.isLoading) return

    state.isLoading = true
    state.errorMessage = ''

    try {
      const result = await fetchCommentsApi(postId, { limit })
      state.comments = result.comments
      state.nextCursor = result.nextCursor
      state.initialized = true
    } catch (error) {
      state.errorMessage = await resolveErrorMessage(error, 'Không thể tải bình luận lúc này.')
    } finally {
      state.isLoading = false
    }
  }

  // ─── Load more (append) ───────────────────────────────────────────────────

  async function loadMoreComments(postId: string, limit = 20) {
    const state = ensureState(postId)
    if (state.isLoadingMore || state.nextCursor === null) return

    state.isLoadingMore = true
    state.errorMessage = ''

    try {
      const result = await fetchCommentsApi(postId, { limit, cursor: state.nextCursor })
      state.comments = [...state.comments, ...result.comments]
      state.nextCursor = result.nextCursor
    } catch (error) {
      state.errorMessage = await resolveErrorMessage(error, 'Không thể tải thêm bình luận.')
    } finally {
      state.isLoadingMore = false
    }
  }

  // ─── Create comment ───────────────────────────────────────────────────────

  async function createComment(
    postId: string,
    content: string,
    currentUser: { id: string | number; username: string; fullName: string; avatarUrl?: string | null },
    parentId?: number,
  ): Promise<CommentItem | undefined> {
    const state = ensureState(postId)
    if (state.isSending) return undefined

    state.isSending = true
    state.errorMessage = ''

    try {
      const result = await createCommentApi(postId, content, parentId)

      const newComment: CommentItem = {
        ...result,
        username: currentUser.username,
        full_name: currentUser.fullName,
        avatar_url: currentUser.avatarUrl ?? null,
      }

      state.comments = [...state.comments, newComment]
      return newComment
    } catch (error) {
      state.errorMessage = await resolveErrorMessage(error, 'Không thể gửi bình luận.')
      throw error
    } finally {
      state.isSending = false
    }
  }

  // ─── Delete comment ───────────────────────────────────────────────────────

  async function deleteComment(postId: string, commentId: number): Promise<void> {
    if (isDeletingComment(commentId)) return

    const state = ensureState(postId)
    setDeletingComment(commentId, true)
    state.errorMessage = ''

    const backup = [...state.comments]
    state.comments = state.comments.filter((c) => c.id !== commentId)

    try {
      await deleteCommentApi(commentId)
    } catch (error) {
      state.comments = backup
      state.errorMessage = await resolveErrorMessage(error, 'Không thể xóa bình luận.')
      throw error
    } finally {
      setDeletingComment(commentId, false)
    }
  }

  // ─── Poll new comments (background refresh) ───────────────────────────────

  async function pollNewComments(postId: string) {
    const state = ensureState(postId)
    if (state.isLoading || state.isLoadingMore) return

    try {
      const result = await fetchCommentsApi(postId, { limit: 20 })
      if (!result.comments.length) return

      const existingIds = new Set(state.comments.map((c) => c.id))
      const incoming = result.comments.filter((c) => !existingIds.has(c.id))
      if (incoming.length > 0) {
        state.comments = [...state.comments, ...incoming]
      }
    } catch {
      // Silently ignore
    }
  }

  // ─── Reset post state ─────────────────────────────────────────────────────

  function resetPostComments(postId: string) {
    // Reset in-place thay vì delete → Vue giữ reactive reference, không mất track
    if (stateMap[postId]) {
      Object.assign(stateMap[postId], createInitialState())
    } else {
      stateMap[postId] = createInitialState()
    }
  }

  // ─── Append from socket (dedup by id) ────────────────────────────────────

  function appendCommentIfNew(postId: string, comment: CommentItem) {
    const state = ensureState(postId)
    const alreadyExists = state.comments.some((c) => c.id === comment.id)
    if (!alreadyExists) {
      state.comments = [...state.comments, comment]
    }
  }

  return {
    stateMap,
    deletingCommentIds,
    getState,
    seedComments,
    fetchComments,
    loadMoreComments,
    createComment,
    deleteComment,
    pollNewComments,
    isDeletingComment,
    resetPostComments,
    appendCommentIfNew,
  }
})
