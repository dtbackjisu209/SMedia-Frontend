<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { storiesApi, type UserStories } from '../api/stories';
import StoryViewer from './StoryViewer.vue';
import StoryCreatePage from '../pages/StoryCreatePage.vue';

const authStore = useAuthStore();
const userStoriesList = ref<UserStories[]>([]);
const isLoading = ref(false);
const selectedUserIndex = ref<number | null>(null);
const showCreateStory = ref(false);

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const fetchStories = async () => {
  try {
    isLoading.value = true;
    const data = await storiesApi.getFeed();
    userStoriesList.value = data || [];
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    userStoriesList.value = [];
  } finally {
    isLoading.value = false;
  }
};

const goToCreate = () => {
  showCreateStory.value = true;
};

const openStory = (index: number) => {
  if (userStoriesList.value && userStoriesList.value[index]) {
    selectedUserIndex.value = index;
  }
};

const closeStory = () => {
  selectedUserIndex.value = null;
};

const handleNextUser = () => {
  if (selectedUserIndex.value !== null && userStoriesList.value && selectedUserIndex.value < userStoriesList.value.length - 1) {
    selectedUserIndex.value++;
  } else {
    closeStory();
  }
};

const handlePrevUser = () => {
  if (selectedUserIndex.value !== null && selectedUserIndex.value > 0) {
    selectedUserIndex.value--;
  }
};

onMounted(fetchStories);

defineExpose({ refresh: fetchStories });
</script>

<template>
  <section class="card stories-bar-container">
    <div class="flex items-center gap-4 py-2 px-1 overflow-x-auto no-scrollbar">
      
      <!-- Your Story Trigger -->
      <div class="story-item-custom group" @click="goToCreate">
        <div class="avatar-wrapper">
          <div class="avatar-circle">
            <img 
              v-if="authStore.user?.avatar_url" 
              :src="authStore.user.avatar_url" 
              class="avatar-img"
            />
            <div v-else class="avatar-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
          <div class="plus-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
        </div>
        <span class="story-label">Your story</span>
      </div>

      <!-- Loading Skeletons -->
      <template v-if="isLoading">
        <div v-for="i in 5" :key="i" class="story-item-custom animate-pulse">
          <div class="avatar-circle-skeleton"></div>
          <div class="label-skeleton"></div>
        </div>
      </template>

      <!-- Friends Stories -->
      <template v-else>
        <div 
          v-for="(userStories, index) in userStoriesList" 
          :key="userStories.userId"
          class="story-item-custom"
          @click="openStory(index)"
        >
          <div class="avatar-wrapper gradient-ring">
            <div class="avatar-circle inner-white">
              <img 
                :src="userStories.avatar_url || DEFAULT_AVATAR" 
                class="avatar-img"
              />
            </div>
          </div>
          <span class="story-label dark-text">{{ userStories.username }}</span>
        </div>
      </template>
    </div>

    <!-- Teleport Story Viewer -->
    <Teleport to="body">
      <StoryViewer 
        v-if="selectedUserIndex !== null && userStoriesList && userStoriesList[selectedUserIndex]"
        :stories="userStoriesList[selectedUserIndex].stories"
        :username="userStoriesList[selectedUserIndex].username"
        :avatar_url="userStoriesList[selectedUserIndex].avatar_url"
        @close="closeStory"
        @next-user="handleNextUser"
        @prev-user="handlePrevUser"
      />
    </Teleport>

    <!-- Modal Create Story -->
    <Teleport to="body">
      <div v-if="showCreateStory" class="modal-overlay" @click.self="showCreateStory = false">
        <div class="modal-content-wrapper">
          <StoryCreatePage @close="showCreateStory = false" @success="fetchStories" />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.stories-bar-container {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #dbdbdb;
  margin-bottom: 24px;
}

.flex { display: flex; }
.items-center { align-items: center; }
.gap-4 { gap: 16px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.story-item-custom {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  width: 66px;
  transition: transform 0.1s ease;
}

.story-item-custom:active {
  transform: scale(0.95);
}

.avatar-wrapper {
  position: relative;
  width: 66px;
  height: 66px;
  border-radius: 50%;
}

.avatar-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid #efefef;
  padding: 2px;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.plus-icon {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: #0095f6;
  color: #fff;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-label {
  font-size: 12px;
  color: #8e8e8e;
  text-align: center;
  max-width: 66px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gradient-ring {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  padding: 2px;
}

.inner-white {
  background: #fff;
  padding: 2px;
}

.dark-text {
  color: #262626;
  font-weight: 400;
}

/* Skeleton */
.avatar-circle-skeleton {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: #efefef;
}

.label-skeleton {
  width: 40px;
  height: 8px;
  background: #efefef;
  border-radius: 4px;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  backdrop-filter: blur(4px);
}

.modal-content-wrapper {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: white;
  border-radius: 12px;
  overflow-y: auto;
}
</style>
