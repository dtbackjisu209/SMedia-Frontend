import { defineStore } from 'pinia'
import { ref } from 'vue'
import { followUser, unfollowUser, getMyFollowing } from '../api/follow.api'

export const useFollowStore = defineStore('follow', () => {
  const followingIds = ref<Set<number>>(new Set())
  const pendingIds = ref<Set<number>>(new Set())

  async function loadMyFollowing(meId: number) {
    const items = await getMyFollowing(meId)
    followingIds.value = new Set(items.map(i => Number(i.id)))
  }

  function isFollowing(userId: number) {
    return followingIds.value.has(userId)
  }

  function isPending(userId: number) {
    return pendingIds.value.has(userId)
  }

  async function toggleFollow(targetUserId: number) {
    if (isFollowing(targetUserId)) {
      await unfollowUser(targetUserId)
      followingIds.value.delete(targetUserId)
      pendingIds.value.delete(targetUserId)
      return
    }

    const result = await followUser(targetUserId)
    if (result.mode === 'requested') pendingIds.value.add(targetUserId)
    if (result.mode === 'followed') {
      followingIds.value.add(targetUserId)
      pendingIds.value.delete(targetUserId)
    }
  }

  return { followingIds, pendingIds, loadMyFollowing, isFollowing, isPending, toggleFollow }
})
