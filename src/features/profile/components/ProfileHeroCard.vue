<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileView } from '../types/profile'
import { resolveAvatar } from '@/shared/constants/avatar'

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
  const source = props.profile.full_name || props.profile.username || 'U'
  return source.slice(0, 1).toUpperCase()
})

const relationshipLabel = computed(() => {
  if (props.isOwnProfile) return ''
  if (props.profile.is_following) return 'Following'
  if (props.profile.has_pending_request) return 'Requested'
  return 'Follow'
})

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}
</script>

<template>
  <section class="hero">
    <!-- Left: Avatar -->
    <div class="hero__avatar-col">
      <div class="hero__avatar-ring">
        <img
          :src="resolveAvatar(profile.avatar_url)"
          :alt="profile.username"
          class="hero__avatar-img"
        />
      </div>
    </div>

    <!-- Right: Info -->
    <div class="hero__info">
      <!-- Row 1: username + badge + buttons -->
      <div class="hero__row hero__row--top">
        <div class="hero__name-wrap">
          <h1 class="hero__username">{{ profile.username }}</h1>
          <svg v-if="profile.is_private" class="hero__lock" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div class="hero__btns">
          <!-- Own profile -->
          <template v-if="isOwnProfile">
            <button type="button" class="hero__btn hero__btn--secondary" @click="emit('edit-profile')">
              Edit profile
            </button>
            <button type="button" class="hero__btn hero__btn--secondary">
              View archive
            </button>
          </template>

          <!-- Other profile -->
          <template v-else>
            <button
              type="button"
              class="hero__btn"
              :class="profile.is_following || profile.has_pending_request ? 'hero__btn--secondary' : 'hero__btn--primary'"
              :disabled="followLoading"
              @click="emit('toggle-follow')"
            >
              {{ relationshipLabel }}
            </button>
            <button type="button" class="hero__btn hero__btn--secondary">
              Message
            </button>
          </template>
        </div>
      </div>

      <!-- Row 2: stats -->
      <div class="hero__stats">
        <span class="hero__stat">
          <strong>{{ formatCount(profile.post_count) }}</strong> posts
        </span>
        <span class="hero__stat">
          <strong>{{ formatCount(profile.follower_count) }}</strong> followers
        </span>
        <span class="hero__stat">
          <strong>{{ formatCount(profile.following_count) }}</strong> following
        </span>
      </div>

      <!-- Row 3: full name + bio -->
      <div class="hero__bio-block">
        <p class="hero__fullname">{{ profile.full_name || profile.username }}</p>
        <p v-if="profile.bio" class="hero__bio">{{ profile.bio }}</p>
        <p v-if="joinedLabel" class="hero__joined">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Tham gia {{ joinedLabel }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 56px;
  align-items: start;
  padding: 32px 24px 28px;
  background: #fff;
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.7);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
}

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
.hero__avatar-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__avatar-ring {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
}

.hero__avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  border: 3px solid #fff;
}

.hero__avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 3.2rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #1c62d6, #4f9cf9);
  border: 3px solid #fff;
}

/* ── Info column ────────────────────────────────────────────────────────────── */
.hero__info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* Row 1: username + buttons */
.hero__row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.hero__name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero__username {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 400;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.hero__lock {
  color: #64748b;
  flex-shrink: 0;
}

/* Buttons */
.hero__btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  white-space: nowrap;
}

.hero__btn--primary {
  background: #1c62d6;
  color: #fff;
  box-shadow: 0 2px 8px rgba(28, 98, 214, 0.3);
}
.hero__btn--primary:hover {
  background: #1755c0;
  box-shadow: 0 4px 12px rgba(28, 98, 214, 0.4);
}

.hero__btn--secondary {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
.hero__btn--secondary:hover {
  background: #e8eef6;
  border-color: #cbd5e1;
}

.hero__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Row 2: stats */
.hero__stats {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.hero__stat {
  font-size: 0.95rem;
  color: #4b5563;
}

.hero__stat strong {
  font-weight: 700;
  color: #0f172a;
}

/* Row 3: bio block */
.hero__bio-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero__fullname {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.hero__bio {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.hero__joined {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  color: #94a3b8;
}

/* ── Responsive ─────────────────────────────────────────────────────────────── */
@media (max-width: 700px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 20px 0;
    text-align: center;
    padding: 24px 16px;
  }

  .hero__avatar-col {
    justify-content: center;
  }

  .hero__avatar-ring {
    width: 100px;
    height: 100px;
  }

  .hero__row {
    justify-content: center;
  }

  .hero__stats {
    justify-content: center;
  }

  .hero__bio-block {
    align-items: center;
  }

  .hero__btns {
    justify-content: center;
  }
}
</style>
