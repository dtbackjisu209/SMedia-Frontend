<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/shared/components/AppHeader.vue'
import AppSidebar from '@/shared/components/AppSidebar.vue'
import WhoToFollow from '@/shared/components/WhoToFollow.vue'
import MessageToastStack from '../../features/notifications/components/MessageToastStack.vue'

const route = useRoute()
const isChatRoute = computed(() => route.path.startsWith('/chat'))
const isNotificationsRoute = computed(() => route.path.startsWith('/notifications'))
const isWideContentRoute = computed(() => isChatRoute.value || isNotificationsRoute.value)
</script>

<template>
  <main class="layout-container">
    <AppHeader />
    <MessageToastStack />
    <section class="shell" :class="{ 'shell--wide': isWideContentRoute }">
      <AppSidebar />

      <article class="content">
        <RouterView />
      </article>

      <aside v-if="!isWideContentRoute" class="right-rail">
        <WhoToFollow />
      </aside>
    </section>
  </main>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
  padding: 0 0 32px;
}

.shell {
  width: 100%;
  margin: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  gap: 28px;
  align-items: start;
}

.shell--wide {
  grid-template-columns: 200px minmax(0, 1fr);
}

.right-rail {
  position: sticky;
  top: 92px;
  display: grid;
  gap: 18px;
}

:global(body.profile-view .right-rail) {
  display: none;
}

:global(body.profile-view .shell) {
  grid-template-columns: 220px minmax(0, 1fr);
}

.content {
  min-height: 74vh;
  width: 100%;
}


@media (max-width: 1100px) {
  .shell {
    grid-template-columns: 200px minmax(0, 1fr) 280px;
  }
}

@media (max-width: 980px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .right-rail {
    position: static;
  }
}
</style>
