<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveMediaUrl } from '@/shared/constants/avatar'
import type { MyStoryItem, StoryHighlight } from '../api/stories'
import { storiesApi } from '../api/stories'

const props = defineProps<{
  open: boolean
  currentStoryId: number | null
  highlights: StoryHighlight[]
  stories: MyStoryItem[]
  initialMode?: 'list' | 'create' | 'edit'
  initialHighlightId?: number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', highlights: StoryHighlight[]): void
}>()

const mode = ref<'picker' | 'list' | 'create' | 'edit'>('picker')
const title = ref('')
const selectedStoryIds = ref<number[]>([])
const activeHighlightId = ref<number | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const activeHighlight = computed(() =>
  props.highlights.find((highlight) => highlight.id === activeHighlightId.value) ?? null,
)

const currentStory = computed(() =>
  props.currentStoryId ? props.stories.find((story) => story.id === props.currentStoryId) ?? null : null,
)

const safeCurrentStoryUrl = computed(() => resolveMediaUrl(currentStory.value?.media_url))

const selectedExistingHighlightIds = computed(() =>
  props.highlights
    .filter((highlight) => highlight.stories.some((story) => Number(story.id) === Number(props.currentStoryId)))
    .map((highlight) => highlight.id),
)

const normalizedStories = computed(() =>
  props.stories.map((story) => ({
    ...story,
    safe_media_url: resolveMediaUrl(story.media_url),
    isSelected: selectedStoryIds.value.includes(story.id),
  })),
)

function resetState() {
  mode.value = props.initialMode === 'create' ? 'create' : 'picker'
  title.value = ''
  selectedStoryIds.value = props.currentStoryId ? [props.currentStoryId] : []
  activeHighlightId.value = null
  errorMessage.value = ''
  successMessage.value = ''
}

function syncOpenState() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!props.initialMode) {
    resetState()
    return
  }

  if (props.initialMode === 'create') {
    openCreate()
    return
  }

  if (props.initialMode === 'edit' && props.initialHighlightId) {
    const targetHighlight = props.highlights.find((highlight) => highlight.id === props.initialHighlightId)
    if (targetHighlight) {
      openEdit(targetHighlight)
      return
    }
  }

  resetState()
}

function openCreate() {
  mode.value = 'create'
  title.value = ''
  selectedStoryIds.value = props.currentStoryId ? [props.currentStoryId] : []
  activeHighlightId.value = null
  errorMessage.value = ''
  successMessage.value = ''
}

function openEdit(highlight: StoryHighlight) {
  mode.value = 'edit'
  activeHighlightId.value = highlight.id
  title.value = highlight.title
  selectedStoryIds.value = highlight.stories.map((story) => Number(story.id))
  if (props.currentStoryId && !selectedStoryIds.value.includes(props.currentStoryId)) {
    selectedStoryIds.value = [props.currentStoryId, ...selectedStoryIds.value]
  }
  errorMessage.value = ''
  successMessage.value = ''
}

function toggleStorySelection(storyId: number) {
  if (selectedStoryIds.value.includes(storyId)) {
    selectedStoryIds.value = selectedStoryIds.value.filter((id) => id !== storyId)
    return
  }

  selectedStoryIds.value = [storyId, ...selectedStoryIds.value]
}

async function handleCreate() {
  if (!title.value.trim()) {
    errorMessage.value = 'Please enter a highlight name.'
    return
  }

  if (selectedStoryIds.value.length === 0) {
    errorMessage.value = 'Select at least one story before creating a highlight.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await storiesApi.createHighlight({
      title: title.value.trim(),
      storyIds: selectedStoryIds.value,
    })
    const dbHighlights = await storiesApi.getMyHighlights()
    emit('updated', dbHighlights)
    window.dispatchEvent(new CustomEvent('story-highlights-updated'))
    mode.value = 'list'
    title.value = ''
    selectedStoryIds.value = props.currentStoryId ? [props.currentStoryId] : []
    activeHighlightId.value = null
    successMessage.value = 'Highlight created successfully.'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Could not create highlight.'
  } finally {
    saving.value = false
  }
}

