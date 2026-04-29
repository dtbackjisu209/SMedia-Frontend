<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { followUser, unfollowUser } from '@/features/auth/api/follow.api'
import {
  changeMyPassword,
  getProfileView,
  updateMyProfile,
} from '../api/profile.api'
import ProfileEditDialog from '../components/ProfileEditDialog.vue'
import ProfileHeroCard from '../components/ProfileHeroCard.vue'
import ProfilePostGrid from '../components/ProfilePostGrid.vue'
import type {
  ProfilePasswordPayload,
  ProfileUpdatePayload,
  ProfileView,
} from '../types/profile'
import { getCurrentViewerId, normalizeViewerId } from '../utils/session'

const props = defineProps<{
  userId?: string | number | null
}>()

const route = useRoute()

const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const profile = ref<ProfileView | null>(null)
const editOpen = ref(false)
const followLoading = ref(false)

const viewerId = ref<number | null>(normalizeViewerId(getCurrentViewerId()))

const resolvedUserId = computed(() => {
  const fromProp = normalizeViewerId(props.userId)
  if (fromProp) return fromProp

  const routeValue = normalizeViewerId(route.params.userId)
  if (routeValue) return routeValue

  return viewerId.value
})

const isOwnProfile = computed(() => {
  const currentViewerId = normalizeViewerId(viewerId.value)
  const currentProfileId = normalizeViewerId(profile.value?.id)
  if (!currentViewerId || !currentProfileId) return false
  return currentProfileId === currentViewerId
})

async function loadProfile() {
  if (!resolvedUserId.value) {
    errorMessage.value = 'No user id was provided for the standalone profile page.'
    profile.value = null
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    profile.value = await getProfileView(resolvedUserId.value)
  } catch (error) {
    console.error('[profile-standalone] loadProfile failed', error)
    errorMessage.value = 'Could not load profile right now.'
    profile.value = null
  } finally {
    loading.value = false
  }
}

async function handleSaveProfile(payload: ProfileUpdatePayload) {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    profile.value = await updateMyProfile(payload)
    successMessage.value = 'Profile updated successfully.'
    editOpen.value = false
  } catch (error) {
    console.error('[profile-standalone] updateMyProfile failed', error)
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message || 'Could not save profile changes.'
    } else {
      errorMessage.value = 'Could not save profile changes.'
    }
  } finally {
    saving.value = false
  }
}

async function handleChangePassword(payload: ProfilePasswordPayload) {
  changingPassword.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const message = await changeMyPassword(payload)
    successMessage.value = message
    editOpen.value = false
  } catch (error) {
    console.error('[profile-standalone] changeMyPassword failed', error)
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message || 'Could not change password.'
    } else {
      errorMessage.value = 'Could not change password.'
    }
  } finally {
    changingPassword.value = false
  }
}

async function handleToggleFollow() {
  if (!profile.value || isOwnProfile.value || followLoading.value) return

  const targetId = Number(profile.value.id);
  if (isNaN(targetId)) {
    errorMessage.value = 'Invalid profile id.'
    return
  }
  followLoading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    if (profile.value.is_following || profile.value.has_pending_request) {
      const wasFollowing = profile.value.is_following
      await unfollowUser(profile.value.id)
      profile.value = {
        ...profile.value,
        is_following: false,
        has_pending_request: false,
        follower_count: wasFollowing
          ? Math.max(0, profile.value.follower_count - 1)
          : profile.value.follower_count,
      }
      successMessage.value = wasFollowing ? 'Unfollowed successfully.' : 'Follow request cancelled.'
      return
    }

    const result = await followUser(profile.value.id)

    if (result.mode === 'followed') {
      profile.value = {
        ...profile.value,
        is_following: true,
        has_pending_request: false,
        follower_count: profile.value.follower_count + 1,
      }
      successMessage.value = 'Followed successfully.'
      return
    }

    if (result.mode === 'requested') {
      profile.value = {
        ...profile.value,
        is_following: false,
        has_pending_request: true,
      }
      successMessage.value = 'Follow request sent.'
    }
  } catch (error) {
    console.error('[profile-standalone] handleToggleFollow failed', error)
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message || 'Could not update follow status.'
    } else {
      errorMessage.value = 'Could not update follow status.'
    }
  } finally {
    followLoading.value = false
  }
}

watch(resolvedUserId, () => {
  editOpen.value = false
  successMessage.value = ''
  errorMessage.value = ''
  void loadProfile()
})

onMounted(() => {
  viewerId.value = normalizeViewerId(getCurrentViewerId())
  void loadProfile()
})
</script>

<template>
  <div class="profile-standalone">
    <div v-if="errorMessage" class="profile-standalone__banner profile-standalone__banner--error">
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="profile-standalone__banner profile-standalone__banner--success"
    >
      {{ successMessage }}
    </div>

    <div v-if="loading" class="profile-standalone__loading">
      Loading profile...
    </div>

    <template v-else-if="profile">
      <ProfileHeroCard
        :profile="profile"
        :is-own-profile="isOwnProfile"
        :follow-loading="followLoading"
        @edit-profile="editOpen = true"
        @toggle-follow="handleToggleFollow"
      />

      <ProfilePostGrid class="profile-standalone__posts" :posts="profile.posts" />

      <ProfileEditDialog
        :open="editOpen && isOwnProfile"
        :profile="profile"
        :saving="saving"
        :changing-password="changingPassword"
        @close="editOpen = false"
        @save-profile="handleSaveProfile"
        @change-password="handleChangePassword"
      />
    </template>
  </div>
</template>

<style scoped>
.profile-standalone {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 0.25rem 0 3rem;
}

.profile-standalone__banner {
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  font-weight: 600;
}

.profile-standalone__banner--error {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.profile-standalone__banner--success {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.profile-standalone__loading {
  padding: 2rem;
  border-radius: 1rem;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  color: #475569;
}

.profile-standalone__posts {
  margin-top: 1rem;
}
</style>
