<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { storiesApi } from "../api/stories";

const props = defineProps<{
  stories: any[];
  username: string;
  avatar_url: string;
  userId: string;
}>();

const emit = defineEmits(["close", "next-user", "prev-user", "story-deleted"]);

const authStore = useAuthStore();
const currentIndex = ref(0);
const progress = ref(0);
const isPaused = ref(false);
const isDeleting = ref(false);
let progressInterval: number | null = null;
const STORY_DURATION = 5000; // 5s per story

const currentStory = computed(() => props.stories[currentIndex.value]);
const isOwnStory = computed(() => props.userId === authStore.userId);

const startProgress = () => {
  stopProgress();
  progress.value = 0;
  const startTime = Date.now();
  
  progressInterval = window.setInterval(() => {
    if (!isPaused.value) {
      const elapsed = Date.now() - startTime;
      progress.value = Math.min((elapsed / STORY_DURATION) * 100, 100);
      
      if (progress.value >= 100) {
        nextStory();
      }
    }
  }, 32);
};

const stopProgress = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

const nextStory = () => {
  if (currentIndex.value < props.stories.length - 1) {
    currentIndex.value++;
    startProgress();
  } else {
    emit("next-user");
  }
};

const prevStory = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    startProgress();
  } else {
    emit("prev-user");
  }
};

const handleScreenClick = (e: MouseEvent) => {
  const width = window.innerWidth;
  if (e.clientX < width / 3) {
    prevStory();
  } else {
    nextStory();
  }
};

const handleDeleteStory = async () => {
  if (!currentStory.value || isDeleting.value) return;
  
  const confirmed = confirm("Are you sure you want to delete this story?");
  if (!confirmed) return;

  isDeleting.value = true;
  isPaused.value = true;
  
  try {
    await storiesApi.deleteStory(currentStory.value.id);
    emit("story-deleted", { userId: props.userId, storyId: currentStory.value.id });
    
    // If it was the last story, close or go to next user
    if (props.stories.length <= 1) {
      emit("close");
    } else {
      // Remove local story and adjust index if necessary
      if (currentIndex.value >= props.stories.length - 1) {
        currentIndex.value--;
      }
      isDeleting.value = false;
      isPaused.value = false;
      startProgress();
    }
  } catch (error) {
    console.error("Failed to delete story:", error);
    alert("Failed to delete story. Please try again.");
    isDeleting.value = false;
    isPaused.value = false;
  }
};

onMounted(() => {
  startProgress();
});

onUnmounted(() => {
  stopProgress();
});

// Reset if user changes (next-user/prev-user)
watch(() => props.username, () => {
  currentIndex.value = 0;
  startProgress();
});
</script>

<template>
  <div class="story-viewer-overlay" @click.self="emit('close')">
    <div class="story-container" @mousedown="isPaused = true" @mouseup="isPaused = false">
      
      <!-- Progress Bars -->
      <div class="progress-bar-container">
        <div 
          v-for="(story, index) in stories" 
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
          <img :src="avatar_url" class="viewer-avatar" />
          <span class="viewer-username">{{ username }}</span>
          <span class="story-time">Just now</span>
        </div>
        <div class="header-actions">
          <button v-if="isOwnStory" class="delete-btn" @click="handleDeleteStory" :disabled="isDeleting">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
          <button class="close-btn" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </header>

      <!-- Media Content -->
      <div class="media-content" @click="handleScreenClick">
        <video 
          v-if="currentStory?.type === 'video'"
          :src="currentStory?.media_url" 
          class="main-media" 
          autoplay
          muted
          playsinline
          @ended="nextStory"
          @error="console.error('Failed to load story video')"
        ></video>
        <img 
          v-else
          :src="currentStory?.media_url" 
          class="main-media" 
          @error="console.error('Failed to load story media')"
        />
        <div v-if="currentStory?.caption" class="caption-overlay">
          {{ currentStory.caption }}
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
  z-index: 20;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-btn, .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.delete-btn:hover, .close-btn:hover {
  opacity: 0.7;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
</style>
