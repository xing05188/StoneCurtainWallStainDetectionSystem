<script setup lang="ts">
import { usePendingQueue } from '~/composables/usePendingQueue'
import { exportSingleDetectionPdf } from '~/utils/detectionPdfExport'
import { compressImage } from '~/utils/compressImage'
import ImageNamingDialog from './components/ImageNamingDialog.vue'
import PendingQueuePanelImproved from './components/PendingQueuePanelImproved.vue'
import { createDetectionTask, getDetectionTask, getDetectionSignedUrl } from '~/api/detections'
import type * as Detection from '~/types/detection'

const { queue, addToQueue, updateQueueItem, removeFromQueue, clearCompletedItems } = usePendingQueue()

const namingDialogVisible = ref(false)
const currentFile = ref<File | null>(null)
const currentFilePreview = ref<string>('')
const uploadFileListRef = ref<any>(null)
const batchUploadLoading = ref(false)
const currentBatchUploadIndex = ref(0)
const currentTask = ref<Detection.DetectionTaskItem | null>(null)

function getInferenceModeLabel(mode?: Detection.InferenceMode) {
  return mode === 'cloud' ? '云端模型' : '本地模型'
}

// 批量上传队列
const filesToProcess = ref<File[]>([])
const currentFileIndex = ref(0)

// 处理文件选择
async function handleFileSelect(files: FileList | null) {
  if (!files || files.length === 0) return

  // 验证所有文件
  const validFiles: File[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (!file.type.startsWith('image/')) {
      ElMessage.warning(`${file.name} 不是有效的图像文件，已跳过`)
      continue
    }

    // 检查文件大小（限制 50MB）
    if (file.size > 50 * 1024 * 1024) {
      ElMessage.warning(`${file.name} 文件过大，已跳过`)
      continue
    }

    validFiles.push(file)
  }

  if (validFiles.length === 0) {
    ElMessage.warning('没有有效的图像文件')
    return
  }

  // 压缩图片以加快上传速度
  try {
    const compressedFiles = await Promise.all(
      validFiles.map(async (file) => {
        if (file.size > 100 * 1024) {
          return await compressImage(file)
        }
        return file
      })
    )
    filesToProcess.value = compressedFiles
  } catch {
    filesToProcess.value = validFiles
  }

  currentFileIndex.value = 0
  processNextFile()
}

// 处理队列中的下一个文件
function processNextFile() {
  if (currentFileIndex.value >= filesToProcess.value.length) {
    filesToProcess.value = []
    currentFileIndex.value = 0
    return
  }

  const file = filesToProcess.value[currentFileIndex.value]

  // 生成预览
  const reader = new FileReader()
  reader.onload = (e) => {
    currentFile.value = file
    currentFilePreview.value = (e.target?.result as string) || ''
    namingDialogVisible.value = true
  }
  reader.onerror = () => {
    ElMessage.error(`无法读取文件：${file.name}`)
    currentFileIndex.value++
    processNextFile()
  }
  reader.readAsDataURL(file)
}

// 处理拖拽上传
function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  handleFileSelect(e.dataTransfer?.files || null)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
}

// 处理图像命名完成
function handleNamingConfirm(data: { customName: string; formData: any }) {
  if (!currentFile.value) {
    return
  }

  const queueItem = {
    file: currentFile.value,
    customName: data.customName,
    imagePreview: currentFilePreview.value,
    formData: {
      ...data.formData,
      inferenceMode: 'local' as Detection.InferenceMode
    }
  }
  addToQueue(queueItem as any)

  ElMessage.success('已添加到待检测列表')
  currentFile.value = null
  currentFilePreview.value = ''

  // 处理下一个文件
  currentFileIndex.value++
  processNextFile()

  // 重置上传组件
  if (uploadFileListRef.value) {
    uploadFileListRef.value.value = ''
  }
}

