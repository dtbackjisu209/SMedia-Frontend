import { http } from '@/shared/api/http'

export type FollowActionMode =
  | 'followed'
  | 'requested'
  | 'unfollowed'
  | 'cancelled_request'
  | 'accepted'
  | 'rejected'

export async function followUser(targetUserId: number) {
  const res = await http.post('/follow', { targetUserId })
  return res.data.data as { mode: FollowActionMode; followStatus: 'following' | 'pending' | 'none' }
}

export async function unfollowUser(targetUserId: number) {
  const res = await http.delete('/follow', { data: { targetUserId } })
  return res.data.data as { mode: FollowActionMode; followStatus: 'following' | 'pending' | 'none' }
}

export async function getMyFollowing(userId: number) {
  const res = await http.get(`/users/${userId}/following`, { params: { page: 1, limit: 100 } })
  return res.data.data.items as Array<{ id: string | number }>
}
