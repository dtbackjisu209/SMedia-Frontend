import { http } from '@/shared/api/http'
import axios from 'axios'
import type { Post, CommentItem } from '@/shared/types/social'

interface BackendAuthor {
  id?: string | number
  username?: string
  fullName?: string | null
  full_name?: string | null
  avatarUrl?: string | null
  avatar_url?: string | null
}

interface BackendMedia {
  mediaUrl?: string
  media_url?: string
  secure_url?: string
  url?: string
  file_url?: string
  mediaType?: 'image' | 'video'
  media_type?: 'image' | 'video'
  type?: string
  resource_type?: string
  mimeType?: string
  mime_type?: string
  position?: number
  order?: number
  index?: number
  media?: BackendMedia
}

interface BackendPost {
  id?: string | number
  caption?: string | null
  location?: string | null
  createdAt?: string
  created_at?: string
  author?: BackendAuthor
  like_count?: number
  comment_count?: number
  tags?: string[]
  thumbnail?: string
  media_count?: number
  media?: BackendMedia[]
  medias?: BackendMedia[]
  post_media?: BackendMedia[]
  postMedias?: BackendMedia[]
  is_liked?: boolean
  isLiked?: boolean
  liked_by_me?: boolean
}

interface BackendFeedResult {
  items?: BackendPost[]
}

interface BackendPostDetail {
  id?: string | number
  caption?: string | null
  location?: string | null
  tags?: string[]
  created_at?: string
  author?: BackendAuthor
  media?: BackendMedia[]
  medias?: BackendMedia[]
  post_media?: BackendMedia[]
  postMedias?: BackendMedia[]
  like_count?: number
  comment_count?: number
  is_liked?: boolean
  isLiked?: boolean
  liked_by_me?: boolean
  // Embedded comments from ?commentLimit=N
  comments?: CommentItem[]
  comments_next_cursor?: number | null
}

interface PostLikeApiResult {
  liked?: boolean
  unliked?: boolean
}

interface UploadSignaturePayload {
  cloudName: string
  apiKey: string
  folder: string
  timestamp: number
  signature: string
}

export interface UploadedMedia {
  media_url: string
  media_type: 'image' | 'video'
}

export interface CreatePostInput {
  caption?: string
  location?: string
  tags?: string[]
  media: Array<{
    media_url: string
    media_type: 'image' | 'video'
    position?: number
  }>
}

export interface UpdatePostInput {
  caption?: string
  location?: string
  tags?: string[]
}

interface UpdatePostResponse {
  post?: BackendPost
}

interface DeletePostResponse {
  deleted?: boolean
  postId?: number | string
  cleanupStatus?: 'queued' | 'queue_failed'
}

