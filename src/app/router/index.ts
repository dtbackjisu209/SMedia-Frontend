import { createRouter, createWebHistory } from 'vue-router'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import MainLayout from '@/app/layouts/MainLayout.vue'
import LoginPage from '@/features/auth/pages/LoginPage.vue'
import RegisterPage from '@/features/auth/pages/RegisterPage.vue'
import FeedPage from '@/features/posts/pages/FeedPage.vue'
import PostDetailPage from '@/features/posts/pages/PostDetailPage.vue'
import NotificationPage from '@/features/notifications/pages/NotificationPage.vue'
import ChatPage from '@/features/chat/pages/ChatPage.vue'
import UserProfilePage from '@/features/users/pages/UserProfilePage.vue'
import { ROUTE_PATHS } from '@/shared/constants/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', component: FeedPage },
        { path: 'posts/:postId', component: PostDetailPage },
        { path: 'users/:userId', component: UserProfilePage },
        { path: ROUTE_PATHS.notifications.slice(1), component: NotificationPage },
        { path: ROUTE_PATHS.chat.slice(1), component: ChatPage },
      ],
    },
    {
      path: '/',
      component: AuthLayout,
      children: [
        { path: ROUTE_PATHS.login.slice(1), component: LoginPage },
        { path: ROUTE_PATHS.register.slice(1), component: RegisterPage },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem('access_token'))

  if (to.meta.requiresAuth && !hasToken) {
    return ROUTE_PATHS.login
  }

  if (hasToken && (to.path === ROUTE_PATHS.login || to.path === ROUTE_PATHS.register)) {
    return ROUTE_PATHS.feed
  }

  return true
})

export { router }
export default router
