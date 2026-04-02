<script setup lang="ts">
const navItems = [
  { to: '/', label: 'Feed', icon: 'F' },
  { to: '/notifications', label: 'Notifications', icon: 'N' },
  { to: '/chat', label: 'Chat', icon: 'C' },
]
</script>

<template>
  <aside class="sidebar">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="item"
      active-class="active"
      exact-active-class="active"
    >
      <span class="icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 92px;
}

.item {
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
}

.item:hover {
  background: #f3f3f3;
  text-decoration: none;
}

.active {
  background: var(--primary-soft);
  border-color: #d3e8fd;
}

.icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  border: 1px solid var(--border);
  background: #fff;
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 25;
    flex-direction: row;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.94);
    border-top: 1px solid var(--border);
    padding: 10px 8px;
  }

  .item {
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 6px;
    border: none;
    border-radius: 10px;
    min-width: 80px;
  }

  .icon {
    width: 26px;
    height: 26px;
  }
}
</style>