export interface DeletePostResult {
  deleted: boolean
  postId: string
  cleanupStatus: 'queued' | 'queue_failed'
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function normalizeAuthor(author?: BackendAuthor): Post['author'] {
  return {
    id: String(author?.id ?? ''),
    username: author?.username ?? '',
    fullName: author?.fullName ?? author?.full_name ?? '',
    avatarUrl: author?.avatarUrl ?? author?.avatar_url ?? '',
  }
}

function inferMediaTypeFromUrl(url: string): 'image' | 'video' {
  const normalized = url.toLowerCase()
  if (/(\.mp4|\.mov|\.webm|\.m4v|\.m3u8|\.avi|\.wmv|\.mkv)(\?|$)/.test(normalized)) {
    return 'video'
  }

  return 'image'
}

function resolveMediaUrl(item: BackendMedia): string {
  return item.mediaUrl ?? item.media_url ?? item.secure_url ?? item.url ?? item.file_url ?? ''
}

function resolveMediaType(item: BackendMedia, mediaUrl: string): 'image' | 'video' {
  const rawType =
    item.mediaType ?? item.media_type ?? item.type ?? item.resource_type ?? item.mimeType ?? item.mime_type ?? ''
  const normalizedType = String(rawType).toLowerCase()

  if (normalizedType.includes('video')) return 'video'
  if (normalizedType.includes('image')) return 'image'

  return inferMediaTypeFromUrl(mediaUrl)
}

function resolvePosition(item: BackendMedia, index: number): number {
  if (typeof item.position === 'number') return item.position
  if (typeof item.order === 'number') return item.order
  if (typeof item.index === 'number') return item.index

  const rawPosition = (item as { position?: string }).position
  const parsed = Number(rawPosition)
  return Number.isFinite(parsed) ? parsed : index
}

function extractPostMedia(post: BackendPost | BackendPostDetail): BackendMedia[] {
  if (Array.isArray(post.media)) return post.media
  if (Array.isArray(post.medias)) return post.medias
  if (Array.isArray(post.post_media)) return post.post_media
  if (Array.isArray(post.postMedias)) return post.postMedias
  return []
}

function normalizeMedia(media?: BackendMedia[]): Post['media'] {
  if (!Array.isArray(media)) return []

  return media
    .map((item, index) => {
      const base = item?.media ? item.media : item
      const mediaUrl = resolveMediaUrl(base)
      if (!mediaUrl) return null

      return {
        mediaUrl,
        mediaType: resolveMediaType(base, mediaUrl),
        position: resolvePosition(base, index),
      }
    })
    .filter((item): item is Post['media'][number] => Boolean(item))
}

function normalizePost(post: BackendPost): Post {
  let normalizedMedia = normalizeMedia(extractPostMedia(post))

  if (normalizedMedia.length === 0 && post.thumbnail) {
    normalizedMedia = [
      {
        mediaUrl: post.thumbnail,
        mediaType: inferMediaTypeFromUrl(post.thumbnail),
        position: 0,
      },
    ]
  }

  // Use first image as thumbnail, not first media (could be video)
  const fallbackThumbnail =
    normalizedMedia.find((m) => m.mediaType === 'image')?.mediaUrl ?? ''
  const isLiked =
    typeof post.is_liked === 'boolean'
      ? post.is_liked
      : typeof post.isLiked === 'boolean'
        ? post.isLiked
        : typeof post.liked_by_me === 'boolean'
          ? post.liked_by_me
          : false

  return {
    id: String(post.id ?? ''),
    caption: post.caption ?? '',
    location: post.location ?? '',
    createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
    author: normalizeAuthor(post.author),
    isLiked,
    likeCount: Number(post.like_count ?? 0),
    commentCount: Number(post.comment_count ?? 0),
    tags: Array.isArray(post.tags) ? post.tags : [],
    thumbnail: post.thumbnail ?? fallbackThumbnail,
    mediaCount: Number(post.media_count ?? normalizedMedia.length),
    media: normalizedMedia,
  }
}

export async function fetchPostsApi(): Promise<Post[]> {
  const response = await http.get('/posts/feed')
  const feedData = unwrapData<BackendFeedResult | BackendPost[]>(response.data)
  const items = Array.isArray(feedData) ? feedData : feedData?.items ?? []
  return items.map(normalizePost)
}

export interface PostDetailResult {
  post: Post
  initialComments: CommentItem[]
  commentsNextCursor: number | null
}

export async function fetchPostDetailApi(postId: string): Promise<PostDetailResult> {
  const response = await http.get(`/posts/${postId}`, {
    params: { commentLimit: 20 },
  })
  const detailData = unwrapData<BackendPostDetail>(response.data)

  // Use first image as thumbnail, not first media
  const normalizedMedia = normalizeMedia(extractPostMedia(detailData))
  const imageMedia = normalizedMedia.find((m) => m.mediaType === 'image')
  const thumbnailUrl = imageMedia?.mediaUrl ?? ''

  const post = normalizePost({
    ...detailData,
    media: extractPostMedia(detailData),
    thumbnail: thumbnailUrl,
    media_count: normalizedMedia.length,
    tags: Array.isArray(detailData.tags) ? detailData.tags : [],
  })

  return {
    post,
    initialComments: Array.isArray(detailData.comments) ? detailData.comments : [],
    commentsNextCursor: detailData.comments_next_cursor ?? null,
  }
}

export async function createPostApi(payload: CreatePostInput): Promise<Post> {
  const response = await http.post('/posts', payload)
  const postData = unwrapData<BackendPost>(response.data)

  // Use first image as thumbnail, not first media
  const thumbnailUrl =
    payload.media.find((m) => m.media_type === 'image')?.media_url ?? ''

  return normalizePost({
    ...postData,
    is_liked: postData.is_liked ?? false,
    media: payload.media,
    thumbnail: thumbnailUrl,
    media_count: payload.media.length,
  })
}

function resolveUpdatedPostPayload(payload: unknown): BackendPost {
  const data = unwrapData<BackendPost | UpdatePostResponse>(payload)
  if (data && typeof data === 'object' && 'post' in data) {
    return (data as UpdatePostResponse).post ?? {}
  }

  return data as BackendPost
}

export async function updatePostApi(postId: string, payload: UpdatePostInput): Promise<Post> {
  const response = await http.patch(`/posts/${postId}`, payload)
  const updatedPost = resolveUpdatedPostPayload(response.data)

  return normalizePost(updatedPost)
}

export async function deletePostApi(postId: string): Promise<DeletePostResult> {
  const response = await http.delete(`/posts/${postId}`)
  const data = unwrapData<DeletePostResponse>(response.data)

  return {
    deleted: Boolean(data?.deleted),
    postId: String(data?.postId ?? postId),
    cleanupStatus: data?.cleanupStatus === 'queue_failed' ? 'queue_failed' : 'queued',
  }
}

export async function likePostApi(postId: string): Promise<{ liked: boolean }> {
  const response = await http.post(`/post-likes/${postId}`)
  const result = unwrapData<PostLikeApiResult>(response.data)
  return { liked: Boolean(result?.liked) }
}

export async function unlikePostApi(postId: string): Promise<{ unliked: boolean }> {
  const response = await http.delete(`/post-likes/${postId}`)
  const result = unwrapData<PostLikeApiResult>(response.data)
  return { unliked: Boolean(result?.unliked) }
}

export async function getUploadSignatureApi(): Promise<UploadSignaturePayload> {
  const response = await http.get('/posts/upload-signature')
  return unwrapData<UploadSignaturePayload>(response.data)
}

function inferMediaType(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image'
}

export async function uploadFilesToCloudinary(files: File[]): Promise<UploadedMedia[]> {
  if (files.length === 0) return []

  const signatureData = await getUploadSignatureApi()

  const uploads = files.map(async (file) => {
    const mediaType = inferMediaType(file)
    const resourceType = mediaType === 'video' ? 'video' : 'image'
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${resourceType}/upload`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', signatureData.apiKey)
    formData.append('timestamp', String(signatureData.timestamp))
    formData.append('signature', signatureData.signature)
    formData.append('folder', signatureData.folder)

    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const secureUrl = (response.data as { secure_url?: string }).secure_url
      if (!secureUrl) {
        throw new Error('Cloud upload returned empty secure_url.')
      }

      return {
        media_url: secureUrl,
        media_type: mediaType,
      } satisfies UploadedMedia
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
          error.message
        throw new Error(`Upload failed for ${file.name}: ${message}`)
      }

      throw error instanceof Error ? error : new Error(`Upload failed for ${file.name}`)
    }
  })

  return Promise.all(uploads)
}
