<script setup lang="ts">
interface Props {
  show: boolean;
  result: {
    status: string;
    reason: string;
    category: string;
  } | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'confirm']);

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    'violence': 'Bạo lực',
    'hate': 'Ngôn từ thù ghét',
    'sexual': 'Nội dung nhạy cảm',
    'spam': 'Spam/Lừa đảo',
    'horror': 'Nội dung kinh dị',
    'normal': 'Bình thường'
  };
  return categories[category] || category;
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="moderation-modal">
      <div class="p-6 text-center">
        <!-- Icon cảnh báo vuông vắn -->
        <div class="inline-flex items-center justify-center w-14 h-14 bg-red-50 mb-4 border border-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h3 class="text-base font-black text-gray-900 uppercase tracking-tighter mb-2">Nội dung bị chặn</h3>
        <p class="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
          Nội dung không phù hợp với tiêu chuẩn cộng đồng.
        </p>

        <!-- Khung chi tiết vuông -->
        <div class="bg-gray-50 p-4 text-left mb-6 border border-gray-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 bg-red-600"></div>
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {{ getCategoryLabel(result?.category || '') }}
            </span>
          </div>
          <p class="text-xs text-gray-700 font-bold uppercase leading-tight">
            {{ result?.reason || 'VI PHẠM TIÊU CHUẨN CỘNG ĐỒNG.' }}
          </p>
        </div>

        <button 
          class="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors" 
          @click="emit('close')"
        >
          Chỉnh sửa lại
        </button>
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
  padding: 20px;
}

.moderation-modal {
  width: 100%;
  max-width: 300px;
  background: white;
  /* Loại bỏ bo góc để tạo hình vuông */
  border: 1px solid #eee;
  box-shadow: 20px 20px 0px rgba(0, 0, 0, 0.1);
  animation: modal-appear 0.2s ease-out;
}

@keyframes modal-appear {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
