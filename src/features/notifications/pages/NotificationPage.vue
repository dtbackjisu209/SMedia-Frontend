<script setup lang="ts">
import { onMounted } from 'vue'
import NotificationList from '@/features/notifications/components/NotificationList.vue'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'

const notificationsStore = useNotificationsStore()

onMounted(() => {
  notificationsStore.fetchNotifications()
})
</script>

<template>
  <NotificationList />
</template>
