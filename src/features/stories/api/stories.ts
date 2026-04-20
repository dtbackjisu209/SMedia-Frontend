import { http } from '@/shared/api/http'

export interface Story {
  id: string
  media_url: string
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


  uploadStory: async (file: File, params?: { caption?: string; location?: string }, onProgress?: (percent: number) => void): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file) 
    
    if (params?.caption) formData.append('caption', params.caption)
    if (params?.location) formData.append('location', params.location)

    await http.post('/stories', formData, {
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
  }
}
