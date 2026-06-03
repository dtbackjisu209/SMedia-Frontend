import axios from 'axios'
import { http } from '@/shared/api/http'

export interface Story {
  id: string
  media_url: string
  caption?: string
  created_at: string
  type: 'image' | 'video'
}

export interface MyStoryItem {
  id: number
  media_url: string
  media_type: 'image' | 'video'
  created_at: string
  expires_at: string
}

export interface UserActiveStoryItem {
  id: number
  media_url: string
  media_type: 'image' | 'video'
  created_at: string
  expires_at: string
}

export interface StoryHighlightStory {
  id: number
  media_url: string
  media_type: 'image' | 'video'
  created_at: string
  expires_at: string
}

export interface StoryHighlight {
  id: number
  title: string
  cover_media_url: string | null
  created_at: string
  story_count: number
  stories: StoryHighlightStory[]
}

export interface UserStories {
  userId: string
  username: string
  avatar_url: string
  stories: Story[]
}

function buildLegacyStoriesUrl(path: string): string {
  const baseUrl = String(http.defaults.baseURL ?? '').replace(/\/+$/, '')
  const legacyBaseUrl = baseUrl.replace(/\/api\/v1$/i, '/api')
  return `${legacyBaseUrl}${path}`
}

type FallbackMethod = 'get' | 'post' | 'patch' | 'delete'

async function withStoriesFallback<T>(
  request: () => Promise<T>,
  legacyPath: string,
  options?: {
    method?: FallbackMethod
    data?: unknown
  },
): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error
    }

    const token = localStorage.getItem('access_token')
    const legacyResponse = await axios.request<T>({
      baseURL: undefined,
      url: buildLegacyStoriesUrl(legacyPath),
      method: options?.method ?? 'get',
      data: options?.data,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return legacyResponse.data
  }
}

export const storiesApi = {

  getFeed: async (): Promise<UserStories[]> => {
    const data = await withStoriesFallback(
      async () => (await http.get('/stories/feed')).data,
      '/stories/feed',
    )
    return data.data
  },

  getMyHighlights: async (): Promise<StoryHighlight[]> => {
    const data = await withStoriesFallback(
      async () => (await http.get('/stories/highlights/me')).data,
      '/stories/highlights/me',
    )
    return data.data
  },

  getMyStories: async (): Promise<MyStoryItem[]> => {
    const data = await withStoriesFallback(
      async () => (await http.get('/stories/me')).data,
      '/stories/me',
    )
    return data.data
  },

  getUserStories: async (userId: number | string): Promise<UserActiveStoryItem[]> => {
    const data = await withStoriesFallback(
      async () => (await http.get(`/stories/users/${userId}`)).data,
      `/stories/users/${userId}`,
    )
    return data.data
  },

  createHighlight: async (payload: { title: string; storyIds: Array<number | string> }): Promise<StoryHighlight> => {
    const data = await withStoriesFallback(
      async () => (await http.post('/stories/highlights', payload)).data,
      '/stories/highlights',
      { method: 'post', data: payload },
    )
    return data.data
  },

  updateHighlight: async (highlightId: number, payload: { title: string }): Promise<StoryHighlight> => {
    const data = await withStoriesFallback(
      async () => (await http.patch(`/stories/highlights/${highlightId}`, payload)).data,
      `/stories/highlights/${highlightId}`,
      { method: 'patch', data: payload },
    )
    return data.data
  },

  addStoryToHighlight: async (highlightId: number, storyId: number | string): Promise<StoryHighlight> => {
    const payload = { storyId }
    const data = await withStoriesFallback(
      async () => (await http.post(`/stories/highlights/${highlightId}/stories`, payload)).data,
      `/stories/highlights/${highlightId}/stories`,
      { method: 'post', data: payload },
    )
    return data.data
  },

  removeStoryFromHighlight: async (highlightId: number, storyId: number | string): Promise<StoryHighlight | null> => {
    const data = await withStoriesFallback(
      async () => (await http.delete(`/stories/highlights/${highlightId}/stories/${storyId}`)).data,
      `/stories/highlights/${highlightId}/stories/${storyId}`,
      { method: 'delete' },
    )
    return data.data
  },

  deleteHighlight: async (highlightId: number): Promise<void> => {
    await withStoriesFallback(
      async () => (await http.delete(`/stories/highlights/${highlightId}`)).data,
      `/stories/highlights/${highlightId}`,
      { method: 'delete' },
    )
  },


  uploadStory: async (file: File, params?: { content?: string; location?: string }, onProgress?: (percent: number) => void): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file) 
    
    if (params?.content) formData.append('content', params.content)
    if (params?.location) formData.append('location', params.location)

    const { data } = await http.post('/stories', formData, {
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      }
    })
    return data
  },

  deleteStory: async (id: string): Promise<void> => {
    await http.delete(`/stories/${id}`)
  }
}
