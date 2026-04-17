<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { ProfilePasswordPayload, ProfileUpdatePayload, ProfileView } from '../types/profile'

const props = defineProps<{
  open: boolean
  profile: ProfileView | null
  saving?: boolean
  changingPassword?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save-profile', payload: ProfileUpdatePayload): void
  (e: 'change-password', payload: ProfilePasswordPayload): void
}>()

const profileForm = reactive({
  username: '',
  full_name: '',
  bio: '',
  avatar_url: '',
  is_private: false,
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
})

const activeTab = ref<'profile' | 'security'>('profile')

watch(
  () => props.profile,
  (profile) => {
    profileForm.username = profile?.username ?? ''
    profileForm.full_name = profile?.full_name ?? ''
    profileForm.bio = profile?.bio ?? ''
    profileForm.avatar_url = profile?.avatar_url ?? ''
    profileForm.is_private = profile?.is_private ?? false
  },
  { immediate: true },
)

watch(
  () => props.open,
  (open) => {
    if (open) activeTab.value = 'profile'
  },
)

const bioLength = computed(() => profileForm.bio.length)
const usernamePreview = computed(() => profileForm.username.trim() || props.profile?.username || 'username')
const displayNamePreview = computed(() => profileForm.full_name.trim() || props.profile?.full_name || 'Your name')
const initials = computed(() => {
  const source = usernamePreview.value || displayNamePreview.value || 'U'
  return source.slice(0, 1).toUpperCase()
})

function submitProfile() {
  emit('save-profile', {
    username: profileForm.username.trim(),
    full_name: profileForm.full_name.trim() || null,
    bio: profileForm.bio.trim() || null,
    avatar_url: profileForm.avatar_url.trim() || null,
    is_private: profileForm.is_private,
  })
}

function submitPassword() {
  emit('change-password', {
    current_password: passwordForm.current_password,
    new_password: passwordForm.new_password,
  })

  passwordForm.current_password = ''
  passwordForm.new_password = ''
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="profile-edit-overlay" @click.self="emit('close')">
      <div class="profile-edit-dialog">
        <div class="profile-edit-dialog__header">
          <div>
            <h2>Edit Profile</h2>
            <p>Update your profile information, account visibility, and password.</p>
          </div>

          <button type="button" class="profile-edit-dialog__close" @click="emit('close')">
            x
          </button>
        </div>

        <div class="profile-edit-dialog__tabs">
          <button
            type="button"
            class="profile-edit-dialog__tab"
            :class="{ 'profile-edit-dialog__tab--active': activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            Profile
          </button>
          <button
            type="button"
            class="profile-edit-dialog__tab"
            :class="{ 'profile-edit-dialog__tab--active': activeTab === 'security' }"
            @click="activeTab = 'security'"
          >
            Security
          </button>
        </div>

        <div v-if="activeTab === 'profile'" class="profile-edit-dialog__grid">
          <section class="profile-edit-card profile-edit-card--preview">
            <h3>Preview</h3>

            <div class="profile-preview">
              <img
                v-if="profileForm.avatar_url"
                :src="profileForm.avatar_url"
                :alt="usernamePreview"
                class="profile-preview__avatar-image"
              />
              <div v-else class="profile-preview__avatar-fallback">
                {{ initials }}
              </div>

              <div class="profile-preview__meta">
                <strong>@{{ usernamePreview }}</strong>
                <span>{{ displayNamePreview }}</span>
                <small>{{ profileForm.is_private ? 'Private account' : 'Public account' }}</small>
              </div>
            </div>

            <div class="profile-edit-card__hint">
              Change the visible information on your personal page here before saving it.
            </div>
          </section>

          <section class="profile-edit-card">
            <h3>Basic Info</h3>

            <label>
              <span>Username</span>
              <input v-model="profileForm.username" type="text" maxlength="30" />
            </label>

            <label>
              <span>Full name</span>
              <input v-model="profileForm.full_name" type="text" maxlength="100" />
            </label>

            <label>
              <span>Bio</span>
              <textarea v-model="profileForm.bio" rows="4" maxlength="250" />
              <small class="profile-edit-card__meta">{{ bioLength }}/250 characters</small>
            </label>

            <label>
              <span>Avatar URL</span>
              <input v-model="profileForm.avatar_url" type="url" placeholder="https://example.com/avatar.jpg" />
            </label>

            <label class="profile-edit-dialog__switch">
              <input v-model="profileForm.is_private" type="checkbox" />
              <span>Private account</span>
            </label>

            <button
              type="button"
              class="profile-edit-dialog__primary"
              :disabled="saving"
              @click="submitProfile"
            >
              {{ saving ? 'Saving...' : 'Save profile' }}
            </button>
          </section>
        </div>

        <div v-else class="profile-edit-dialog__security-panel">
          <section class="profile-edit-card">
            <h3>Change Password</h3>

            <label>
              <span>Current password</span>
              <input v-model="passwordForm.current_password" type="password" />
            </label>

            <label>
              <span>New password</span>
              <input v-model="passwordForm.new_password" type="password" />
              <small class="profile-edit-card__meta">Use at least 6 characters for the new password.</small>
            </label>

            <button
              type="button"
              class="profile-edit-dialog__secondary"
              :disabled="changingPassword"
              @click="submitPassword"
            >
              {{ changingPassword ? 'Updating...' : 'Change password' }}
            </button>
          </section>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.profile-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(8px);
}

