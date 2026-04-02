<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { isValidEmail, isValidUsername, validatePassword } from '@/shared/utils/validation'

const authStore = useAuthStore()
const username = ref('')
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

function validateRegisterForm(): string | null {
  const normalizedUsername = username.value.trim()
  const normalizedFullName = fullName.value.trim()
  const normalizedEmail = email.value.trim()

  if (!normalizedUsername) return 'Username is required.'
  if (!isValidUsername(normalizedUsername)) {
    return 'Username must be 3-30 characters and only include letters, numbers, dot or underscore.'
  }

  if (!normalizedFullName || normalizedFullName.length < 2) {
    return 'Full name must have at least 2 characters.'
  }

  if (!isValidEmail(normalizedEmail)) {
    return 'Please enter a valid email address.'
  }

  const passwordError = validatePassword(password.value)
  if (passwordError) return passwordError

  if (password.value !== confirmPassword.value) {
    return 'Password confirmation does not match.'
  }

  return null
}

async function onSubmit() {
  error.value = ''

  const validationError = validateRegisterForm()
  if (validationError) {
    error.value = validationError
    return
  }

  try {
    await authStore.register(
      username.value.trim(),
      fullName.value.trim(),
      email.value.trim().toLowerCase(),
      password.value,
    )
  } catch (submitError) {
    error.value = submitError instanceof Error ? submitError.message : 'Register failed. Please try again.'
  }
}
</script>

<template>
  <section class="auth-content">
    <h2 class="section-title">Create account</h2>
    <p class="muted center">Start sharing photos, reels and moments.</p>
    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Username</span>
        <input
          v-model="username"
          class="input"
          type="text"
          required
          autocomplete="username"
          minlength="3"
          maxlength="30"
          placeholder="your_username"
        />
      </label>
      <label class="field">
        <span>Full name</span>
        <input v-model="fullName" class="input" type="text" required autocomplete="name" placeholder="Nguyen Van A" />
      </label>
      <label class="field">
        <span>Email address</span>
        <input v-model="email" class="input" type="email" required autocomplete="email" placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Password</span>
        <input
          v-model="password"
          class="input"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          placeholder="At least 8 chars, uppercase, lowercase and number"
        />
      </label>
      <label class="field">
        <span>Confirm password</span>
        <input
          v-model="confirmPassword"
          class="input"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          placeholder="Type your password again"
        />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="button" type="submit" :disabled="authStore.isLoading">
        {{ authStore.isLoading ? 'Creating account...' : 'Register' }}
      </button>
      <RouterLink class="switch-link" to="/login">Already registered? Back to login</RouterLink>
    </form>
  </section>
</template>

<style scoped>
.auth-content {
  display: grid;
  gap: 8px;
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.field {
  display: grid;
  gap: 6px;
}

.error {
  color: var(--danger);
  margin: 0;
}

.switch-link {
  text-align: center;
  font-weight: 600;
  margin-top: 4px;
}

.center {
  text-align: center;
}
</style>
