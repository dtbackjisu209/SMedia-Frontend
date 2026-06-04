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
  padding: 0 0 40px;
}

.shell {
  width: 100%;
  max-width: var(--layout-max);
  margin: 0 auto;
  display: grid;
  grid-template-columns: var(--layout-sidebar) minmax(0, var(--layout-main)) var(--layout-rail);
  gap: var(--layout-gap);
  align-items: start;
  padding: 0 var(--layout-pad-x);
}

.shell--wide {
  grid-template-columns: var(--layout-sidebar) minmax(0, var(--layout-main)) var(--layout-rail);
}

.right-rail {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 18px;
}

:global(body.profile-view .right-rail) {
  display: none;
}

:global(body.profile-view .shell) {
  grid-template-columns: var(--layout-sidebar) minmax(0, var(--layout-main)) var(--layout-rail);
}

.content {
  min-height: 74vh;
  width: 100%;
  max-width: var(--layout-main);
  justify-self: stretch;
}

.shell--wide .content,
:global(body.profile-view .content) {
  grid-column: 2;
}


@media (max-width: 1100px) {
  .shell {
    grid-template-columns: 220px minmax(0, 1fr) 300px;
    gap: 22px;
    padding: 0 18px;
  }
}

@media (max-width: 980px) {
  .shell {
    grid-template-columns: 1fr;
    padding: 0 14px 88px;
  }

  .right-rail {
    display: none;
  }
}
</style>
