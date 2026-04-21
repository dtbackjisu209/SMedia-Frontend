<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileView } from '../types/profile'

const props = defineProps<{
  profile: ProfileView
  isOwnProfile?: boolean
  followLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit-profile'): void
  (e: 'toggle-follow'): void
}>()

const joinedLabel = computed(() => {
  const date = new Date(props.profile.created_at)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
})

const initials = computed(() => {
  const source = props.profile.username || props.profile.full_name || 'U'
  return source.slice(0, 1).toUpperCase()
})

const visibilityLabel = computed(() => (props.profile.is_private ? 'Private account' : 'Public account'))
const relationshipLabel = computed(() => {
  if (props.isOwnProfile) return ''
  if (props.profile.is_following) return 'Following'
  if (props.profile.has_pending_request) return 'Requested'
  return 'Follow'
})
</script>

<template>
  <section class="profile-hero">
    <div class="profile-hero__avatar-wrap">
      <img
        v-if="profile.avatar_url"
        :src="profile.avatar_url"
        :alt="profile.username"
        class="profile-hero__avatar-image"
      />
      <div v-else class="profile-hero__avatar-fallback">
        {{ initials }}
      </div>
    </div>

    <div class="profile-hero__content">
      <div class="profile-hero__topline">
        <div>
          <h1 class="profile-hero__username">@{{ profile.username }}</h1>
          <p class="profile-hero__display-name">
            {{ profile.full_name || profile.username }}
          </p>
        </div>

        <button
          v-if="isOwnProfile"
          type="button"
          class="profile-hero__action"
          @click="emit('edit-profile')"
        >
          Edit Profile
        </button>

        <button
          v-else
          type="button"
          class="profile-hero__status-pill"
          :class="{
            'profile-hero__status-pill--active': profile.is_following || profile.has_pending_request,
          }"
          :disabled="followLoading"
          @click="emit('toggle-follow')"
        >
          {{ relationshipLabel }}
        </button>
      </div>

      <div class="profile-hero__stats">
        <div class="profile-hero__stat">
          <strong>{{ profile.post_count }}</strong>
          <span>posts</span>
        </div>
        <div class="profile-hero__stat">
          <strong>{{ profile.follower_count }}</strong>
          <span>followers</span>
        </div>
        <div class="profile-hero__stat">
          <strong>{{ profile.following_count }}</strong>
          <span>following</span>
        </div>
      </div>

      <p class="profile-hero__bio-name">
        {{ profile.full_name || profile.username }}
      </p>
      <p class="profile-hero__bio">
        {{ profile.bio || 'No bio yet.' }}
      </p>
      <p class="profile-hero__meta">
        {{ visibilityLabel }}
        <span v-if="joinedLabel">· Joined {{ joinedLabel }}</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.profile-hero {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.5rem 1.75rem;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 1.25rem;
}

.profile-hero__avatar-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.profile-hero__avatar-image,
.profile-hero__avatar-fallback {
  width: 112px;
  height: 112px;
  border-radius: 999px;
}

.profile-hero__avatar-image {
  object-fit: cover;
  border: 4px solid rgba(255, 111, 97, 0.18);
}

.profile-hero__avatar-fallback {
  display: grid;
  place-items: center;
  font-size: 2.9rem;
  font-weight: 800;
  color: #111827;
  background: linear-gradient(145deg, #ffb267, #ff6b6b);
  border: 4px solid rgba(255, 111, 97, 0.18);
}

.profile-hero__content {
  min-width: 0;
}

.profile-hero__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile-hero__username {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.6rem);
  line-height: 1.05;
  color: #111827;
}

.profile-hero__display-name {
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
  color: #1f2937;
}

.profile-hero__action,
.profile-hero__status-pill {
  flex-shrink: 0;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  border: 1px solid rgba(15, 23, 42, 0.14);
}

.profile-hero__action {
  background: #fff;
  color: #111827;
  cursor: pointer;
}

.profile-hero__status-pill {
  background: linear-gradient(135deg, #ff8e6e, #ff5d88);
  color: #fff;
  cursor: pointer;
}

.profile-hero__status-pill--active {
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
}

.profile-hero__status-pill:disabled {
  opacity: 0.7;
  cursor: wait;
}

.profile-hero__stats {
  display: flex;
  gap: 1.75rem;
  margin: 1.15rem 0;
  flex-wrap: wrap;
}

.profile-hero__stat {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.profile-hero__stat strong {
  font-size: 1.55rem;
  line-height: 1;
  color: #111827;
}

.profile-hero__stat span {
  font-size: 0.95rem;
  color: #64748b;
  text-transform: lowercase;
}

.profile-hero__bio-name {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: #111827;
}

.profile-hero__bio {
  margin: 0.75rem 0 0;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-wrap;
}

.profile-hero__meta {
  margin: 0.9rem 0 0;
  font-size: 0.95rem;
  color: #64748b;
}

@media (max-width: 900px) {
  .profile-hero {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .profile-hero__topline {
    flex-direction: column;
    align-items: center;
  }

  .profile-hero__stats {
    justify-content: center;
  }
}
</style>
