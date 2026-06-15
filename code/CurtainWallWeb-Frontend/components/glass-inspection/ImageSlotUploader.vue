<template>
  <div class="gi-card-surface gi-panel">
    <div
      :class="['gi-drop-zone', { 'gi-drop-zone--disabled': disabled }]"
      @click="openFileDialog"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <template v-if="activeFile && activePreview">
        <div class="gi-drop-zone__preview">
          <img :src="activePreview" :alt="`上传预览 ${currentIndex + 1}`">
          <button
            type="button"
            class="gi-remove-button"
            :disabled="disabled"
            @click.stop="$emit('remove', currentIndex)"
          >
            <UIcon name="i-heroicons-x-mark" />
          </button>
        </div>
      </template>

      <template v-else>
        <div class="gi-drop-zone__empty">
          <div class="gi-drop-zone__icon">
            <UIcon name="i-heroicons-arrow-up-tray" />
          </div>
          <strong>点击上传或拖拽图片到此处</strong>
          <span>支持 JPG、PNG、WEBP 格式，建议上传清晰无遮挡的现场原图。</span>
        </div>
      </template>

      <input
        ref="inputRef"
        class="hidden"
        type="file"
        :accept="accept"
        :disabled="disabled"
        @change="handleFileChange"
      >
    </div>

    <div v-if="files.length > 1" class="gi-slot-strip">
      <button type="button" class="gi-slot-nav" :disabled="disabled" @click="$emit('go-prev')">
        <UIcon name="i-heroicons-chevron-left" />
      </button>

      <div class="gi-slot-status">
        <p class="gi-slot-status__tip">
          {{ activeFile ? '当前槽位已完成上传' : activeTip }}
        </p>
        <div class="gi-progress">
          <span :style="{ width: `${progressWidth}%` }" />
        </div>
        <div class="gi-slot-status__count">
          槽位 {{ currentIndex + 1 }}/{{ files.length }} · 已上传 {{ filledCount }}/{{ files.length }}
        </div>
      </div>

      <button type="button" class="gi-slot-nav" :disabled="disabled" @click="$emit('go-next')">
        <UIcon name="i-heroicons-chevron-right" />
      </button>
    </div>

    <div v-else class="gi-slot-status" style="margin-top: 14px;">
      <div class="gi-progress">
        <span :style="{ width: filledCount > 0 ? '100%' : '0%' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    files: (File | null)[]
    previewUrls: (string | null)[]
    currentIndex: number
    disabled?: boolean
    slotTips?: string[]
    accept?: string
  }>(),
  {
    disabled: false,
    slotTips: () => [],
    accept: 'image/*'
  }
)

const emit = defineEmits<{
  (event: 'select-file', payload: { index: number; file: File }): void
  (event: 'remove', index: number): void
  (event: 'go-prev'): void
  (event: 'go-next'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const filledCount = computed(() => props.files.filter(Boolean).length)
const activeFile = computed(() => props.files[props.currentIndex] ?? null)
const activePreview = computed(() => props.previewUrls[props.currentIndex] ?? null)
const activeTip = computed(() => props.slotTips[props.currentIndex] || '请上传当前槽位图片')
const progressWidth = computed(() => {
  if (!props.files.length) {
    return 0
  }
  return (filledCount.value / props.files.length) * 100
})

const emitSelectedFile = (file: File | undefined) => {
  if (!file || props.disabled || !file.type.startsWith('image/')) {
    return
  }
  emit('select-file', { index: props.currentIndex, file })
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emitSelectedFile(target.files?.[0])
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  if (props.disabled) {
    return
  }
  emitSelectedFile(event.dataTransfer?.files?.[0])
}

const openFileDialog = () => {
  if (!props.disabled) {
    inputRef.value?.click()
  }
}
</script>
