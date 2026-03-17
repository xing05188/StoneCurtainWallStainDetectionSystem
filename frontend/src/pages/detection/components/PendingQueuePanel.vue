<script setup lang="ts">
import type { PendingQueueItem } from "@/common/composables/usePendingQueue"

interface Props {
  queue: PendingQueueItem[]
  isProcessing: boolean
}

interface Emits {
  (e: "uploadItem", item: PendingQueueItem): void
  (e: "removeItem", id: string): void
  (e: "uploadAll"): void
  (e: "clearCompleted"): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const expandedRows = ref<string[]>([])

function getStatusColor(status: string): "success" | "warning" | "info" | "danger" | "primary" {
  const map: Record<string, "success" | "warning" | "info" | "danger" | "primary"> = {
    pending: "primary",
    uploading: "warning",
    done: "success",
    failed: "danger"
  }
  return map[status] || "primary"
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "待上传",
    uploading: "上传中",
    done: "已完成",
    failed: "失败"
  }
  return map[status] || status
}

function canUpload(item: PendingQueueItem): boolean {
  return item.status === "pending" && !props.isProcessing
}

function handleUploadItem(item: PendingQueueItem) {
  emits("uploadItem", item)
}

function handleRemoveItem(id: string) {
  ElMessageBox.confirm("确定删除此项吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    emits("removeItem", id)
    ElMessage.success("已删除")
  }).catch(() => {
    // 取消
  })
}

function handleUploadAll() {
  const pendingCount = props.queue.filter(item => item.status === "pending").length
  if (pendingCount === 0) {
    ElMessage.info("没有待上传的项")
    return
  }
  emits("uploadAll")
}

function handleClearCompleted() {
  ElMessageBox.confirm("确定清空已完成的项吗？", "确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消"
  }).then(() => {
    emits("clearCompleted")
    ElMessage.success("已清空")
  }).catch(() => {
    // 取消
  })
}

function toggleExpand(id: string) {
  const index = expandedRows.value.indexOf(id)
  if (index > -1) {
    expandedRows.value.splice(index, 1)
  } else {
    expandedRows.value.push(id)
  }
}
</script>

<template>
  <div class="queue-panel">
    <!-- 统计信息 -->
    <div class="queue-stats">
      <div class="stat-item">
        <span class="stat-label">总数</span>
        <span class="stat-value">{{ queue.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">待上传</span>
        <span class="stat-value pending">{{ queue.filter(i => i.status === "pending").length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">上传中</span>
        <span class="stat-value uploading">{{ queue.filter(i => i.status === "uploading").length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">完成</span>
        <span class="stat-value done">{{ queue.filter(i => i.status === "done").length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">失败</span>
        <span class="stat-value failed">{{ queue.filter(i => i.status === "failed").length }}</span>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="queue-actions">
      <el-button
        type="primary"
        :disabled="props.isProcessing || !queue.some(i => i.status === 'pending')"
        @click="handleUploadAll"
      >
        全部上传
      </el-button>
      <el-button
        :disabled="!queue.some(i => i.status === 'done')"
        @click="handleClearCompleted"
      >
        清空已完成
      </el-button>
      <span class="action-hint" v-if="isProcessing">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        正在处理...
      </span>
    </div>

    <!-- 队列列表 -->
    <div v-if="queue.length > 0" class="queue-list">
      <div
        v-for="item in queue"
        :key="item.id"
        class="queue-item"
        :class="{ expanded: expandedRows.includes(item.id) }"
      >
        <!-- 主要信息 -->
        <div class="item-header" @click="toggleExpand(item.id)">
          <div class="item-left">
            <el-icon class="expand-icon">
              <arrow-down v-show="!expandedRows.includes(item.id)" />
              <arrow-up v-show="expandedRows.includes(item.id)" />
            </el-icon>
            <div class="item-info">
              <div class="item-name">
                {{ item.customName }}
              </div>
              <div class="item-meta">
                {{ item.formData.buildingName }}
                <span v-if="item.formData.locationFloor">
                  · 第{{ item.formData.locationFloor }}层
                </span>
              </div>
            </div>
          </div>
          <div class="item-right">
            <el-tag :type="getStatusColor(item.status)" size="small">
              {{ getStatusLabel(item.status) }}
            </el-tag>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="item.status === 'uploading'" class="item-progress">
          <el-progress :percentage="item.uploadProgress" size="small" />
        </div>

        <!-- 错误信息 -->
        <div v-if="item.status === 'failed' && item.errorMessage" class="item-error">
          <el-alert :title="item.errorMessage" type="error" :closable="false" />
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedRows.includes(item.id)" class="item-detail">
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label">文件名：</span>
              <span class="detail-value">{{ item.file?.name || "文件已失效" }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">大小：</span>
              <span class="detail-value">{{ ((item.file?.size || item.fileSize || 0) / 1024 / 1024).toFixed(2) }} MB</span>
            </div>
            <div v-if="item.formData.locationSection" class="detail-row">
              <span class="detail-label">分区：</span>
              <span class="detail-value">{{ item.formData.locationSection }}</span>
            </div>
            <div v-if="item.formData.description" class="detail-row">
              <span class="detail-label">备注：</span>
              <span class="detail-value">{{ item.formData.description }}</span>
            </div>
          </div>

          <!-- 图像预览 -->
          <div v-if="item.imagePreview" class="item-preview">
            <img
              :src="item.imagePreview"
              alt="preview"
              class="preview-img"
            >
          </div>

          <!-- 操作按钮 -->
          <div class="detail-actions">
            <el-button
              v-if="canUpload(item)"
              type="primary"
              size="small"
              @click="handleUploadItem(item)"
            >
              上传
            </el-button>
            <el-button
              type="danger"
              size="small"
              :disabled="item.status === 'uploading'"
              @click="handleRemoveItem(item.id)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="待检测列表为空" class="empty-state" />
  </div>
</template>

<style scoped>
.queue-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
}

.queue-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  padding: 12px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat-value.pending {
  color: var(--el-color-warning);
}

.stat-value.uploading {
  color: var(--el-color-info);
}

.stat-value.done {
  color: var(--el-color-success);
}

.stat-value.failed {
  color: var(--el-color-danger);
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.queue-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color-overlay);
  overflow: hidden;
  transition: all 0.3s ease;
}

.queue-item:hover {
  border-color: var(--el-color-primary-light-8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  user-select: none;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.queue-item.expanded .item-header {
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-light);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.expand-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.item-info {
  min-width: 0;
}

.item-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-right {
  margin-left: 12px;
  flex-shrink: 0;
}

.item-progress {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
}

.item-error {
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
}

.item-detail {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-lighter);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.detail-value {
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.item-preview {
  display: flex;
  justify-content: center;
  border: 1px dashed var(--el-border-color-light);
  border-radius: 6px;
  padding: 8px;
  background-color: var(--el-bg-color-overlay);
}

.preview-img {
  max-width: 100%;
  max-height: 150px;
  border-radius: 4px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.empty-state {
  padding: 20px;
}

@media (max-width: 768px) {
  .queue-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .detail-row {
    grid-template-columns: 70px 1fr;
  }
}
</style>
