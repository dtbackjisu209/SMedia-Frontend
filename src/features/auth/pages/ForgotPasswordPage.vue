<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const router = useRouter()

const handleResetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Password must have at least 6 characters.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Confirm password does not match!'
    return
  }

  isLoading.value = true
  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/reset-password-direct', {
      email: email.value.trim().toLowerCase(),
      newPassword: newPassword.value
    })
    
    successMessage.value = response.data.message || 'Password reset successfully!'
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Something went wrong, please try again'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="auth-content">
    <h2 class="section-title">Reset Password</h2>
    <p class="muted center">Enter your email and new password to update.</p>
    
    <form class="form" @submit.prevent="handleResetPassword">
      <label class="field">
        <span>Email address</span>
        <input v-model="email" class="input" type="email" required placeholder="you@example.com" />
      </label>
      
      <label class="field">
        <span>New Password</span>
        <input v-model="newPassword" class="input" type="password" required minlength="6" placeholder="Enter new password" />
      </label>

      <label class="field">
        <span>Confirm Password</span>
        <input v-model="confirmPassword" class="input" type="password" required minlength="6" placeholder="Confirm new password" />
      </label>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>

      <button class="button" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Updating...' : 'Update Password' }}
      </button>
      
      <RouterLink class="switch-link" to="/login">Back to Login</RouterLink>
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