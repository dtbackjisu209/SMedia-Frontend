<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { resolveAvatar, resolveMediaUrl } from '@/shared/constants/avatar'
import StoryHighlightSheet from './StoryHighlightSheet.vue'
import { storiesApi, type MyStoryItem, type StoryHighlight } from '../api/stories'

const props = defineProps<{
  stories: Array<{
    id: string
    media_url: string
    created_at?: string
    type?: 'image' | 'video'
    media_type?: 'image' | 'video'
    caption?: string
  }>
  userId: string
  username: string
  avatar_url: string
}>()

const emit = defineEmits(['close', 'next-user', 'prev-user'])

const authStore = useAuthStore()

const currentIndex = ref(0)
const progress = ref(0)
const isPaused = ref(false)
const highlightMessage = ref('')
const highlightError = ref('')
const isHighlightLoading = ref(false)
const myHighlights = ref<StoryHighlight[]>([])
const myStories = ref<MyStoryItem[]>([])
const isHighlightSheetOpen = ref(false)
let progressInterval: number | null = null
let highlightMessageTimeout: number | null = null
const STORY_DURATION = 5000

const currentStory = computed(() => props.stories[currentIndex.value])
const currentStoryId = computed(() => Number(currentStory.value?.id ?? 0))
const viewerUserId = computed(() => String(props.userId ?? ''))
const authUserId = computed(() => String(authStore.userId ?? ''))
const isOwnStory = computed(() => Boolean(viewerUserId.value) && viewerUserId.value === authUserId.value)
const currentStoryType = computed(() => currentStory.value?.type ?? currentStory.value?.media_type ?? 'image')
const currentStoryMediaUrl = computed(() => resolveMediaUrl(currentStory.value?.media_url))
const highlightedEntry = computed(() => {
  const storyId = currentStoryId.value
  if (!storyId) return null

  for (const highlight of myHighlights.value) {
    if (highlight.stories.some((story) => Number(story.id) === storyId)) {
      return highlight
    }
  }

  return null
})
const isCurrentStoryHighlighted = computed(() => Boolean(highlightedEntry.value))

function setTransientMessage(message: string) {
  highlightMessage.value = message
  if (highlightMessageTimeout) {
    window.clearTimeout(highlightMessageTimeout)
  }
  highlightMessageTimeout = window.setTimeout(() => {
    highlightMessage.value = ''
  }, 1800)
}

async function loadMyHighlights() {
  if (!isOwnStory.value) {
    myHighlights.value = []
    myStories.value = []
    return
  }

  try {
    myHighlights.value = await storiesApi.getMyHighlights()
  } catch (error) {
    console.error('Failed to load highlights:', error)
  }

  try {
    myStories.value = await storiesApi.getMyStories()
  } catch (error) {
    console.error('Failed to load my stories:', error)
  }
}

function openHighlightSheet() {
  if (!isOwnStory.value || isHighlightLoading.value) return
  highlightError.value = ''
  isHighlightSheetOpen.value = true
  stopProgress()
  isPaused.value = true
}

async function handleHighlightUpdate(highlights: StoryHighlight[]) {
  myHighlights.value = highlights.filter((highlight) => highlight.story_count > 0)
  await loadMyHighlights()
  setTransientMessage('Highlights updated')
}

function handleCloseHighlightSheet() {
  isHighlightSheetOpen.value = false
  isPaused.value = false
  startProgress()
}

const startProgress = () => {
  stopProgress()
  progress.value = 0
  const startTime = Date.now()
  
  progressInterval = window.setInterval(() => {
    if (!isPaused.value) {
      const elapsed = Date.now() - startTime
      progress.value = Math.min((elapsed / STORY_DURATION) * 100, 100)
      
      if (progress.value >= 100) {
        nextStory()
      }
    }
  }, 32)
}

const stopProgress = () => {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

const nextStory = () => {
  if (currentIndex.value < props.stories.length - 1) {
    currentIndex.value++
    startProgress()
  } else {
    emit('next-user')
  }
}

const prevStory = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    startProgress()
  } else {
    emit('prev-user')
  }
}

const handleScreenClick = (e: MouseEvent) => {
  const width = window.innerWidth
  if (e.clientX < width / 3) {
    prevStory()
  } else {
    nextStory()
  }
}

onMounted(() => {
  startProgress()
  void loadMyHighlights()
})

onUnmounted(() => {
  stopProgress()
  if (highlightMessageTimeout) {
    window.clearTimeout(highlightMessageTimeout)
  }
})

watch(() => props.username, () => {
  currentIndex.value = 0
  highlightError.value = ''
  highlightMessage.value = ''
  startProgress()
  void loadMyHighlights()
})

watch(() => props.userId, () => {
  void loadMyHighlights()
})

