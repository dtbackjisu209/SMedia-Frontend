<script setup lang="ts">
import { useAuth } from '@/shared/composables/useAuth'

const { user, isAuthenticated, logout } = useAuth()
</script>

<template>
  <header class="app-header">
    <div class="inner">
      <h1 class="title">Socialgram</h1>

      <label class="search-box" aria-label="Search">
        <span class="search-dot"></span>
        <input class="search-input" type="text" placeholder="Search" />
      </label>

      <div class="right-zone" v-if="isAuthenticated">
        <span class="user-pill">{{ user?.username || user?.fullName }}</span>
        <button class="button secondary logout" type="button" @click="logout">
          Logout
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  margin-bottom: 24px;
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 14px 24px;
}

.title {
  margin: 0;
  font-family: 'Pacifico', cursive;
  font-size: 30px;
  font-weight: 400;
}

.search-box {
  max-width: 380px;
  width: 100%;
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #efefef;
  border-radius: 8px;
  padding: 8px 10px;
}

.search-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #999;
  border-radius: 50%;
  position: relative;
}

.search-dot::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 2px;
  background: #999;
  transform: rotate(45deg);
  right: -5px;
  bottom: -3px;
}

.search-input {
  border: none;
  background: transparent;
  width: 100%;
  font: inherit;
}

.search-input:focus {
  outline: none;
}

.right-zone {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-pill {
  font-size: 13px;
  font-weight: 600;
  background: #f3f3f3;
  border-radius: 999px;
  padding: 8px 10px;
}

.logout {
  width: auto;
  padding-inline: 14px;
}

@media (max-width: 900px) {
  .inner {
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 12px;
  }

  .search-box {
    display: none;
  }

  .title {
    font-size: 26px;
  }

  .user-pill {
    display: none;
  }
}
</style>
