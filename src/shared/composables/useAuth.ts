import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/features/auth/store/auth.store.ts'

export function useAuth() {
  const authStore = useAuthStore()
  const { user, isAuthenticated } = storeToRefs(authStore)

  return {
    user,
    isAuthenticated,
    logout: authStore.logout,
  }
}
