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
  padding: 22px;
  margin-bottom: 0;
  border: 0;
  border-radius: 24px;
  box-shadow: none;
  background: #fff;
  display: grid;
  gap: 14px;
}

.row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(221, 227, 234, 0.9);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(139, 92, 246, 0.12)),
    var(--primary-soft);
  display: grid;
  place-items: center;
  color: var(--primary);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.avatar::before {
  content: '+';
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #fff;
  color: var(--primary);
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.14);
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.row-head > .muted {
  min-width: 58px;
  text-align: right;
  font-weight: 750;
  color: var(--muted);
}

.field {
  display: grid;
  gap: 8px;
}

.field > span,
.hashtag-head > span {
  font-size: 13px;
  font-weight: 750;
  color: var(--text);
}

.input,
.textarea {
  border-color: rgba(221, 227, 234, 0.95);
  border-radius: 16px;
  background: #fbfcfe;
  color: var(--text);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.input:hover,
.textarea:hover {
  border-color: rgba(148, 163, 184, 0.62);
}

.input:focus,
.textarea:focus {
  background: #fff;
}

.textarea {
  min-height: 128px;
  line-height: 1.55;
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
  border: 1px solid rgba(221, 227, 234, 0.94);
  border-radius: 999px;
  padding: 7px 13px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  color: var(--primary);
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.04);
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.hashtag-toggle:hover {
  background: var(--primary-soft);
  border-color: rgba(37, 99, 235, 0.24);
  transform: translateY(-1px);
}

.hashtag-topic-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hashtag-topic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(221, 227, 234, 0.92);
  border-radius: 14px;
  padding: 9px 11px;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 700;
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
  color: #0f766e;
  border-color: #99f6e4;
  background: #f0fdfa;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 999px;
  padding: 6px 11px;
  background: var(--primary-soft);
  color: var(--primary-dark);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

input[type='file'].input {
  padding: 9px;
  background: #fff;
}

input[type='file'].input::file-selector-button {
  margin-right: 12px;
  border: 0;
  border-radius: 12px;
  padding: 9px 13px;
  background: var(--text);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: 10px;
}

.preview-item {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f8fafc;
}

.preview-media {
  width: 100%;
  height: 124px;
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
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: 800;
}

.actions {
  margin: 4px -22px -22px;
  padding: 14px 22px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(221, 227, 234, 0.9);
  background: #fbfcfe;
  border-radius: 0 0 24px 24px;
}

.action-btn {
  width: auto;
  min-width: 132px;
  border-radius: 14px;
  padding: 11px 16px;
}

.error {
  color: var(--danger);
  margin: 8px 0 0;
  border: 1px solid rgba(225, 29, 72, 0.22);
  background: rgba(225, 29, 72, 0.06);
  border-radius: 14px;
  padding: 10px 12px;
  font-weight: 650;
}

@media (max-width: 640px) {
  .wrapper {
    padding: 18px;
    border-radius: 20px;
  }

  .row-head {
    gap: 12px;
  }

  .hashtag-topic-list {
    grid-template-columns: 1fr;
  }

  .actions {
    margin: 2px -18px -18px;
    padding: 12px 18px;
  }

  .action-btn {
    min-width: 0;
    flex: 1;
  }
}
</style>