async function handleQuickAddToHighlight(highlight: StoryHighlight) {
  if (!props.currentStoryId) {
    errorMessage.value = 'Current story is not available.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const alreadyIncluded = highlight.stories.some((story) => Number(story.id) === Number(props.currentStoryId))

    if (!alreadyIncluded) {
      await storiesApi.addStoryToHighlight(highlight.id, props.currentStoryId)
    }

    const dbHighlights = await storiesApi.getMyHighlights()
    emit('updated', dbHighlights)
    window.dispatchEvent(new CustomEvent('story-highlights-updated'))
    successMessage.value = alreadyIncluded
      ? 'Story is already in this highlight.'
      : 'Story added to highlight.'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Could not add story to highlight.'
  } finally {
    saving.value = false
  }
}

async function handleSaveEdit() {
  const targetHighlight = activeHighlight.value
  if (!targetHighlight) {
    errorMessage.value = 'This highlight no longer exists. Please reopen it from the list.'
    mode.value = 'list'
    activeHighlightId.value = null
    return
  }
  if (!title.value.trim()) {
    errorMessage.value = 'Please enter a highlight name.'
    return
  }

  if (selectedStoryIds.value.length === 0) {
    errorMessage.value = 'A highlight cannot be empty. Add a story or delete the highlight.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (title.value.trim() !== targetHighlight.title) {
      await storiesApi.updateHighlight(targetHighlight.id, {
        title: title.value.trim(),
      })
    }

    const existingIds = new Set(targetHighlight.stories.map((story) => Number(story.id)))
    const selectedIds = new Set(selectedStoryIds.value)
    const toAdd = selectedStoryIds.value.filter((id) => !existingIds.has(id))
    const toRemove = [...existingIds].filter((id) => !selectedIds.has(id))

    for (const storyId of toAdd) {
      await storiesApi.addStoryToHighlight(targetHighlight.id, storyId)
    }

    for (const storyId of toRemove) {
      const nextHighlight = await storiesApi.removeStoryFromHighlight(targetHighlight.id, storyId)
      if (!nextHighlight) {
        break
      }
    }

    const dbHighlights = await storiesApi.getMyHighlights()
    emit('updated', dbHighlights)
    window.dispatchEvent(new CustomEvent('story-highlights-updated'))
    const nextHighlight = dbHighlights.find((highlight) => highlight.id === targetHighlight.id)
    if (!nextHighlight) {
      resetState()
      return
    }

    openEdit(nextHighlight)
    successMessage.value = 'Highlight updated successfully.'
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Could not save highlight.'
  } finally {
    saving.value = false
  }
}

async function handleDeleteHighlight() {
  if (!activeHighlight.value) return

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await storiesApi.deleteHighlight(activeHighlight.value.id)
    const dbHighlights = await storiesApi.getMyHighlights()
    emit('updated', dbHighlights)
    window.dispatchEvent(new CustomEvent('story-highlights-updated'))
    resetState()
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || 'Could not delete highlight.'
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      syncOpenState()
    }
  },
)