// 上传单个项
async function uploadQueueItem(item: any) {
  if (!item.file || item.file.size === 0) {
    updateQueueItem(item.id, {
      status: 'failed',
      errorMessage: '文件已失效，请重新选择图片后再上传'
    })
    ElMessage.warning(`${item.customName} 文件已失效，请重新添加`)
    return
  }

  updateQueueItem(item.id, { status: 'uploading', uploadProgress: 0 })
  try {
    const task = await createDetectionTask(
      item.file,
      item.formData,
      (progress: number) => {
        updateQueueItem(item.id, { uploadProgress: Math.min(progress, 90) })
      }
    )

    const taskId = task.id || task.data?.id
    updateQueueItem(item.id, { taskId: String(taskId), uploadProgress: 95 })

    const taskStatus = task.status || task.data?.status
    if (taskStatus === 'done') {
      updateQueueItem(item.id, {
        status: 'done',
        uploadProgress: 100,
        errorMessage: undefined
      })
      ElMessage.success(`${item.customName} 检测完成`)
      return
    }

    if (taskStatus === 'failed') {
      const errMsg = task.errorMessage || task.data?.errorMessage || '检测失败'
      updateQueueItem(item.id, { status: 'failed', errorMessage: errMsg })
      ElMessage.error(`${item.customName} ${errMsg}`)
      return
    }

    let pollCount = 0
    const poll = async (): Promise<void> => {
      pollCount++
      const progress = Math.min(95 + pollCount * 1, 99)
      updateQueueItem(item.id, { uploadProgress: progress })

      try {
        const latest = await getDetectionTask(taskId)
        const s = latest.status || latest.data?.status

        if (s === 'done') {
          updateQueueItem(item.id, {
            status: 'done',
            uploadProgress: 100,
            errorMessage: undefined
          })
          ElMessage.success(`${item.customName} 检测完成`)
          return
        }

        if (s === 'failed') {
          const errMsg = latest.errorMessage || latest.data?.errorMessage || '检测失败'
          updateQueueItem(item.id, { status: 'failed', errorMessage: errMsg })
          ElMessage.error(`${item.customName} ${errMsg}`)
          return
        }

        if (pollCount >= 300) {
          updateQueueItem(item.id, {
            status: 'failed',
            errorMessage: '检测超时，请稍后查看结果'
          })
          ElMessage.warning(`${item.customName} 检测超时，请稍后在历史记录中查看`)
          return
        }

        setTimeout(poll, 2000)
      } catch {
        if (pollCount >= 300) {
          updateQueueItem(item.id, {
            status: 'failed',
            errorMessage: '检测超时，请稍后查看结果'
          })
          ElMessage.warning(`${item.customName} 检测超时，请稍后在历史记录中查看`)
          return
        }
        setTimeout(poll, 2000)
      }
    }

    setTimeout(poll, 2000)
  } catch (error) {
    const message = (error as Error).message || '上传失败'
    updateQueueItem(item.id, { status: 'failed', errorMessage: message })
    ElMessage.error(`${item.customName} ${message}`)
  }
}

