<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { followUser, unfollowUser } from '@/features/auth/api/follow.api'
import {
  changeMyPassword,
  getProfileView,
  updateMyProfile,
} from '../api/profile.api'
import ProfileEditDialog from '../components/ProfileEditDialog.vue'
import ProfileHeroCard from '../components/ProfileHeroCard.vue'
import ProfileHighlightStrip from '../components/ProfileHighlightStrip.vue'
import ProfilePostGrid from '../components/ProfilePostGrid.vue'
import StoryViewer from '@/features/stories/components/StoryViewer.vue'
import StoryHighlightSheet from '@/features/stories/components/StoryHighlightSheet.vue'
import { storiesApi, type MyStoryItem, type StoryHighlight, type UserActiveStoryItem } from '@/features/stories/api/stories'
import { chatApi } from '@/features/chat/api/chat.api'
import type {
  ProfileHighlight,
  ProfilePasswordPayload,
  ProfileUpdatePayload,
  ProfileView,
} from '../types/profile'
import { getCurrentViewerId, normalizeViewerId } from '../utils/session'

const props = defineProps<{
  userId?: string | number | null
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const openingMessage = ref(false)
const profile = ref<ProfileView | null>(null)
const editOpen = ref(false)
const followLoading = ref(false)
const selectedHighlight = ref<ProfileHighlight | null>(null)
const activeStories = ref<UserActiveStoryItem[]>([])
const activeStoryViewerOpen = ref(false)
const highlightSheetOpen = ref(false)
const myStories = ref<MyStoryItem[]>([])
const managingHighlightId = ref<number | null>(null)
const highlightSheetMode = ref<'list' | 'create' | 'edit'>('list')

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
    activeStories.value = []
  } finally {
    loading.value = false
  }

  if (!profile.value) return

  try {
    activeStories.value = await storiesApi.getUserStories(resolvedUserId.value)
  } catch (error) {
    console.error('[profile-standalone] loadActiveStories failed', error)
    activeStories.value = []
  }
}

async function loadMyStoriesForHighlights() {
  if (!isOwnProfile.value) {
    myStories.value = []
    return
  }

  try {
    myStories.value = await storiesApi.getMyStories()
  } catch (error) {
    console.error('[profile-standalone] loadMyStoriesForHighlights failed', error)
  }
}

async function handleSaveProfile(payload: ProfileUpdatePayload) {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    profile.value = await updateMyProfile(payload)
    if (isOwnProfile.value && profile.value) {
      authStore.updateUserProfile({
        username: profile.value.username,
        fullName: profile.value.full_name || profile.value.username,
        avatarUrl: profile.value.avatar_url ?? '',
      })
    }
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

function handleOpenPost(postId: number) {
  void router.push(`/posts/${postId}`)
}

async function handleOpenMessage() {
  if (!profile.value || isOwnProfile.value || openingMessage.value) return

  const myId = normalizeViewerId(authStore.userId)
  const targetUserId = normalizeViewerId(profile.value.id)

  if (!myId || !targetUserId) {
    errorMessage.value = 'Could not open chat for this profile.'
    return
  }

  openingMessage.value = true
  errorMessage.value = ''

  try {
    const data = await chatApi.getOrCreatePrivateChat(myId, targetUserId)
    const conversationId = String(data?.conversationId ?? '')
    if (!conversationId) {
      errorMessage.value = 'Could not open chat for this profile.'
      return
    }

    await router.push({
      path: '/chat',
      query: { conversationId },
    })
  } catch (error) {
    console.error('[profile-standalone] handleOpenMessage failed', error)
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.message || 'Could not open chat right now.'
    } else {
      errorMessage.value = 'Could not open chat right now.'
    }
  } finally {
    openingMessage.value = false
  }
}

function handleOpenHighlight(highlight: ProfileHighlight) {
  selectedHighlight.value = highlight
}

function handleOpenActiveStories() {
  if (!activeStories.value.length) return
  selectedHighlight.value = null
  activeStoryViewerOpen.value = true
}

async function handleOpenCreateHighlight() {
  managingHighlightId.value = null
  highlightSheetMode.value = 'create'
  await loadMyStoriesForHighlights()
  highlightSheetOpen.value = true
}

async function handleManageHighlight(highlight: ProfileHighlight) {
  managingHighlightId.value = highlight.id
  highlightSheetMode.value = 'edit'
  await loadMyStoriesForHighlights()
  highlightSheetOpen.value = true
}

function handleCloseHighlight() {
  selectedHighlight.value = null
}

function handleCloseActiveStories() {
  activeStoryViewerOpen.value = false
}

function handleStoryHighlightsUpdated() {
  if (!isOwnProfile.value) return
  void loadProfile()
}

