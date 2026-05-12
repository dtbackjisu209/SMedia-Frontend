import { http } from '@/shared/api/http'
import type { CommentItem } from '@/shared/types/social'

// ─── Response shapes ────────────────────────────────────────────────────────

interface ApiWrapper<T> {
  message: string
  status: number
  data: T
}

interface GetCommentsData {
  comments: CommentItem[]
  nextCursor: number | null
}

interface CreateCommentData {
  id: number
  post_id: number
  user_id: number
  content: string
  parent_id: number | null
  created_at: string
}

interface DeleteCommentData {
  deleted: boolean
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface GetCommentsResult {
  comments: CommentItem[]
  nextCursor: number | null
}

export interface CreateCommentResult {
  id: number
  post_id: number
  user_id: number
  content: string
  parent_id: number | null
  created_at: string
}

// ─── API functions ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/comments/:postId
 * Auth: not required
 * Returns cursor-paginated comments (sorted ASC by id).
 */
export async function fetchCommentsApi(
  postId: string | number,
  params?: { limit?: number; cursor?: number },
): Promise<GetCommentsResult> {
  const query: Record<string, string> = {}
  if (params?.limit != null) query['limit'] = String(params.limit)
  if (params?.cursor != null) query['cursor'] = String(params.cursor)

  const response = await http.get<ApiWrapper<GetCommentsData>>(`/comments/${postId}`, {
    params: query,
  })

  const data = response.data?.data
  return {
    comments: Array.isArray(data?.comments) ? data.comments : [],
    nextCursor: data?.nextCursor ?? null,
  }
}

/**
 * POST /api/v1/comments/:postId
 * Auth: required
 * Creates a new comment. Response does NOT include username/full_name/avatar_url —
 * caller is responsible for composing the full CommentItem from current user session.
 */
export async function createCommentApi(
  postId: string | number,
  content: string,
  parentId?: number,
): Promise<CreateCommentResult> {
  const body: { content: string; parentId?: number } = { content }
  if (parentId != null) body.parentId = parentId

  const response = await http.post<ApiWrapper<CreateCommentData>>(`/comments/${postId}`, body)
  return response.data.data
}

/**
 * DELETE /api/v1/comments/:commentId
 * Auth: required
 * Deletes the comment. Only the owner can delete.
 */
export async function deleteCommentApi(commentId: number): Promise<boolean> {
  const response = await http.delete<ApiWrapper<DeleteCommentData>>(`/comments/${commentId}`)
  return response.data?.data?.deleted === true
}