watch(
  () => [props.initialMode, props.initialHighlightId, props.highlights] as const,
  () => {
    if (props.open) {
      syncOpenState()
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="highlight-sheet-overlay" @click.self="emit('close')">
      <section class="highlight-sheet" role="dialog" aria-modal="true" aria-label="Story highlights">
        <div class="highlight-sheet__handle"></div>

        <header class="highlight-sheet__header">
          <div>
            <h2>Story highlights</h2>
            <p>Save stories on your profile, rename them, or manage older stories.</p>
          </div>
          <button type="button" class="highlight-sheet__close" @click="emit('close')">x</button>
        </header>

        <p v-if="errorMessage" class="highlight-sheet__error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="highlight-sheet__success">{{ successMessage }}</p>

        <template v-if="mode === 'picker'">
          <div class="highlight-sheet__picker">
            <button type="button" class="highlight-sheet__new-card" @click="openCreate">
              <span class="highlight-sheet__new-icon">+</span>
              <div>
                <strong>Tạo mục nổi bật mới</strong>
                <span>Bắt đầu highlight mới với story này.</span>
              </div>
            </button>

            <div v-if="highlights.length" class="highlight-sheet__quick-list">
              <button
                v-for="highlight in highlights"
                :key="highlight.id"
                type="button"
                class="highlight-sheet__quick-item"
                :disabled="saving"
                @click="handleQuickAddToHighlight(highlight)"
              >
                <img
                  v-if="resolveMediaUrl(highlight.cover_media_url)"
                  :src="resolveMediaUrl(highlight.cover_media_url)"
                  :alt="highlight.title"
                  class="highlight-sheet__quick-image"
                />
                <div v-else class="highlight-sheet__quick-placeholder">+</div>
                <div class="highlight-sheet__quick-copy">
                  <strong>{{ highlight.title }}</strong>
                  <span>{{ highlight.story_count }} stories</span>
                </div>
                <span class="highlight-sheet__quick-state">
                  {{ selectedExistingHighlightIds.includes(highlight.id) ? 'Đã có' : 'Thêm' }}
                </span>
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="mode === 'list'">
          <button type="button" class="highlight-sheet__new-card" @click="openCreate">
            <span class="highlight-sheet__new-icon">+</span>
            <strong>New highlight</strong>
          </button>

          <div class="highlight-sheet__grid">
            <button
              v-for="highlight in highlights"
              :key="highlight.id"
              type="button"
              class="highlight-sheet__card"
              @click="openEdit(highlight)"
            >
              <img
                v-if="resolveMediaUrl(highlight.cover_media_url)"
                :src="resolveMediaUrl(highlight.cover_media_url)"
                :alt="highlight.title"
                class="highlight-sheet__card-image"
              />
              <div v-else class="highlight-sheet__card-placeholder">+</div>
              <strong>{{ highlight.title }}</strong>
              <span>{{ highlight.story_count }} stories</span>
            </button>
          </div>
        </template>

        <template v-else-if="mode === 'create'">
          <div class="highlight-sheet__editor">
            <div class="highlight-sheet__field">
              <label for="highlight-title">Highlight name</label>
              <input id="highlight-title" v-model="title" type="text" maxlength="100" placeholder="Weekend trip" />
            </div>

            <div class="highlight-sheet__field">
              <label>Chọn nơi lưu story này</label>
              <div class="highlight-sheet__create-grid">
                <button
                  type="button"
                  class="highlight-sheet__create-card highlight-sheet__create-card--new"
                  :disabled="saving"
                  @click="handleCreate()"
                >
                  <span class="highlight-sheet__create-plus">+</span>
                  <strong>Tin nổi bật mới</strong>
                </button>

                <button
                  v-for="highlight in highlights"
                  :key="highlight.id"
                  type="button"
                  class="highlight-sheet__create-card"
                  @click="handleQuickAddToHighlight(highlight)"
                >
                  <img
                    v-if="resolveMediaUrl(highlight.cover_media_url)"
                    :src="resolveMediaUrl(highlight.cover_media_url)"
                    :alt="highlight.title"
                    class="highlight-sheet__create-image"
                  />
                  <div v-else class="highlight-sheet__create-placeholder">+</div>
                  <strong>{{ highlight.title }}</strong>
                </button>
              </div>
            </div>

            <div class="highlight-sheet__actions">
              <button type="button" class="highlight-sheet__secondary" @click="resetState">
                Back
              </button>
              <button
                type="button"
                class="highlight-sheet__primary"
                :disabled="saving"
                @click="handleCreate()"
              >
                {{ saving ? 'Saving...' : 'Create highlight' }}
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="highlight-sheet__editor">
            <div class="highlight-sheet__field">
              <label for="highlight-title">Highlight name</label>
              <input id="highlight-title" v-model="title" type="text" maxlength="100" placeholder="Weekend trip" />
            </div>

            <div class="highlight-sheet__field">
              <label>Choose your stories</label>
              <div class="highlight-sheet__stories">
                <button
                  v-for="story in normalizedStories"
                  :key="story.id"
                  type="button"
                  class="highlight-sheet__story"
                  :class="{ 'highlight-sheet__story--selected': story.isSelected }"
                  @click="toggleStorySelection(story.id)"
                >
                  <img :src="story.safe_media_url" :alt="`Story ${story.id}`" class="highlight-sheet__story-image" />
                  <span class="highlight-sheet__story-check">{{ story.isSelected ? 'Selected' : 'Select' }}</span>
                </button>
              </div>
            </div>

            <div class="highlight-sheet__actions">
              <button type="button" class="highlight-sheet__secondary" @click="resetState">
                Back
              </button>
              <button
                v-if="mode === 'edit'"
                type="button"
                class="highlight-sheet__danger"
                :disabled="saving"
                @click="handleDeleteHighlight"
              >
                Delete
              </button>
              <button
                type="button"
                class="highlight-sheet__primary"
                :disabled="saving"
                @click="mode === 'create' ? handleCreate() : handleSaveEdit()"
              >
                {{ saving ? 'Saving...' : mode === 'create' ? 'Create highlight' : 'Save changes' }}
              </button>
            </div>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.highlight-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.56);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 10020;
}

.highlight-sheet {
  width: min(100%, 520px);
  max-height: min(78vh, 760px);
  overflow: auto;
  background: #202327;
  color: #fff;
  border-radius: 28px 28px 0 0;
  padding: 14px 18px 24px;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.32);
}

