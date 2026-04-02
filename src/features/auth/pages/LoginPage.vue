<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { isValidEmail } from '@/shared/utils/validation'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')

function validateLoginForm(): string | null {
  const normalizedEmail = email.value.trim()

  if (!isValidEmail(normalizedEmail)) {
    return 'Please enter a valid email address.'
  }

  if (password.value.length < 6) return 'Password must have at least 6 characters.'

  return null
}

async function onSubmit() {
  error.value = ''

  const validationError = validateLoginForm()
  if (validationError) {
    error.value = validationError
    return
  }

  try {
    await authStore.login(email.value.trim().toLowerCase(), password.value)
  } catch (submitError) {
    error.value = submitError instanceof Error ? submitError.message : 'Login failed. Please try again.'
  }
}
</script>

<template>
  <section class="auth-content">
    <h2 class="section-title">Log in</h2>
    <p class="muted center">Enter your account to open your feed.</p>
    <p v-if="authStore.registerMessage" class="success">{{ authStore.registerMessage }}</p>
    <form class="form" @submit.prevent="onSubmit">
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
          minlength="6"
          autocomplete="current-password"
          placeholder="Enter your password"
        />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="button" type="submit" :disabled="authStore.isLoading">
        {{ authStore.isLoading ? 'Logging in...' : 'Login' }}
      </button>
      <RouterLink class="switch-link" to="/register">Need an account? Register now</RouterLink>
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

.success {
  color: var(--success);
  margin: 0;
  text-align: center;
  font-weight: 600;
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
