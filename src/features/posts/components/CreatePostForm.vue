<script setup lang="ts">
import { ref } from 'vue'
import { uploadFilesToCloudinary } from '@/features/posts/api/posts.api'
import { usePostsStore } from '@/features/posts/store/posts.store'

const emit = defineEmits<{
  submitted: []
  cancel: []
}>()

type SelectedMedia = {
  id: string
  file: File
  previewUrl: string
}

const postsStore = usePostsStore()
const caption = ref('')
const location = ref('')
const selectedMedia = ref<SelectedMedia[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const isSubmitting = ref(false)
const localError = ref('')
const isHashtagListOpen = ref(false)
const selectedTags = ref<string[]>([])

const POPULAR_TOPICS = [
  'travel',
  'food',
  'fashion',
  'fitness',
  'music',
  'technology',
  'education',
  'photography',
  'lifestyle',
  'business',
] as const

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, '').toLowerCase()
}

function toggleHashtagList() {
  isHashtagListOpen.value = !isHashtagListOpen.value
}

function hasSelectedTag(tag: string): boolean {
  const normalized = normalizeTag(tag)
  return selectedTags.value.includes(normalized)
}

function addTag(tag: string) {
  const normalized = normalizeTag(tag)
  if (!normalized || hasSelectedTag(normalized)) return
  selectedTags.value = [...selectedTags.value, normalized]
}

function removeTag(tag: string) {
  const normalized = normalizeTag(tag)
  selectedTags.value = selectedTags.value.filter((item) => item !== normalized)
}

function onSelectFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []

  const nextItems = files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }))

  const existingIds = new Set(selectedMedia.value.map((item) => item.id))
  const uniqueItems = nextItems.filter((item) => !existingIds.has(item.id))

  selectedMedia.value = [...selectedMedia.value, ...uniqueItems]

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  localError.value = ''
}

function removeSelected(index: number) {
  const target = selectedMedia.value[index]
  if (target) {
    URL.revokeObjectURL(target.previewUrl)
  }
  selectedMedia.value = selectedMedia.value.filter((_, itemIndex) => itemIndex !== index)
}

function clearSelectedMedia() {
  selectedMedia.value.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  selectedMedia.value = []
}

function isSupportedMediaType(file: File): boolean {
  return file.type.startsWith('image/') || file.type.startsWith('video/')
}

function validateFiles(files: File[]): string | null {
  if (files.length === 0) {
    return 'Please select at least one image or video.'
  }

  if (files.length > 10) {
    return 'You can upload up to 10 files per post.'
  }

  const invalidFile = files.find((file) => !isSupportedMediaType(file))
  if (invalidFile) {
    return `Unsupported file type: ${invalidFile.name}`
  }

  return null
}

