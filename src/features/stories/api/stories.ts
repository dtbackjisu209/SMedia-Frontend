import { http } from '@/shared/api/http'

export interface Story {
  id: string
  media_url: string
  caption?: string
  created_at: string
  type: 'image' | 'video'
}

export interface UserStories {
  userId: string
  username: string
  avatar_url: string
  stories: Story[]
}

export const storiesApi = {

  getFeed: async (): Promise<UserStories[]> => {
    const { data } = await http.get('/stories/feed')
    return data.data
  },


  uploadStory: async (file: File, params?: { content?: string; location?: string }, onProgress?: (percent: number) => void): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file) 
    
    if (params?.content) formData.append('content', params.content)
    if (params?.location) formData.append('location', params.location)

    const { data } = await http.post('/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
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
