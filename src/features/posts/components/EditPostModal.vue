<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { UpdatePostInput } from '@/features/posts/api/posts.api'
import type { Post } from '@/shared/types/social'

const props = defineProps<{
  modelValue: boolean
  post: Post | null
  isSaving: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: UpdatePostInput]
}>()

const form = reactive({
  caption: '',
  location: '',
})

const tags = ref<string[]>([])
const tagDraft = ref('')
const localError = ref('')

const initialState = ref({
  caption: '',
  location: '',
  tags: [] as string[],
})

const sortedTags = computed(() => [...tags.value].sort((a, b) => a.localeCompare(b)))

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible || !props.post) return

    const postCaption = props.post.caption ?? ''
    const postLocation = props.post.location ?? ''
    const postTags = Array.isArray(props.post.tags) ? props.post.tags : []

    form.caption = postCaption
    form.location = postLocation
    tags.value = [...postTags]
    tagDraft.value = ''
    localError.value = ''
    initialState.value = {
      caption: postCaption,
      location: postLocation,
      tags: [...postTags],
    }
  },
  { immediate: true },
)

function closeModal() {
  emit('update:modelValue', false)
}

function normalizeTag(rawValue: string): string {
  return rawValue.trim().replace(/^#+/, '').toLowerCase()
}

function addTag(rawValue: string) {
  const normalized = normalizeTag(rawValue)
  if (!normalized) return
  if (tags.value.includes(normalized)) return
  tags.value = [...tags.value, normalized]
}

function addTagFromInput() {
  if (!tagDraft.value.trim()) return

  const chunks = tagDraft.value.split(',')
  chunks.forEach((chunk) => addTag(chunk))
  tagDraft.value = ''
}

function onTagInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTagFromInput()
  }
}

function removeTag(tagValue: string) {
  tags.value = tags.value.filter((tag) => tag !== tagValue)
}

function isTagsChanged(nextTags: string[], previousTags: string[]): boolean {
  if (nextTags.length !== previousTags.length) return true

  const left = [...nextTags].sort()
  const right = [...previousTags].sort()
  return left.some((item, index) => item !== right[index])
}

function handleSubmit() {
  localError.value = ''

  addTagFromInput()

  const caption = form.caption.trim()
  const location = form.location.trim()
  const payload: UpdatePostInput = {}

  if (caption !== initialState.value.caption.trim()) {
    payload.caption = caption
  }

  if (location !== initialState.value.location.trim()) {
    payload.location = location
  }

  const normalizedTags = tags.value
    .map((tag) => normalizeTag(tag))
    .filter(Boolean)

  if (isTagsChanged(normalizedTags, initialState.value.tags.map((tag) => normalizeTag(tag)).filter(Boolean))) {
    payload.tags = [...new Set(normalizedTags)]
  }

  if (!payload.caption && !payload.location && !payload.tags) {
    localError.value = 'Khong co thay doi nao de cap nhat.'
    return
  }

  emit('submit', payload)
}
</script>

<template>
  <div v-if="modelValue" class="overlay" @click.self="closeModal">
    <section class="modal-card card" role="dialog" aria-modal="true" aria-label="Edit post">
      <header class="modal-head">
        <h3 class="section-title">Chinh sua bai viet</h3>
        <button class="close-btn" type="button" @click="closeModal">x</button>
      </header>

      <div class="modal-body">
        <label class="field">
          <span>Caption</span>
          <textarea v-model="form.caption" rows="4" maxlength="2200"></textarea>
        </label>

        <label class="field">
          <span>Location</span>
          <input v-model="form.location" type="text" maxlength="120" />
        </label>

        <div class="field">
          <span>Tags</span>
          <div class="tag-input-wrap">
            <input
              v-model="tagDraft"
              type="text"
              placeholder="Nhap tag, Enter hoac dau phay de them"
              @keydown="onTagInputKeydown"
              @blur="addTagFromInput"
            />
          </div>
          <div v-if="sortedTags.length > 0" class="tag-list">
            <button v-for="tag in sortedTags" :key="tag" class="tag-chip" type="button" @click="removeTag(tag)">
              #{{ tag }} x
            </button>
          </div>
        </div>

        <p v-if="localError" class="error">{{ localError }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>

      <footer class="modal-foot">
        <button class="button secondary" type="button" :disabled="isSaving" @click="closeModal">Huy</button>
        <button class="button" type="button" :disabled="isSaving" @click="handleSubmit">
          {{ isSaving ? 'Dang luu...' : 'Luu thay doi' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal-card {
  width: min(620px, 100%);
  overflow: hidden;
  padding: 0;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
}

.field input,
.field textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 11px;
  font: inherit;
  background: #fff;
}

.field textarea {
  resize: vertical;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  padding: 4px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px 16px;
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}
</style>