// 批量上传
async function uploadAll() {
  const pendingItems = queue.value.filter(item => item.status === 'pending')
  if (pendingItems.length === 0) {
    ElMessage.info('没有待上传的项')
    return
  }

  batchUploadLoading.value = true

  try {
    for (let i = 0; i < pendingItems.length; i++) {
      currentBatchUploadIndex.value = i + 1
      await uploadQueueItem(pendingItems[i])
      if (i < pendingItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    ElMessage.success('批量上传完成')
  } finally {
    batchUploadLoading.value = false
    currentBatchUploadIndex.value = 0
  }
}

function handleUpdateInferenceMode(payload: { id: string; mode: Detection.InferenceMode }) {
  const current = queue.value.find((item: any) => item.id === payload.id)
  if (!current) return

  updateQueueItem(payload.id, {
    formData: {
      ...current.formData,
      inferenceMode: payload.mode
    }
  })
}

// 移除队列项
function handleRemoveQueueItem(id: string) {
  removeFromQueue(id)
}

// 查看检测结果
async function handleViewResult(taskId: string) {
  try {
    currentTask.value = await getDetectionTask(taskId)
  } catch (error) {
    ElMessage.error(`获取检测结果失败: ${(error as Error).message || '未知错误'}`)
  }
}

async function refreshCurrentImageUrl() {
  if (!currentTask.value) return
  try {
    currentTask.value = await getDetectionTask(currentTask.value.id)
  } catch {
    ElMessage.error('刷新失败')
  }
}

async function handleExportCurrentReport() {
  if (!currentTask.value) {
    ElMessage.warning('暂无可导出的检测结果')
    return
  }
  try {
    await exportSingleDetectionPdf(currentTask.value, `detection-report-${currentTask.value.id}.pdf`)
    ElMessage.success('PDF报告已导出')
  } catch {
    ElMessage.error('PDF导出失败')
  }
}

</script>

<template>
  <section class="detection-page">
    <!-- 图像命名对话框 -->
    <ImageNamingDialog
      v-model="namingDialogVisible"
      :file="currentFile"
      :image-preview="currentFilePreview"
      @confirm="handleNamingConfirm"
    />

    <div class="detection-container">
      <!-- 左侧操作区 -->
      <div class="left-panel">
        <!-- 上传图片卡片 -->
        <el-card shadow="never" class="upload-card">
          <template #header>
            <div class="card-header">
              <h3>上传图片</h3>
            </div>
          </template>

          <div class="upload-area" @drop="handleDrop" @dragover="handleDragOver">
            <p class="upload-text">拖拽图片至此或点击上传</p>
            <input
              ref="uploadFileListRef"
              type="file"
              multiple
              accept="image/*"
              style="display: none"
              @change="(e) => handleFileSelect((e.target as HTMLInputElement).files)"
            />
            <el-button type="primary" @click="uploadFileListRef?.click()" class="upload-btn">
              选择图片
            </el-button>
          </div>

          <p class="format-hint">支持 JPG、PNG 格式，单个文件不超过 50MB</p>
        </el-card>

        <!-- 待检测列表卡片 -->
        <el-card shadow="never" class="queue-card">
          <template #header>
            <div class="card-header">
              <h3>待检测列表</h3>
              <span class="queue-count">{{ queue.length }}</span>
            </div>
          </template>

          <PendingQueuePanelImproved
            :queue="queue"
            :isProcessing="batchUploadLoading"
            @uploadItem="uploadQueueItem"
            @removeItem="handleRemoveQueueItem"
            @uploadAll="uploadAll"
            @clearCompleted="clearCompletedItems"
            @viewResult="handleViewResult"
            @updateInferenceMode="handleUpdateInferenceMode"
          />
        </el-card>
      </div>

      <!-- 右侧展示区 -->
      <div class="right-panel">
        <!-- 当前检测结果 -->
        <el-card shadow="never" class="result-card">
          <template #header>
            <div class="card-header">
              <h3>检测结果</h3>
              <div class="header-actions">
                <el-button
                  v-if="currentTask"
                  link
                  type="primary"
                  @click="refreshCurrentImageUrl"
                >
                  刷新
                </el-button>
                <el-button
                  v-if="currentTask"
                  link
                  type="success"
                  @click="handleExportCurrentReport"
                >
                  导出PDF
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="currentTask" class="result-content">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="任务ID">
                {{ currentTask.id }}
              </el-descriptions-item>
              <el-descriptions-item label="图片名称">
                {{ currentTask.imageName || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag
                  :type="currentTask.status === 'done' ? 'success' : currentTask.status === 'failed' ? 'danger' : 'warning'"
                  size="small"
                >
                  {{ currentTask.status }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="推理模式">
                {{ getInferenceModeLabel(currentTask.metrics?.inferenceMode) }}
              </el-descriptions-item>

              <el-descriptions-item label="建筑">
                {{ currentTask.buildingName }}
              </el-descriptions-item>
              <el-descriptions-item label="楼层">
                {{ currentTask.locationFloor || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="分区">
                {{ currentTask.locationSection || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="污渍类型">
                {{ currentTask.stainType || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="污渍占比">
                {{ currentTask.affectedAreaPercentage ?? '-' }}%
              </el-descriptions-item>
              <el-descriptions-item label="检测时间" :span="2">
                {{ currentTask.createdAt || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="总结" :span="2">
                {{ currentTask.summary || '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 区域明细表格 -->
            <div v-if="currentTask.regions?.length" class="regions-section">
              <p class="section-title">区域明细</p>
              <el-table
                :data="currentTask.regions"
                class="regions-table"
                size="small"
                stripe
                border
              >
                <el-table-column type="index" label="#" />
                <el-table-column prop="label" label="污渍类型" />
                <el-table-column prop="confidence" label="置信度">
                  <template #default="scope">
                    {{ Number(scope.row.confidence).toFixed(4) }}
                  </template>
                </el-table-column>
                <el-table-column label="BBox(x1,y1,x2,y2)">
                  <template #default="scope">
                    {{ Number(scope.row.bbox[0]).toFixed(2) }},{{ Number(scope.row.bbox[1]).toFixed(2) }},{{ Number(scope.row.bbox[2]).toFixed(2) }},{{ Number(scope.row.bbox[3]).toFixed(2) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 错误提示 -->
            <el-alert
              v-if="currentTask.status === 'failed'"
              type="error"
              :closable="false"
              :title="currentTask.errorMessage || '检测失败'"
              style="margin-top: 12px"
            />

            <!-- 图像展示 -->
            <div
              v-if="currentTask.imageSignedUrl || currentTask.processedImageSignedUrl"
              class="image-section"
            >
              <p class="section-title">检测图像</p>
              <div class="image-grid">
                <div class="image-item">
                  <p class="image-label">原图</p>
                  <el-image
                    v-if="currentTask.imageSignedUrl"
                    :src="currentTask.imageSignedUrl"
                    :preview-src-list="[currentTask.imageSignedUrl]"
                    fit="contain"
                    style="width: 100%; height: 300px"
                    preview-teleported
                  />
                  <el-empty v-else description="原图不可用" />
                </div>
                <div class="image-item">
                  <p class="image-label">检测后图片</p>
                  <el-image
                    v-if="currentTask.processedImageSignedUrl"
                    :src="currentTask.processedImageSignedUrl"
                    :preview-src-list="[currentTask.processedImageSignedUrl]"
                    fit="contain"
                    style="width: 100%; height: 300px"
                    preview-teleported
                  />
                  <el-empty v-else description="检测后图片暂未生成" />
                </div>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无检测结果" />
        </el-card>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detection-page {
  min-height: calc(100vh - 84px);
  padding: 20px;
  overflow-y: auto;
}

.detection-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-card,
.queue-card,
.result-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  width: 100%;
}

.queue-count {
  margin-left: auto;
  padding: 4px 12px;
  background-color: var(--el-color-primary);
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.upload-area {
  border: 2px dashed var(--el-border-color-light);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.upload-text {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.upload-btn {
  margin-top: 8px;
}

.format-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.regions-section {
  margin-top: 12px;
}

.regions-table {
  width: 100%;
}

.image-section {
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.image-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}

.image-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--el-fill-color-light);
}

.image-item :deep(.el-image) {
  width: 100%;
  display: block;
}

.image-label {
  margin: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1200px) {
  .detection-container {
    grid-template-columns: 1fr;
  }

  .image-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .detection-page {
    padding: 12px;
  }
}
</style>
