<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ProfileUpdateInput, ProfileViewItem } from '../types/profile.types'

const props = defineProps<{
  modelValue: boolean
  profile: ProfileViewItem | null
  isSaving: boolean
  isChangingPassword: boolean
  profileMessage: string
  passwordMessage: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saveProfile: [payload: ProfileUpdateInput]
  changePassword: [payload: { current_password: string; new_password: string; confirm_password: string }]
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
  confirm_password: '',
})

watch(
  () => props.profile,
  (profile) => {
    if (!profile) return
    profileForm.username = profile.username || ''
    profileForm.full_name = profile.full_name || ''
    profileForm.bio = profile.bio || ''
    profileForm.avatar_url = profile.avatar_url || ''
    profileForm.is_private = profile.is_private
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
  },
  { immediate: true },
)

function closeModal() {
  emit('update:modelValue', false)
}

function submitProfile() {
  emit('saveProfile', {
    username: profileForm.username,
    full_name: profileForm.full_name || null,
    bio: profileForm.bio || null,
    avatar_url: profileForm.avatar_url || null,
    is_private: profileForm.is_private,
  })
}

function submitPassword() {
  emit('changePassword', {
    current_password: passwordForm.current_password,
    new_password: passwordForm.new_password,
    confirm_password: passwordForm.confirm_password,
  })
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click.self="closeModal">
    <section class="edit-modal card">
      <div class="edit-head">
        <h3 class="section-title">Edit Profile</h3>
        <button class="close-btn" type="button" @click="closeModal">x</button>
      </div>

      <div class="edit-grid">
        <section class="edit-section">
          <h4 class="edit-title">Profile info</h4>
          <label class="field">
            <span>Username</span>
            <input v-model="profileForm.username" type="text" />
          </label>
          <label class="field">
            <span>Full name</span>
            <input v-model="profileForm.full_name" type="text" />
          </label>
          <label class="field">
            <span>Bio</span>
            <textarea v-model="profileForm.bio" rows="4"></textarea>
          </label>
          <label class="field">
            <span>Avatar URL</span>
            <input v-model="profileForm.avatar_url" type="text" />
          </label>
          <label class="switch-row">
            <span>Private account</span>
            <input v-model="profileForm.is_private" type="checkbox" />
          </label>
          <p v-if="profileMessage" class="form-message" :class="{ 'form-message--success': profileMessage.includes('successfully') }">
            {{ profileMessage }}
          </p>
          <button class="button secondary save-btn" type="button" :disabled="isSaving" @click="submitProfile">
            {{ isSaving ? 'Saving...' : 'Save profile' }}
          </button>
        </section>

        <section class="edit-section">
          <h4 class="edit-title">Security</h4>
          <label class="field">
            <span>Current password</span>
            <input v-model="passwordForm.current_password" type="password" />
          </label>
          <label class="field">
            <span>New password</span>
            <input v-model="passwordForm.new_password" type="password" />
          </label>
          <label class="field">
            <span>Confirm new password</span>
            <input v-model="passwordForm.confirm_password" type="password" />
          </label>
          <p v-if="passwordMessage" class="form-message" :class="{ 'form-message--success': passwordMessage.includes('successfully') }">
            {{ passwordMessage }}
          </p>
          <button class="button secondary save-btn" type="button" :disabled="isChangingPassword" @click="submitPassword">
            {{ isChangingPassword ? 'Updating...' : 'Change password' }}
          </button>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 24px;
}

.edit-modal {
  width: min(920px, 100%);
  padding: 0;
  overflow: hidden;
}

.edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.close-btn {
  border: none;
  background: transparent;
  font: inherit;
  font-size: 20px;
  cursor: pointer;
  color: var(--muted);
}

.edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.edit-section {
  padding: 20px;
  display: grid;
  gap: 14px;
}

.edit-section + .edit-section {
  border-left: 1px solid var(--border);
}

.edit-title {
  margin: 0;
  font-size: 18px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span,
.switch-row span {
  font-size: 13px;
  font-weight: 600;
}

.field input,
.field textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
}

.field textarea {
  resize: vertical;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.form-message {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.form-message--success {
  color: #15803d;
}

.save-btn {
  width: auto;
  justify-self: start;
  padding-inline: 18px;
}

@media (max-width: 900px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .edit-section + .edit-section {
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
</style>
