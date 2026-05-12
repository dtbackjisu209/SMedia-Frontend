<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/shared/components/AppHeader.vue'
import AppSidebar from '@/shared/components/AppSidebar.vue'
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
        <section class="card rail-card">
          <div class="rail-head">
            <h3 class="section-title">Who to follow</h3>
          </div>
          <div class="follow-list">
            <div class="follow-item">
              <span class="avatar"></span>
              <div class="follow-meta">
                <p class="name">James Wilson</p>
                <p class="muted">@jwilson_ux</p>
              </div>
              <button class="follow-btn" type="button">Follow</button>
            </div>
            <div class="follow-item">
              <span class="avatar"></span>
              <div class="follow-meta">
                <p class="name">Sarah Miller</p>
                <p class="muted">@sarahm_art</p>
              </div>
              <button class="follow-btn" type="button">Follow</button>
            </div>
          </div>
          <button class="rail-link" type="button">Show more</button>
        </section>
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


.rail-card {
  padding: 16px;
  border-radius: var(--radius-lg);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.follow-list {
  display: grid;
  gap: 12px;
}

.follow-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}

.follow-meta {
  display: grid;
  gap: 2px;
}

.follow-btn {
  border: 1px solid rgba(28, 98, 214, 0.4);
  background: #fff;
  color: var(--primary);
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 600;
  cursor: pointer;
}

.follow-btn:hover {
  background: var(--primary-soft);
}

.rail-link {
  margin-top: 10px;
  border: none;
  background: transparent;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.name {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.muted {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
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
