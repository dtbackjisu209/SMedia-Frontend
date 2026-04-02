<script setup lang="ts">
import AppHeader from '@/shared/components/AppHeader.vue'
import AppSidebar from '@/shared/components/AppSidebar.vue'
</script>

<template>
  <main class="layout-container">
    <AppHeader />
    <section class="shell">
      <AppSidebar />

      <article class="content">
        <RouterView />
      </article>

      <aside class="right-rail">
        <section class="card rail-card">
          <h3 class="section-title">Suggestions</h3>
          <ul class="suggestion-list">
            <li class="suggestion-item">
              <span class="avatar"></span>
              <div>
                <p class="name">@frontend.daily</p>
                <p class="muted">Follows you</p>
              </div>
            </li>
            <li class="suggestion-item">
              <span class="avatar"></span>
              <div>
                <p class="name">@vue.hub</p>
                <p class="muted">New to your network</p>
              </div>
            </li>
            <li class="suggestion-item">
              <span class="avatar"></span>
              <div>
                <p class="name">@design.snap</p>
                <p class="muted">Popular this week</p>
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
  padding: 0 24px 24px;
}

.shell {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}

.content {
  min-height: 74vh;
  max-width: 640px;
  width: 100%;
}

.right-rail {
  position: sticky;
  top: 92px;
}

.rail-card {
  padding: 16px;
}

.suggestion-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--story-ring);
  position: relative;
}

.avatar::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #fff;
}

.name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.muted {
  margin: 0;
  font-size: 12px;
}

@media (max-width: 1150px) {
  .shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .right-rail {
    display: none;
  }
}

@media (max-width: 900px) {
  .layout-container {
    padding: 0 12px 90px;
  }

  .shell {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .content {
    max-width: 100%;
  }
}
</style>
