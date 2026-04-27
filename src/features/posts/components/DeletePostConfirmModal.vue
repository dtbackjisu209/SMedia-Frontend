<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  isDeleting: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function closeModal() {
  if (props.isDeleting) return
  emit('update:modelValue', false)
}

function confirmDelete() {
  emit('confirm')
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click.self="closeModal">
    <section class="modal card" role="dialog" aria-modal="true" aria-label="Delete post confirmation">
      <h3 class="section-title">Xoa bai viet?</h3>
      <p class="message">Hanh dong nay khong the hoan tac.</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div class="actions">
        <button class="button secondary" type="button" :disabled="isDeleting" @click="closeModal">Huy</button>
        <button class="button danger" type="button" :disabled="isDeleting" @click="confirmDelete">
          {{ isDeleting ? 'Dang xoa...' : 'Xoa bai viet' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal {
  width: min(460px, 100%);
  display: grid;
  gap: 12px;
  padding: 18px;
}

.message {
  margin: 0;
  color: var(--muted);
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.danger {
  background: #b91c1c;
}
</style>