watch(isHighlightSheetOpen, (open) => {
  if (open) {
    stopProgress()
    isPaused.value = true
    return
  }

  isPaused.value = false
})
</script>

<template>
  <div class="story-viewer-overlay" @click.self="emit('close')">
    <div class="story-container" @mousedown="isPaused = true" @mouseup="isPaused = false">
      
      <!-- Progress Bars -->
      <div class="progress-bar-container">
        <div 
          v-for="(_, index) in stories" 
          :key="index" 
          class="progress-segment"
        >
          <div 
            class="progress-fill" 
            :style="{ 
              width: index === currentIndex ? `${progress}%` : (index < currentIndex ? '100%' : '0%') 
            }"
          ></div>
        </div>
      </div>

      <!-- Header -->
      <header class="story-header">
        <div class="user-info">
          <img :src="resolveAvatar(avatar_url)" class="viewer-avatar" />
          <span class="viewer-username">{{ username }}</span>
          <span class="story-time">Just now</span>
        </div>
        <div class="story-actions">
          <button
            v-if="isOwnStory"
            class="highlight-btn"
            :class="{ 'highlight-btn--active': isCurrentStoryHighlighted }"
            :disabled="isHighlightLoading"
            type="button"
            @click.stop="openHighlightSheet"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M12 21s-6.716-4.377-9.193-8.194C.978 10.023 1.404 6.2 4.56 4.4c2.254-1.286 4.963-.68 6.44 1.23 1.477-1.91 4.187-2.516 6.44-1.23 3.156 1.8 3.582 5.623 1.753 8.406C18.716 16.623 12 21 12 21Z"
              />
            </svg>
          </button>
          <button class="close-btn" @click="emit('close')">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <!-- Media Content -->
      <div class="media-content" @click="handleScreenClick">
        <video 
          v-if="currentStoryType === 'video'"
          :src="currentStoryMediaUrl" 
          class="main-media" 
          autoplay
          muted
          playsinline
          @ended="nextStory"
          @error="console.error('Failed to load story video')"
        ></video>
        <img 
          v-else
          :src="currentStoryMediaUrl" 
          class="main-media" 
          @error="console.error('Failed to load story media')"
        />
        <div v-if="currentStory?.caption" class="caption-overlay">
          {{ currentStory.caption }}
        </div>
        <div v-if="highlightMessage" class="highlight-toast">
          {{ highlightMessage }}
        </div>
        <div v-if="highlightError" class="highlight-error">
          {{ highlightError }}
        </div>
      </div>

      <!-- Navigation Arrows (Desktop) -->
      <button class="nav-btn prev" @click.stop="prevStory">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button class="nav-btn next" @click.stop="nextStory">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
      </button>
    </div>
  </div>
  <StoryHighlightSheet
    :open="isHighlightSheetOpen"
    :current-story-id="currentStoryId || null"
    :highlights="myHighlights"
    :stories="myStories"
    @close="handleCloseHighlightSheet"
    @updated="handleHighlightUpdate"
  />
</template>

<style scoped>
.story-viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.story-container {
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 90vh;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.progress-bar-container {
  display: flex;
  gap: 4px;
  padding: 10px;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 10;
}

.progress-segment {
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
}

.story-header {
  padding: 20px 10px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  position: absolute;
  top: 10px;
  width: 100%;
  z-index: 10;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.viewer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid white;
}

.viewer-username {
  font-weight: 600;
  font-size: 14px;
}

.story-time {
  font-size: 12px;
  opacity: 0.7;
}

.story-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.media-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.main-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.caption-overlay {
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  font-size: 15px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: none;
}

@media (min-width: 768px) {
  .nav-btn { display: flex; align-items: center; justify-content: center; }
  .nav-btn.prev { left: -60px; }
  .nav-btn.next { right: -60px; }
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
}

.highlight-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  background: rgba(0, 0, 0, 0.85);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}

.highlight-btn svg {
  display: block;
}

.highlight-btn path {
  fill: #0b0b0b;
  stroke: #fff;
  stroke-width: 1.7;
  transition: fill 0.2s ease, stroke 0.2s ease;
}

.highlight-btn:hover {
  transform: scale(1.06);
}

.highlight-btn--active {
  background: rgba(255, 255, 255, 0.14);
}

.highlight-btn--active path {
  fill: #fff;
  stroke: #fff;
}

.highlight-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.highlight-toast,
.highlight-error {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 32px);
  padding: 9px 14px;
  border-radius: 999px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  pointer-events: none;
}

.highlight-toast {
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.highlight-error {
  background: rgba(127, 29, 29, 0.86);
  border: 1px solid rgba(248, 113, 113, 0.35);
}
</style>