async function submitPost() {
  const files = selectedMedia.value.map((item) => item.file)
  const filesError = validateFiles(files)
  if (filesError) {
    localError.value = filesError
    return
  }

  isSubmitting.value = true
  localError.value = ''

  try {
    const uploadedMedia = await uploadFilesToCloudinary(files)

    await postsStore.createPost({
      caption: caption.value.trim() || undefined,
      location: location.value.trim() || undefined,
      tags: selectedTags.value.length > 0 ? [...selectedTags.value] : undefined,
      media: uploadedMedia.map((item, index) => ({
        media_url: item.media_url,
        media_type: item.media_type,
        position: index,
      })),
    })

    caption.value = ''
    location.value = ''
    selectedTags.value = []
    isHashtagListOpen.value = false
    clearSelectedMedia()
    emit('submitted')
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Could not publish your post.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="card wrapper">
    <header class="row-head">
      <div class="profile-head">
        <span class="avatar"></span>
        <div>
          <h3 class="section-title">Create Post</h3>
          <p class="muted hint">Select files, upload to cloud, then save post to database.</p>
        </div>
      </div>
      <span class="muted">{{ caption.length }}/300</span>
    </header>

    <label class="field">
      <span>Caption</span>
      <textarea
        v-model="caption"
        class="textarea"
        maxlength="300"
        placeholder="Write a caption..."
      ></textarea>
    </label>

    <label class="field">
      <span>Location (optional)</span>
      <input v-model="location" class="input" type="text" maxlength="255" placeholder="Da Nang, Vietnam" />
    </label>

    <section class="field hashtag-field">
      <div class="hashtag-head">
        <span>Hashtags</span>
        <button class="hashtag-toggle" type="button" @click="toggleHashtagList">
          {{ isHashtagListOpen ? 'Hide topic list' : 'Choose hashtag topic' }}
        </button>
      </div>

      <div v-if="isHashtagListOpen" class="hashtag-topic-list">
        <article v-for="topic in POPULAR_TOPICS" :key="topic" class="hashtag-topic-item">
          <span>#{{ topic }}</span>
          <button
            v-if="!hasSelectedTag(topic)"
            class="hashtag-add-btn"
            type="button"
            aria-label="Add hashtag"
            @click="addTag(topic)"
          >
            +
          </button>
          <button
            v-else
            class="hashtag-added-btn"
            type="button"
            aria-label="Remove hashtag"
            @click="removeTag(topic)"
          >
            Added
          </button>
        </article>
      </div>

      <div v-if="selectedTags.length > 0" class="selected-tags">
        <button v-for="tag in selectedTags" :key="tag" type="button" class="tag-chip" @click="removeTag(tag)">
          #{{ tag }} x
        </button>
      </div>
      <small class="muted">Tap + to add a topic hashtag to this post.</small>
    </section>

    <label class="field">
      <span>Upload media (image/video)</span>
      <input ref="fileInputRef" class="input" type="file" multiple accept="image/*,video/*" @change="onSelectFiles" />
      <small class="muted">Selected files: {{ selectedMedia.length }}</small>
    </label>

    <section v-if="selectedMedia.length > 0" class="preview-grid">
      <article v-for="(item, index) in selectedMedia" :key="item.id" class="preview-item">
        <img v-if="item.file.type.startsWith('image/')" :src="item.previewUrl" class="preview-media" alt="Selected image" />
        <video v-else :src="item.previewUrl" class="preview-media" muted playsinline></video>
        <button type="button" class="remove-btn" @click="removeSelected(index)">x</button>
      </article>
    </section>

    <p v-if="localError" class="error">{{ localError }}</p>
    <div class="actions">
      <button class="button secondary action-btn" type="button" :disabled="isSubmitting" @click="emit('cancel')">
        Cancel
      </button>
      <button class="button action-btn" type="button" :disabled="isSubmitting" @click="submitPost">
        {{ isSubmitting ? 'Posting...' : 'Publish Post' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.wrapper {
  padding: 14px;
  margin-bottom: 8px;
}

.row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
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

.hint {
  margin: 0;
  font-size: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.hashtag-field {
  gap: 10px;
}

.hashtag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hashtag-toggle {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
}

.hashtag-topic-list {
  display: grid;
  gap: 8px;
}

.hashtag-topic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  background: #fafafa;
}

.hashtag-add-btn,
.hashtag-added-btn {
  border: 1px solid var(--border);
  border-radius: 999px;
  min-width: 34px;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  background: #fff;
}

.hashtag-add-btn {
  font-size: 18px;
  line-height: 1;
}

.hashtag-added-btn {
  color: #166534;
  border-color: #86efac;
  background: #f0fdf4;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  background: #fff;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.preview-item {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f7f7f7;
}

.preview-media {
  width: 100%;
  height: 110px;
  object-fit: cover;
  display: block;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.64);
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
}

.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-btn {
  width: auto;
  min-width: 120px;
}

.error {
  color: var(--danger);
  margin: 8px 0 0;
}
</style>