.profile-edit-dialog {
  width: min(920px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 1.5rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.profile-edit-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.profile-edit-dialog__header h2,
.profile-edit-card h3 {
  margin: 0;
  color: #111827;
}

.profile-edit-dialog__header p {
  margin: 0.45rem 0 0;
  color: #64748b;
}

.profile-edit-dialog__close {
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  font-size: 1.1rem;
  cursor: pointer;
}

.profile-edit-dialog__tabs {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem 0;
}

.profile-edit-dialog__tab {
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #fff;
  color: #475569;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.profile-edit-dialog__tab--active {
  background: rgba(255, 107, 107, 0.12);
  border-color: rgba(255, 107, 107, 0.24);
  color: #c2410c;
}

.profile-edit-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  padding: 1.5rem;
}

.profile-edit-dialog__security-panel {
  padding: 1.5rem;
}

.profile-edit-card {
  padding: 1.25rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  background: #fcfcff;
}

.profile-edit-card--preview {
  background:
    radial-gradient(circle at top left, rgba(255, 142, 110, 0.18), transparent 45%),
    linear-gradient(180deg, #fff7f4, #ffffff);
}

.profile-edit-card h3 {
  margin-bottom: 1rem;
}

.profile-edit-card label {
  display: block;
  margin-top: 0.9rem;
}

.profile-edit-card span {
  display: block;
  margin-bottom: 0.45rem;
  color: #475569;
  font-weight: 600;
}

.profile-edit-card input,
.profile-edit-card textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 0.9rem;
  outline: none;
  font: inherit;
}

.profile-edit-card__meta {
  display: block;
  margin-top: 0.4rem;
  color: #64748b;
  font-size: 0.88rem;
}

.profile-edit-card__hint {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.78);
  color: #475569;
  line-height: 1.6;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-preview__avatar-image,
.profile-preview__avatar-fallback {
  width: 88px;
  height: 88px;
  border-radius: 999px;
}

.profile-preview__avatar-image {
  object-fit: cover;
  border: 4px solid rgba(255, 107, 107, 0.18);
}

.profile-preview__avatar-fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #ffb267, #ff6b6b);
  color: #111827;
  font-size: 2rem;
  font-weight: 800;
}

.profile-preview__meta {
  display: grid;
  gap: 0.25rem;
}

.profile-preview__meta strong {
  color: #111827;
  font-size: 1.2rem;
}

.profile-preview__meta span {
  color: #475569;
  margin: 0;
}

.profile-preview__meta small {
  color: #64748b;
}

.profile-edit-dialog__switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.profile-edit-dialog__switch span {
  margin: 0;
}

.profile-edit-dialog__switch input {
  width: 1.1rem;
  height: 1.1rem;
}

.profile-edit-dialog__primary,
.profile-edit-dialog__secondary {
  margin-top: 1.2rem;
  padding: 0.9rem 1rem;
  width: 100%;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.profile-edit-dialog__primary {
  border: 0;
  background: linear-gradient(135deg, #ff8e6e, #ff5d88);
  color: #fff;
}

.profile-edit-dialog__secondary {
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: #fff;
  color: #111827;
}

@media (max-width: 820px) {
  .profile-edit-dialog__grid {
    grid-template-columns: 1fr;
  }

  .profile-preview {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
