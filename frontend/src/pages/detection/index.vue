<script setup lang="ts">
import { useDetectionStore } from "@/pinia/stores/detection"

const detectionStore = useDetectionStore()

const submitLoading = ref(false)
const selectedFile = ref<File | null>(null)

const form = reactive({
  buildingName: "",
  locationFloor: undefined as number | undefined,
  locationSection: "",
  description: ""
})

const fileList = ref<any[]>([])

function handleFileChange(uploadFile: any) {
  selectedFile.value = uploadFile.raw || null
}

function handleFileRemove() {
  selectedFile.value = null
}

async function handleSubmit() {
  if (!selectedFile.value) {
    ElMessage.warning("请先选择检测图片")
    return
  }
  if (!form.buildingName) {
    ElMessage.warning("请填写建筑名称")
    return
  }

  submitLoading.value = true
  try {
    const task = await detectionStore.createTask(selectedFile.value, {
      buildingName: form.buildingName,
      locationFloor: form.locationFloor,
      locationSection: form.locationSection || undefined,
      description: form.description || undefined
    })

    if (task.status === "done") {
      ElMessage.success("检测完成")
    } else {
      ElMessage.success("任务已提交，正在后台处理")
    }
  } catch (error) {
    ElMessage.error((error as Error).message || "提交失败")
  } finally {
    submitLoading.value = false
  }
}

async function refreshCurrentImageUrl() {
  if (!detectionStore.currentTask) return
  await detectionStore.fetchTask(detectionStore.currentTask.id)
}

onMounted(() => {
  void detectionStore.fetchList()
})

onBeforeUnmount(() => {
  detectionStore.stopPolling()
})
</script>

<template>
  <section class="detection-page">
    <div class="content-grid">
      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-header">
            <h3>上传检测</h3>
            <p>上传幕墙照片并触发污渍识别任务</p>
          </div>
        </template>

        <el-form label-width="100px">
          <el-form-item label="建筑名称" required>
            <el-input v-model.trim="form.buildingName" placeholder="如：A座南立面" />
          </el-form-item>
          <el-form-item label="楼层">
            <el-input-number v-model="form.locationFloor" :min="1" :max="200" />
          </el-form-item>
          <el-form-item label="分区">
            <el-input v-model.trim="form.locationSection" placeholder="如：A-03" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model.trim="form.description"
              type="textarea"
              :rows="3"
              placeholder="可选，补充采集场景"
            />
          </el-form-item>
          <el-form-item label="检测图片" required>
            <el-upload
              v-model:file-list="fileList"
              drag
              :auto-upload="false"
              :limit="1"
              accept="image/*"
              @change="handleFileChange"
              @remove="handleFileRemove"
            >
              <el-icon class="el-icon--upload">
                <UploadFilled />
              </el-icon>
              <div class="el-upload__text">
                将图片拖拽到此处，或点击上传
              </div>
            </el-upload>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
              开始检测
            </el-button>
          </el-form-item>
        </el-form>

        <el-progress v-if="submitLoading || detectionStore.uploadProgress > 0" :percentage="detectionStore.uploadProgress" />
      </el-card>

      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-header">
            <h3>当前任务</h3>
            <p>检测状态与结果摘要</p>
          </div>
        </template>

        <div v-if="detectionStore.currentTask" class="task-result">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务ID">
              {{ detectionStore.currentTask.id }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detectionStore.currentTask.status === 'done' ? 'success' : detectionStore.currentTask.status === 'failed' ? 'danger' : 'warning'">
                {{ detectionStore.currentTask.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="建筑">
              {{ detectionStore.currentTask.buildingName }}
            </el-descriptions-item>
            <el-descriptions-item label="摘要">
              {{ detectionStore.currentTask.summary || "处理中..." }}
            </el-descriptions-item>
            <el-descriptions-item label="污渍占比(%)">
              {{ detectionStore.currentTask.affectedAreaPercentage ?? "-" }}
            </el-descriptions-item>
          </el-descriptions>

          <el-table
            v-if="detectionStore.currentTask.regions?.length"
            :data="detectionStore.currentTask.regions"
            class="regions-table"
            size="small"
          >
            <el-table-column prop="label" label="污渍类型" />
            <el-table-column prop="confidence" label="置信度" width="120">
              <template #default="scope">
                {{ Number(scope.row.confidence).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="severity" label="严重程度" width="120" />
          </el-table>

          <el-alert
            v-if="detectionStore.currentTask.status === 'failed'"
            type="error"
            :closable="false"
            :title="detectionStore.currentTask.errorMessage || '检测失败'"
          />

          <div
            v-if="detectionStore.currentTask.imageSignedUrl || detectionStore.currentTask.processedImageSignedUrl"
            class="image-preview-wrap"
          >
            <div class="preview-head">
              <span>图像对比（原图 / 检测后）</span>
              <el-button link type="primary" @click="refreshCurrentImageUrl">
                刷新链接
              </el-button>
            </div>
            <div class="compare-grid">
              <div class="img-panel">
                <p class="img-title">原图</p>
                <el-image
                  v-if="detectionStore.currentTask.imageSignedUrl"
                  :src="detectionStore.currentTask.imageSignedUrl"
                  fit="contain"
                  style="width: 100%; max-height: 320px"
                  preview-teleported
                />
                <el-empty v-else description="原图不可用" />
              </div>
              <div class="img-panel">
                <p class="img-title">检测后（分割叠加）</p>
                <el-image
                  v-if="detectionStore.currentTask.processedImageSignedUrl"
                  :src="detectionStore.currentTask.processedImageSignedUrl"
                  fit="contain"
                  style="width: 100%; max-height: 320px"
                  preview-teleported
                />
                <el-empty v-else description="检测后图片暂未生成" />
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无检测任务" />
      </el-card>
    </div>
  </section>
</template>

<style scoped>
.detection-page {
  min-height: calc(100vh - 84px);
  padding: 22px;
  background:
    radial-gradient(circle at 4% 10%, color-mix(in srgb, var(--el-color-primary) 14%, transparent), transparent 34%),
    radial-gradient(circle at 96% 88%, color-mix(in srgb, var(--el-color-warning) 16%, transparent), transparent 32%),
    var(--el-bg-color-page);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel {
  border-radius: 14px;
}

.panel-header {
  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 6px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

.task-result {
  display: grid;
  gap: 12px;
}

.regions-table {
  margin-top: 8px;
}

.image-preview-wrap {
  display: grid;
  gap: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 10px;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.img-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 8px;
}

.img-title {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