.highlight-sheet__handle {
  width: 56px;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  margin: 0 auto 16px;
}

.highlight-sheet__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.highlight-sheet__header h2 {
  margin: 0 0 6px;
  font-size: 1.85rem;
  font-weight: 800;
}

.highlight-sheet__header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.45;
}

.highlight-sheet__close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}

.highlight-sheet__error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.highlight-sheet__success {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.highlight-sheet__new-card,
.highlight-sheet__card {
  border: none;
  color: inherit;
  cursor: pointer;
}

.highlight-sheet__picker,
.highlight-sheet__quick-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.highlight-sheet__quick-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.highlight-sheet__quick-copy span,
.highlight-sheet__new-card span:last-child {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.highlight-sheet__quick-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.highlight-sheet__quick-image,
.highlight-sheet__quick-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  object-fit: cover;
  display: block;
  background: rgba(255, 255, 255, 0.08);
}

.highlight-sheet__quick-placeholder {
  display: grid;
  place-items: center;
}

.highlight-sheet__quick-copy {
  flex: 1;
}

.highlight-sheet__quick-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  font-weight: 700;
}

.highlight-sheet__new-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 18px;
  text-align: left;
}

.highlight-sheet__new-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 1.6rem;
  font-weight: 700;
}

.highlight-sheet__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.highlight-sheet__card {
  background: transparent;
  text-align: left;
}

.highlight-sheet__card-image,
.highlight-sheet__card-placeholder {
  width: 100%;
  aspect-ratio: 0.75;
  border-radius: 20px;
  display: block;
  object-fit: cover;
  margin-bottom: 8px;
}

.highlight-sheet__card-placeholder {
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  font-size: 2rem;
}

.highlight-sheet__card strong,
.highlight-sheet__card span {
  display: block;
}

.highlight-sheet__card span {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.82rem;
}

.highlight-sheet__editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.highlight-sheet__create-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.highlight-sheet__create-card {
  border: none;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.highlight-sheet__create-card--new {
  background: #111317;
  display: flex;
  min-height: 210px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
}

.highlight-sheet__create-plus {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  margin-bottom: auto;
  font-size: 2.4rem;
  line-height: 1;
}

.highlight-sheet__create-image,
.highlight-sheet__create-placeholder {
  width: 100%;
  aspect-ratio: 0.75;
  border-radius: 18px;
  display: block;
  object-fit: cover;
  margin-bottom: 10px;
}

.highlight-sheet__create-placeholder {
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  font-size: 2rem;
}

.highlight-sheet__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.highlight-sheet__field label {
  font-weight: 700;
}

.highlight-sheet__field input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  padding: 14px 16px;
}

.highlight-sheet__stories {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.highlight-sheet__story {
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.highlight-sheet__story-image {
  width: 100%;
  aspect-ratio: 0.75;
  object-fit: cover;
  border-radius: 18px;
  display: block;
  margin-bottom: 7px;
  border: 2px solid transparent;
}

.highlight-sheet__story--selected .highlight-sheet__story-image {
  border-color: #fff;
}

.highlight-sheet__story-check {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.08);
}

.highlight-sheet__story--selected .highlight-sheet__story-check {
  background: #fff;
  color: #0f172a;
  font-weight: 700;
}

.highlight-sheet__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.highlight-sheet__primary,
.highlight-sheet__secondary,
.highlight-sheet__danger {
  border: none;
  border-radius: 16px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}

.highlight-sheet__primary {
  background: #fff;
  color: #111827;
  flex: 1 1 180px;
}

.highlight-sheet__secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.highlight-sheet__danger {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

@media (max-width: 540px) {
  .highlight-sheet__grid,
  .highlight-sheet__stories,
  .highlight-sheet__create-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
