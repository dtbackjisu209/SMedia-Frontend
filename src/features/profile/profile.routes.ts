export const profileStandaloneRoutes = [
  {
    path: '/profile-standalone/:userId?',
    name: 'profile-standalone',
    component: () => import('./pages/ProfileStandalonePage.vue'),
  },
]

export default profileStandaloneRoutes
