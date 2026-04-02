import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loginApi, logoutApi, registerApi } from '@/features/auth/api/auth.api'
import { ROUTE_PATHS } from '@/shared/constants/routes'
import type { User } from '@/shared/types/social'
import router from '@/app/router/index'

const AUTH_USER_STORAGE_KEY = 'auth_user'
const LAST_REGISTER_EMAIL_KEY = 'last_register_email'
const LAST_REGISTER_USERNAME_KEY = 'last_register_username'
const LAST_REGISTER_FULLNAME_KEY = 'last_register_full_name'

function getStoredUser(): User | null {
  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(getStoredUser())
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const userId = ref<string | null>(localStorage.getItem('user_id'))
  const isLoading = ref(false)
  const registerMessage = ref('')

  const isAuthenticated = computed(() => Boolean(accessToken.value))

  async function login(email: string, password: string) {
    isLoading.value = true
    registerMessage.value = ''
    try {
      const response = await loginApi({ email, password })
      accessToken.value = response.accessToken
      userId.value = response.userId

      const lastRegisterEmail = localStorage.getItem(LAST_REGISTER_EMAIL_KEY)?.toLowerCase()
      const registeredUsername = localStorage.getItem(LAST_REGISTER_USERNAME_KEY) ?? ''
      const registeredFullName = localStorage.getItem(LAST_REGISTER_FULLNAME_KEY) ?? ''
      const emailPrefix = email.split('@')[0] || ''

      const resolvedUsername =
        lastRegisterEmail === email.toLowerCase() && registeredUsername ? registeredUsername : emailPrefix
      const resolvedFullName =
        lastRegisterEmail === email.toLowerCase() && registeredFullName
          ? registeredFullName
          : emailPrefix || 'User'

      user.value = {
        id: response.userId,
        username: resolvedUsername,
        fullName: resolvedFullName,
        email,
      }

      localStorage.setItem('access_token', response.accessToken)
      localStorage.setItem('user_id', response.userId)
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user.value))
      await router.push(ROUTE_PATHS.feed)
    } finally {
      isLoading.value = false
    }
  }

  async function register(username: string, fullName: string, email: string, password: string) {
    isLoading.value = true
    registerMessage.value = ''
    try {
      const response = await registerApi({ username, fullName, email, password })
      registerMessage.value = `${response.message}. Please login to continue.`
      localStorage.setItem(LAST_REGISTER_EMAIL_KEY, email.toLowerCase())
      localStorage.setItem(LAST_REGISTER_USERNAME_KEY, username)
      localStorage.setItem(LAST_REGISTER_FULLNAME_KEY, fullName)
      await router.push(ROUTE_PATHS.login)
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // Token may already be expired; local cleanup is still required.
    }

    accessToken.value = null
    userId.value = null
    registerMessage.value = ''
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    await router.push(ROUTE_PATHS.login)
  }

  return {
    user,
    userId,
    registerMessage,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  }
})
