<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { followUser, unfollowUser } from '@/features/auth/api/follow.api'
import { getUserProfileApi, type UserProfileItem } from '@/shared/api/users.api'

const route = useRoute()
const authStore = useAuthStore()

const profile = ref<UserProfileItem | null>(null)
const isLoading = ref(false)
const isFollowLoading = ref(false)
const errorMessage = ref('')

const targetUserId = computed(() => Number(route.params.userId ?? 0))
const myUserId = computed(() => Number(authStore.userId ?? 0))
const isMe = computed(() => myUserId.value > 0 && myUserId.value === targetUserId.value)

const followLabel = computed(() => {
  if (!profile.value) return 'Follow'
  if (profile.value.is_following) return 'Following'
  if (profile.value.has_pending_request) return 'Requested'
  return 'Follow'
})

async function loadProfile() {
  if (!targetUserId.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    profile.value = await getUserProfileApi(targetUserId.value)
  } catch (error) {
    profile.value = null
    errorMessage.value = error instanceof Error ? error.message : 'Could not load profile.'
  } finally {
    isLoading.value = false
  }
}

async function onToggleFollow() {
  if (!profile.value || isMe.value || isFollowLoading.value) return

  isFollowLoading.value = true
  errorMessage.value = ''

  try {
    if (profile.value.is_following || profile.value.has_pending_request) {
      await unfollowUser(profile.value.id)
      if (profile.value.is_following && profile.value.follower_count > 0) {
        profile.value.follower_count -= 1
      }
      profile.value.is_following = false
      profile.value.has_pending_request = false
      return
    }

    const result = await followUser(profile.value.id)
    if (result.mode === 'followed') {
      profile.value.is_following = true
      profile.value.has_pending_request = false
      profile.value.follower_count += 1
      return
    }

    if (result.mode === 'requested') {
      profile.value.has_pending_request = true
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not update follow status.'
  } finally {
    isFollowLoading.value = false
  }
}

onMounted(loadProfile)
watch(targetUserId, loadProfile)
</script>

<template>
  <section class="profile-page">
    <p v-if="isLoading" class="muted">Loading profile...</p>
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

    <article v-else-if="profile" class="card profile-card">
      <header class="profile-head">
        <span class="avatar">{{ profile.username[0]?.toUpperCase() }}</span>
        <div class="meta">
          <h2>@{{ profile.username }}</h2>
          <p class="muted">{{ profile.full_name || 'No full name' }}</p>
          <p class="muted">Joined {{ dayjs(profile.created_at).format('DD/MM/YYYY') }}</p>
        </div>
        <button
          v-if="!isMe"
          class="button secondary follow-btn"
          type="button"
          :disabled="isFollowLoading"
          @click="onToggleFollow"
        >
          {{ isFollowLoading ? 'Loading...' : followLabel }}
        </button>
      </header>

      <section class="stats">
        <div class="stat">
          <strong>{{ profile.follower_count }}</strong>
          <span>Followers</span>
        </div>
        <div class="stat">
          <strong>{{ profile.following_count }}</strong>
          <span>Following</span>
        </div>
        <div class="stat">
          <strong>{{ profile.is_private ? 'Private' : 'Public' }}</strong>
          <span>Account</span>
        </div>
      </section>
    </article>
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 12px;
}

.profile-card {
  padding: 18px;
}

.profile-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
}

.avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 700;
  background: #f2f2f2;
}

.meta h2 {
  margin: 0;
}

.meta p {
  margin: 4px 0 0;
}

.follow-btn {
  width: auto;
  padding-inline: 14px;
}

.stats {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}

.stat {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  display: grid;
  gap: 2px;
  min-width: 120px;
}

.stat strong {
  font-size: 18px;
}

.stat span {
  color: var(--muted);
  font-size: 12px;
}

.error {
  color: var(--danger);
  margin: 0;
}

@media (max-width: 900px) {
  .profile-head {
    grid-template-columns: 1fr;
  }
}
</style>

