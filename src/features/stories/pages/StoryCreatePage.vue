<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storiesApi } from '../api/stories';
import { useAuthStore } from '@/features/auth/store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const emit = defineEmits(['success', 'close']);

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const filePreview = ref<string | null>(null);
const caption = ref('');
const location = ref('');
const isUploading = ref(false);
const uploadProgress = ref(0);

const MAX_CAPTION_LENGTH = 300;

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    selectedFile.value = file;
    filePreview.value = URL.createObjectURL(file);
  }
};

const removeFile = () => {
  selectedFile.value = null;
  filePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const handleCancel = () => {
  if (selectedFile.value || caption.value || location.value) {
    if (confirm('Discard changes?')) {
      emit('close');
      router.back();
    }
  } else {
    emit('close');
    router.back();
  }
};

const handlePublish = async () => {
  if (!selectedFile.value) return;

  try {
    isUploading.value = true;
    uploadProgress.value = 0;

    await storiesApi.uploadStory(
      selectedFile.value, 
      { 
        caption: caption.value, 
        location: location.value 
      },
      (percent) => {
        uploadProgress.value = percent;
      }
    );

    uploadProgress.value = 100;
    
    emit('success');
    emit('close');

    setTimeout(() => {
      router.push('/');
    }, 500);

  } catch (error) {
    console.error('Failed to upload story:', error);
    alert('Failed to upload story. Please try again.');
  } finally {
    isUploading.value = false;
  }
};

const isVideo = computed(() => {
  return selectedFile.value?.type.startsWith('video/');
});
</script>

<template>
  <div class="modal-overlay" @click.self="handleCancel">
    <div class="create-story-card card">
      <!-- Header -->
      <header class="modal-header">
        <button class="btn-icon" @click="handleCancel">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h3>Create Story</h3>
        <button 
          class="btn-publish" 
          :disabled="!selectedFile || isUploading"
          @click="handlePublish"
        >
          <span v-if="!isUploading">Publish</span>
          <span v-else>Processing...</span>
        </button>
      </header>

      <div class="modal-content">
        <!-- Media Upload Area -->
        <div class="upload-section" :class="{ 'has-file': !!filePreview }">
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            accept="image/*,video/*" 
            @change="handleFileChange"
          />

          <template v-if="!filePreview">
            <div class="upload-placeholder" @click="triggerFileInput">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              <p>Drag photos and videos here</p>
              <button class="btn-primary-small">Select from computer</button>
            </div>
          </template>

          <template v-else>
            <div class="preview-container">
              <img v-if="!isVideo" :src="filePreview" class="preview-media" />
              <video v-else :src="filePreview" class="preview-media" controls autoplay muted loop></video>
              <button class="btn-remove-file" @click="removeFile" title="Remove file">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <div class="file-name-badge">
                {{ selectedFile?.name }}
              </div>
            </div>
          </template>
        </div>

        <!-- Form Section -->
        <div class="form-section">
          <div class="user-info">
            <div class="avatar-container">
              <img :src="authStore.user?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" class="avatar-small" />
            </div>
            <span class="username">{{ authStore.user?.username }}</span>
          </div>

          <div class="input-group">
            <textarea 
              v-model="caption" 
              placeholder="Write a caption..." 
              :maxlength="MAX_CAPTION_LENGTH"
              rows="6"
              class="caption-textarea"
            ></textarea>
            <div class="textarea-footer">
              <div class="emoji-btn">
                <svg color="#8e8e8e" fill="#8e8e8e" height="20" viewBox="0 0 24 24" width="20"><path d="M15.83 10.997a1.167 1.167 0 101.167 1.167 1.167 1.167 0 00-1.167-1.167zm-7.66 0a1.167 1.167 0 101.166 1.167 1.167 1.167 0 00-1.166-1.167zm3.83 6.13a5.206 5.206 0 01-4.008-1.933 1.03 1.03 0 111.59-1.303 3.14 3.14 0 004.836 0 1.03 1.03 0 111.59 1.303A5.206 5.206 0 0112 17.127zM12 2.091a9.91 9.91 0 109.91 9.91A9.91 9.91 0 0012 2.091zM12 20a8 8 0 118-8 8.01 8.01 0 01-8 8z"></path></svg>
              </div>
              <span class="counter">{{ caption.length }}/{{ MAX_CAPTION_LENGTH }}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="input-group">
            <div class="location-row">
              <input 
                v-model="location" 
                type="text" 
                placeholder="Add location" 
                class="location-input"
              />
              <svg color="#262626" fill="#262626" height="16" viewBox="0 0 24 24" width="16"><path d="M12.005 16.762l5.712 3.12a.307.307 0 00.441-.307l-1.074-6.358 4.603-4.521a.308.308 0 00-.171-.522l-6.352-.94-2.828-5.748a.308.308 0 00-.553 0L9.03 8.287l-6.352.94a.308.308 0 00-.171.522l4.603 4.521-1.074 6.358a.307.307 0 00.441.307z"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Progress Overlay -->
      <div v-if="isUploading" class="progress-overlay">
        <div class="progress-content">
          <p class="progress-text">{{ uploadProgress < 100 ? 'Uploading...' : 'Finishing...' }}</p>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p class="progress-percent">{{ uploadProgress }}%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.create-story-card {
  width: 100%;
  max-width: 850px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}

.modal-header {
  height: 44px;
  border-bottom: 1px solid #efefef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #262626;
  display: flex;
  align-items: center;
}

.btn-publish {
  background: none;
  border: none;
  color: #0095f6;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.btn-publish:hover:not(:disabled) {
  color: #00376b;
}

.btn-publish:disabled {
  color: #b2dffc;
  cursor: default;
}

.modal-content {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  min-height: 500px;
}

/* Media Area */
.upload-section {
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.upload-section.has-file {
  background: #262626;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.upload-placeholder p {
  font-size: 20px;
  color: #262626;
  font-weight: 300;
}

.btn-primary-small {
  background: #0095f6;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.preview-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.preview-media {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.btn-remove-file {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-remove-file:hover {
  background: rgba(0, 0, 0, 0.8);
}

.file-name-badge {
  position: absolute;
  bottom: 15px;
  left: 15px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  max-width: 80%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Form Area */
.form-section {
  padding: 20px;
  border-left: 1px solid #efefef;
  display: flex;
  flex-direction: column;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.username {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
}

.caption-textarea {
  width: 100%;
  border: none;
  resize: none;
  font-size: 16px;
  color: #262626;
  outline: none;
  line-height: 1.4;
  padding: 0;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.emoji-btn {
  cursor: pointer;
}

.counter {
  font-size: 12px;
  color: #c7c7c7;
}

.divider {
  height: 1px;
  background: #efefef;
  margin: 16px 0;
}

.location-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-input {
  border: none;
  font-size: 16px;
  width: 90%;
  outline: none;
  color: #262626;
}

/* Progress Area */
.progress-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.progress-content {
  width: 70%;
  text-align: center;
}

.progress-text {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 15px;
}

.progress-bar-container {
  width: 100%;
  height: 4px;
  background: #efefef;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #0095f6;
  transition: width 0.1s linear;
}

.progress-percent {
  font-size: 12px;
  color: #8e8e8e;
  margin-top: 8px;
}

.hidden { display: none; }

@media (max-width: 850px) {
  .create-story-card {
    max-width: 95%;
  }
  .modal-content {
    grid-template-columns: 1fr;
    max-height: 80vh;
    overflow-y: auto;
  }
  .form-section {
    border-left: none;
    border-top: 1px solid #efefef;
  }
}
</style>
