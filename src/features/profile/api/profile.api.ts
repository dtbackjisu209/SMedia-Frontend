import { http } from '@/shared/api/http'
import type {
  ProfilePasswordPayload,
  ProfileSearchUser,
  ProfileUpdatePayload,
  ProfileView,
} from '../types/profile'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

export async function searchProfileUsers(query: string, limit = 8) {
  const response = await http.get<ApiEnvelope<ProfileSearchUser[]>>('/profile/search', {
    params: { q: query, limit },
  })

  return response.data.data
}

export async function getProfileView(userId: number | string) {
  const response = await http.get<ApiEnvelope<ProfileView>>(`/profile/users/${userId}`)
  return response.data.data
}

export async function updateMyProfile(payload: ProfileUpdatePayload) {
  const response = await http.patch<ApiEnvelope<ProfileView>>('/profile/me', payload)
  return response.data.data
}

export async function changeMyPassword(payload: ProfilePasswordPayload) {
  const response = await http.patch<ApiEnvelope<unknown>>('/profile/me/password', payload)
  return response.data.message ?? 'Password updated successfully'
}
