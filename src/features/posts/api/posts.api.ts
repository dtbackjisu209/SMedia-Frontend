import { http } from '@/shared/api/http'
import axios from 'axios'
import type { Post } from '@/shared/types/social'

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
  mediaType?: 'image' | 'video'
  media_type?: 'image' | 'video'
  position?: number
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
  created_at?: string
  author?: BackendAuthor
  media?: BackendMedia[]
  like_count?: number
  comment_count?: number
  is_liked?: boolean
  isLiked?: boolean
  liked_by_me?: boolean
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
  media: Array<{
    media_url: string
    media_type: 'image' | 'video'
    position?: number
  }>
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

function normalizeMedia(media?: BackendMedia[]): Post['media'] {
  if (!Array.isArray(media)) return []

  return media.map((item, index) => ({
    mediaUrl: item.mediaUrl ?? item.media_url ?? '',
    mediaType: item.mediaType ?? item.media_type ?? 'image',
    position: typeof item.position === 'number' ? item.position : index,
  }))
}

function normalizePost(post: BackendPost): Post {
  const normalizedMedia = normalizeMedia(post.media)
  const fallbackThumbnail = normalizedMedia[0]?.mediaUrl ?? ''
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

export async function fetchPostDetailApi(postId: string): Promise<Post> {
  const response = await http.get(`/posts/${postId}`)
  const detailData = unwrapData<BackendPostDetail>(response.data)

  return normalizePost({
    ...detailData,
    thumbnail: detailData.media?.[0]?.media_url ?? detailData.media?.[0]?.mediaUrl ?? '',
    media_count: detailData.media?.length ?? 0,
    tags: [],
  })
}

export async function createPostApi(payload: CreatePostInput): Promise<Post> {
  const response = await http.post('/posts', payload)
  const postData = unwrapData<BackendPost>(response.data)

  return normalizePost({
    ...postData,
    is_liked: postData.is_liked ?? false,
    media: payload.media,
    thumbnail: payload.media[0]?.media_url ?? '',
    media_count: payload.media.length,
  })
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
