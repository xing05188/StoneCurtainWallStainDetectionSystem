<template>
  <UDashboardPage class="min-h-0">
    <UDashboardPanel grow class="min-h-0">
      <UDashboardNavbar title="玻璃自爆检测" />

      <UDashboardPanelContent class="gi-panel-content">
      <div class="gi-page">
        <div class="gi-shell">
          <FeaturePageHero
            icon="i-material-symbols-sound-detection-glass-break-rounded"
            title="玻璃自爆检测"
            description="上传玻璃图片后，系统将自动识别疑似自爆特征、爆裂扩散形态与明显破损区域，并返回可复核的检测结论。"
            tone="cyan"
          />

          <div class="gi-panel gi-workbench">
            <div class="gi-workbench__grid">
              <div>
                <div class="gi-panel-title">
                  <h3>上传检测图像</h3>
                  <span>{{ filledCount }}/{{ maxCount }} 已就绪</span>
                </div>

                <ImageSlotUploader
                  :files="files"
                  :preview-urls="previewUrls"
                  :current-index="currentIndex"
                  :disabled="isSubmitting"
                  @go-prev="goPrev"
                  @go-next="goNext"
                  @select-file="handleSelectFile"
                  @remove="handleRemoveFile"
                />
              </div>

              <div>
                <div class="gi-panel-title">
                  <h3>检测作业面板</h3>
                  <span>BURST SCAN</span>
                </div>

                <div class="gi-card-surface gi-action-panel">
                  <div class="space-y-6">
                    <div>
                      <p class="gi-panel-title" style="margin-bottom: 14px;">
                        <span style="font-size: 15px; color: var(--gi-text); letter-spacing: 0;">图像采集建议</span>
                      </p>
                      <InstructionChecklist :items="instructions" tone="cyan" />
                    </div>

                    <p v-if="filledCount < maxCount" class="gi-upload-warning">
                      请上传 {{ maxCount }} 张图片后再开始检测。
                    </p>

                    <button
                      type="button"
                      class="gi-primary-button"
                      :disabled="!isComplete || isSubmitting"
                      @click="handleDetect"
                    >
                      <UIcon :name="isSubmitting ? 'i-heroicons-arrow-path' : 'i-material-symbols-sound-detection-glass-break-rounded'" :class="{ 'gi-spin': isSubmitting }" />
                      <span>{{ isSubmitting ? 'AI 检测中...' : '开始检测' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="result" class="gi-shell" style="gap: 18px;">
            <div class="gi-result-head">
              <div>
                <h2>检测结果</h2>
                <p>结果来自当前上传图像，你可以继续替换图片并重新发起检测。</p>
              </div>
            </div>

            <DetectionResultCard :result="result" />
          </div>
        </div>
      </div>
      </UDashboardPanelContent>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { detectGlassCrack } from '~/api/glassInspection'
import FeaturePageHero from '~/components/glass-inspection/FeaturePageHero.vue'
import ImageSlotUploader from '~/components/glass-inspection/ImageSlotUploader.vue'
import InstructionChecklist from '~/components/glass-inspection/InstructionChecklist.vue'
import DetectionResultCard from '~/components/glass-inspection/DetectionResultCard.vue'
import type { DetectionResultData } from '~/types/glassInspection'

const maxCount = 1
const instructions = [
  '支持常见图片格式（JPG、PNG、WEBP）。',
  '建议图片清晰度较高，分辨率不低于 1080p。',
  '现场光线尽量均匀，避免强烈反光和过曝。',
  '请确保检测区域无遮挡，并尽量完整包含缺陷位置。'
]

const result = ref<DetectionResultData | null>(null)
const isSubmitting = ref(false)

const {
  files,
  previewUrls,
  currentIndex,
  filledCount,
  isComplete,
  setFileAt,
  removeAt,
  goPrev,
  goNext
} = useGlassImageSlots(maxCount)

const handleSelectFile = ({ index, file }: { index: number; file: File }) => {
  setFileAt(index, file)
  result.value = null
}

const handleRemoveFile = (index: number) => {
  removeAt(index)
  result.value = null
}

const handleDetect = async () => {
  if (!isComplete.value) {
    return
  }

  isSubmitting.value = true

  try {
    let email = localStorage.getItem('email')

    if (!email) {
      ElMessage.warning('请先登录后再进行检测')
      return
    }

    const uploadFiles = files.value.filter(Boolean) as File[]
    result.value = await detectGlassCrack(email, uploadFiles)
  } catch (error: any) {
    result.value = {
      status: 'error',
      title: '上传失败',
      description: error?.message || '图片上传或检测过程出现错误，请稍后再试。',
      details: []
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
