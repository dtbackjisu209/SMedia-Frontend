<template>
  <main class="auth-layout">
    <div class="auth-backdrop" aria-hidden="true"></div>
    <section class="auth-box card">
      <h1 class="brand">Socialgram</h1>
      <p class="sub muted">Connect with friends and creators.</p>
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px 12px;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

.auth-backdrop {
  position: absolute;
  width: min(800px, 90vw);
  height: min(800px, 90vw);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 82, 135, 0.16) 0%, rgba(214, 82, 135, 0) 68%);
  top: -30%;
  right: -25%;
  pointer-events: none;
}

.auth-box {
  width: 100%;
  max-width: 420px;
  padding: 24px;
  position: relative;
}

.brand {
  margin: 0 0 8px;
  font-size: 38px;
  line-height: 1.1;
  text-align: center;
  font-family: 'Pacifico', cursive;
  font-weight: 400;
}

.sub {
  text-align: center;
  margin: 0 0 14px;
}
</style>
