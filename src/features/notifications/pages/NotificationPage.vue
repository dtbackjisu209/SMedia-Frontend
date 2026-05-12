<script setup lang="ts">
import { onMounted } from 'vue'
import NotificationList from '@/features/notifications/components/NotificationList.vue'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

const notificationsStore = useNotificationsStore()

onMounted(() => {
  const userId = Number(localStorage.getItem('user_id'))
  if (Number.isFinite(userId) && userId > 0) {
    notificationsStore.connect(userId)
  }
  notificationsStore.fetchNotifications()
})
</script>

<template>
  <NotificationList />
</template>
