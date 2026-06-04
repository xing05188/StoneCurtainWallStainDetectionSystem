<template>
  <UDashboardPage class="min-h-0">
    <UDashboardPanel grow class="min-h-0">
      <UDashboardNavbar title="幕墙平整度检测" />

      <UDashboardPanelContent class="gi-panel-content">
      <div class="gi-page">
        <div class="gi-shell">
          <FeaturePageHero
            icon="i-material-symbols-straighten-rounded"
            title="幕墙平整度检测"
            description="按左右环境图与投影图完成平整度分析，保留结果图与 3D 粒子点云效果用于复核。"
            tone="blue"
          />

          <div class="gi-panel gi-workbench">
            <div class="gi-workbench__grid">
              <div>
                <div class="gi-panel-title">
                  <h3>上传四组图像</h3>
                  <span>{{ filledCount }}/{{ maxCount }} 已就绪</span>
                </div>

                <ImageSlotUploader
                  :files="files"
                  :preview-urls="previewUrls"
                  :current-index="currentIndex"
                  :disabled="isSubmitting"
                  :slot-tips="slotTips"
                  @go-prev="goPrev"
                  @go-next="goNext"
                  @select-file="handleSelectFile"
                  @remove="handleRemoveFile"
                />
              </div>

              <div>
                <div class="gi-panel-title">
                  <h3>检测作业面板</h3>
                  <span>FLATNESS MAP</span>
                </div>

                <div class="gi-card-surface gi-action-panel">
                  <div class="space-y-6">
                    <div>
                      <p class="gi-panel-title" style="margin-bottom: 14px;">
                        <span style="font-size: 15px; color: var(--gi-text); letter-spacing: 0;">现场拍摄要求</span>
                      </p>
                      <InstructionChecklist :items="instructions" tone="blue" />
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
                      <UIcon :name="isSubmitting ? 'i-heroicons-arrow-path' : 'i-material-symbols-straighten-rounded'" :class="{ 'gi-spin': isSubmitting }" />
                      <span>{{ isSubmitting ? 'AI 分析中...' : '开始检测' }}</span>
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
                <p>平整度结果保留结果图与点云交互复核能力，便于你和后续业务模块继续复用。</p>
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
import { detectGlassFlatness } from '~/api/glassInspection'
import FeaturePageHero from '~/components/glass-inspection/FeaturePageHero.vue'
import ImageSlotUploader from '~/components/glass-inspection/ImageSlotUploader.vue'
import InstructionChecklist from '~/components/glass-inspection/InstructionChecklist.vue'
import DetectionResultCard from '~/components/glass-inspection/DetectionResultCard.vue'
import { FLATNESS_FIELD_NAMES, type DetectionResultData, type FlatnessFieldName } from '~/types/glassInspection'

const maxCount = 4
const slotTips = ['请上传左侧环境图', '请上传左侧投影图', '请上传右侧环境图', '请上传右侧投影图']
const instructions = [
  '拍摄角度尽量垂直于幕墙表面，减少透视畸变。',
  '建议保持 3 到 5 米的适当拍摄距离。',
  '请确保整体幕墙结构尽量完整出现在画面中。',
  '光线应尽量均匀，避免局部强阴影和大面积反光。'
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

    const payload: Partial<Record<FlatnessFieldName, File>> = {}
    FLATNESS_FIELD_NAMES.forEach((field, index) => {
      const file = files.value[index]
      if (file) {
        payload[field] = file
      }
    })

    result.value = await detectGlassFlatness(email, payload)
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