function handleCloseHighlightSheet() {
  highlightSheetOpen.value = false
  managingHighlightId.value = null
  highlightSheetMode.value = 'list'
}

async function handleHighlightsSheetUpdated(_highlights: StoryHighlight[]) {
  await loadProfile()
}

const highlightSheetHighlights = computed<StoryHighlight[]>(() =>
  (profile.value?.highlights ?? []).map((highlight) => ({
    ...highlight,
    stories: highlight.stories.map((story) => ({
      ...story,
      id: Number(story.id),
    })),
  })),
)

const highlightSheetCurrentStoryId = computed<number | null>(() => {
  if (!managingHighlightId.value) return null
  const highlight = profile.value?.highlights.find((item) => item.id === managingHighlightId.value)
  return highlight?.stories[0] ? Number(highlight.stories[0].id) : null
})

watch(resolvedUserId, () => {
  editOpen.value = false
  activeStoryViewerOpen.value = false
  selectedHighlight.value = null
  successMessage.value = ''
  errorMessage.value = ''
  void loadProfile()
})

onMounted(() => {
  viewerId.value = normalizeViewerId(getCurrentViewerId())
  void loadProfile()
  document.body.classList.add('profile-view')
  window.addEventListener('story-highlights-updated', handleStoryHighlightsUpdated)
})

onUnmounted(() => {
  document.body.classList.remove('profile-view')
  window.removeEventListener('story-highlights-updated', handleStoryHighlightsUpdated)
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
        :message-loading="openingMessage"
        :has-active-story="activeStories.length > 0"
        @edit-profile="editOpen = true"
        @open-story="handleOpenActiveStories"
        @toggle-follow="handleToggleFollow"
        @message-profile="handleOpenMessage"
      />

      <ProfileHighlightStrip
        :highlights="profile.highlights"
        :can-manage="isOwnProfile"
        @open-highlight="handleOpenHighlight"
        @create-highlight="handleOpenCreateHighlight"
        @manage-highlight="handleManageHighlight"
      />

      <div class="profile-tabs">
        <button class="profile-tab profile-tab--active" type="button">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Posts
        </button>
      </div>

      <ProfilePostGrid
        class="profile-standalone__posts"
        :posts="profile.posts"
        @open-post="handleOpenPost"
      />

      <ProfileEditDialog
        :open="editOpen && isOwnProfile"
        :profile="profile"
        :saving="saving"
        :changing-password="changingPassword"
        @close="editOpen = false"
        @save-profile="handleSaveProfile"
        @change-password="handleChangePassword"
      />

      <Teleport to="body">
        <StoryViewer
          v-if="activeStoryViewerOpen && profile && activeStories.length > 0"
          :stories="activeStories.map((story) => ({
            id: String(story.id),
            media_url: story.media_url,
            media_type: story.media_type,
            created_at: story.created_at,
          }))"
          :user-id="String(profile.id)"
          :username="profile.username"
          :avatar_url="profile.avatar_url ?? ''"
          @close="handleCloseActiveStories"
          @next-user="handleCloseActiveStories"
          @prev-user="handleCloseActiveStories"
        />

        <StoryViewer
          v-if="selectedHighlight && profile"
          :stories="selectedHighlight.stories.map((story) => ({
            id: String(story.id),
            media_url: story.media_url,
            media_type: story.media_type,
            created_at: story.created_at,
          }))"
          :user-id="String(profile.id)"
          :username="`${profile.username} • ${selectedHighlight.title}`"
          :avatar_url="profile.avatar_url ?? ''"
          @close="handleCloseHighlight"
          @next-user="handleCloseHighlight"
          @prev-user="handleCloseHighlight"
        />

        <StoryHighlightSheet
          v-if="profile"
          :open="highlightSheetOpen"
          :current-story-id="highlightSheetCurrentStoryId"
          :highlights="highlightSheetHighlights"
          :stories="myStories"
          :initial-mode="highlightSheetMode"
          :initial-highlight-id="managingHighlightId"
          @close="handleCloseHighlightSheet"
          @updated="handleHighlightsSheetUpdated"
        />
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.profile-standalone {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0.5rem 0 3rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Tabs ────────────────────────────────────────────────────────────────────── */
.profile-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 20px 0 16px;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0;
}

.profile-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 0;
  padding: 10px 18px 12px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  position: relative;
  transition: color 0.15s ease;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.profile-tab:hover {
  color: #1c62d6;
}

.profile-tab--active {
  color: #1c62d6;
  border-bottom-color: #1c62d6;
}

/* ── Banners ─────────────────────────────────────────────────────────────────── */
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
  /* grid fills naturally */
}
</style>

