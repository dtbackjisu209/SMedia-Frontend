<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/features/notifications/store/notifications.store'
import type { NotificationToastItem } from '@/shared/types/social'

const router = useRouter()
const notificationsStore = useNotificationsStore()

async function handleToastClick(toast: NotificationToastItem) {
  const { notification } = toast

  notificationsStore.dismissToast(toast.id)

  try {
    if (!notification.read) {
      await notificationsStore.markRead(notification.id)
    }
  } finally {
    if (notification.targetPath) {
      await router.push(notification.targetPath)
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      v-if="notificationsStore.toasts.length"
      name="toast"
      tag="div"
      class="toast-stack"
    >
      <button
        v-for="toast in notificationsStore.toasts"
        :key="toast.id"
        class="toast-card"
        type="button"
        @click="handleToastClick(toast)"
      >
        <span class="toast-accent"></span>
        <div class="toast-copy">
          <strong class="toast-title">Tin nhan moi</strong>
          <p class="toast-content">{{ toast.notification.content }}</p>
        </div>
        <span class="toast-arrow">></span>
      </button>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 88px;
  right: 20px;
  z-index: 1200;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100vw - 24px));
}

.toast-card {
  width: 100%;
  border: 1px solid rgba(214, 82, 135, 0.18);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 244, 248, 0.98), rgba(255, 255, 255, 0.98)),
    #fff;
  box-shadow: 0 18px 36px rgba(214, 82, 135, 0.16);
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.toast-card:hover {
  transform: translateY(-1px);
}

.toast-accent {
  width: 10px;
  height: 42px;
  border-radius: 999px;
  background: linear-gradient(180deg, #d65287, #f59e0b);
}

.toast-copy {
  min-width: 0;
}

.toast-title {
  display: block;
  margin-bottom: 4px;
  font-size: 0.82rem;
  color: #1a1a2e;
}

.toast-content {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: #4b5563;
}

.toast-arrow {
  font-size: 1.1rem;
  line-height: 1;
  color: #d65287;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

@media (max-width: 700px) {
  .toast-stack {
    top: 74px;
    right: 12px;
    left: 12px;
    width: auto;
  }
}
</style>
