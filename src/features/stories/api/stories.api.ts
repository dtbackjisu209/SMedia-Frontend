import { http } from '@/shared/api/http'

export interface ModerationResult {
  status: 'SAFE' | 'WARNING' | 'VIOLATION'
  reason: string
  category: string
}

export const storiesApi = {
  moderateContent(content: string) {
    return http.post<{ data: ModerationResult }>('/story/moderate', { content })
  },
  createStory(formData: FormData) {
    return http.post('/story', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}
