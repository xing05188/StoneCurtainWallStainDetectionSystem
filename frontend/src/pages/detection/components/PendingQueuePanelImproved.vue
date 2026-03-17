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
  (e: "viewResult", taskId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const currentPage = ref(1)
const pageSize = 10
const selectedIds = ref<string[]>([])

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "待上传",
    uploading: "上传中",
    done: "已完成",
    failed: "失败"
  }
  return map[status] || status
}

function getStatusType(status: string): "success" | "warning" | "danger" | "info" | "primary" {
  const map: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
    pending: "primary",
    uploading: "warning",
    done: "success",
    failed: "danger"
  }
  return map[status] || "primary"
}

// 分页相关
const paginatedQueue = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return props.queue.slice(start, start + pageSize)
})

const totalCount = computed(() => props.queue.length)

// 操作函数
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
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
  }).catch(() => {
    // 取消
  })
}

function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.info("请先选择要删除的项")
    return
  }

  ElMessageBox.confirm(`确定删除 ${selectedIds.value.length} 项吗？`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    selectedIds.value.forEach(id => {
      emits("removeItem", id)
    })
    selectedIds.value = []
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

function handleViewResult(taskId: string) {
  emits("viewResult", taskId)
}

function isAllSelected() {
  return paginatedQueue.value.length > 0 && paginatedQueue.value.every(item => selectedIds.value.includes(item.id))
}

function toggleSelectAll() {
  if (isAllSelected()) {
    selectedIds.value = selectedIds.value.filter(id => !paginatedQueue.value.some(item => item.id === id))
  } else {
    paginatedQueue.value.forEach(item => {
      if (!selectedIds.value.includes(item.id)) {
        selectedIds.value.push(item.id)
      }
    })
  }
}
</script>

<template>
  <div class="queue-panel">
    <!-- 操作栏 -->
    <div class="operation-bar">
      <div class="left-actions">
        <el-checkbox
          :model-value="isAllSelected()"
          @change="toggleSelectAll"
        >
          全选
        </el-checkbox>
        <span class="selected-count" v-if="selectedIds.length > 0">
          已选 {{ selectedIds.length }} 项
        </span>
      </div>
      <div class="right-actions">
        <el-button
          type="primary"
          :disabled="props.isProcessing || !props.queue.some(i => i.status === 'pending')"
          @click="handleUploadAll"
          size="small"
        >
          全部上传
        </el-button>
        <el-button
          type="danger"
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
          size="small"
        >
          批量删除
        </el-button>
        <el-button
          :disabled="!props.queue.some(i => i.status === 'done')"
          @click="handleClearCompleted"
          size="small"
        >
          清空已完成
        </el-button>
      </div>
    </div>

    <!-- 队列列表 -->
    <div v-if="props.queue.length > 0" class="queue-list">
      <div
        v-for="item in paginatedQueue"
        :key="item.id"
        class="queue-item"
        :class="{ selected: selectedIds.includes(item.id) }"
      >
        <!-- 左侧：选择框 -->
        <div class="item-checkbox">
          <el-checkbox
            :model-value="selectedIds.includes(item.id)"
            @change="(checked) => {
              if (checked && !selectedIds.includes(item.id)) {
                selectedIds.push(item.id)
              } else if (!checked) {
                selectedIds = selectedIds.filter(id => id !== item.id)
              }
            }"
          />
        </div>

        <!-- 中左：图片预览 -->
        <div class="item-image">
          <img v-if="item.imagePreview" :src="item.imagePreview" alt="preview">
          <div v-else class="no-image">
            <el-icon><Picture /></el-icon>
          </div>
        </div>

        <!-- 中间：信息 -->
        <div class="item-info">
          <div class="info-title">{{ item.customName }}</div>
          <div class="info-meta">
            <span class="meta-item">{{ item.formData.buildingName }}</span>
            <span v-if="item.formData.locationFloor" class="meta-item">
              第{{ item.formData.locationFloor }}层
            </span>
            <span class="meta-item">{{ item.fileSize ? (item.fileSize / 1024 / 1024).toFixed(2) : '0' }} MB</span>
          </div>
          <div class="info-progress" v-if="item.status === 'uploading'">
            <el-progress :percentage="item.uploadProgress" size="small" />
          </div>
          <div class="info-error" v-if="item.status === 'failed' && item.errorMessage">
            <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
            <span>{{ item.errorMessage }}</span>
          </div>
        </div>

        <!-- 右侧：状态和操作 -->
        <div class="item-actions">
          <el-tag :type="getStatusType(item.status)" size="small" class="status-tag">
            {{ getStatusLabel(item.status) }}
          </el-tag>

          <div class="action-buttons">
            <el-button
              v-if="item.status === 'pending' && !props.isProcessing"
              type="primary"
              size="small"
              @click="handleUploadItem(item)"
            >
              上传
            </el-button>
            <el-button
              v-else-if="item.status === 'done'"
              type="success"
              size="small"
              :disabled="!item.taskId"
              @click="item.taskId && handleViewResult(item.taskId)"
            >
              查看
            </el-button>
            <el-button
              v-else-if="item.status === 'uploading'"
              disabled
              size="small"
            >
              处理中...
            </el-button>
            <el-button
              v-else-if="item.status === 'failed'"
              type="danger"
              size="small"
              @click="handleUploadItem(item)"
            >
              重试
            </el-button>

            <el-popconfirm
              title="确定要删除吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleRemoveItem(item.id)"
            >
              <template #reference>
                <el-button
                  type="danger"
                  link
                  size="small"
                  :disabled="item.status === 'uploading'"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="待检测列表为空" />

    <!-- 分页 -->
    <div v-if="totalCount > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalCount"
        background
        layout="prev, pager, next, total"
      />
    </div>
  </div>
</template>

<style scoped>
.queue-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 操作栏 */
.operation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
  gap: 12px;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 队列列表 */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.queue-item {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color-overlay);
  transition: all 0.3s ease;
}

.queue-item:hover {
  border-color: var(--el-color-primary-light-8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.queue-item.selected {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-6);
}

.item-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图片预览 */
.item-image {
  width: 60px;
  height: 60px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  font-size: 24px;
  color: var(--el-text-color-secondary);
}

/* 信息 */
.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-item {
  padding: 0 4px;
  background-color: var(--el-fill-color-light);
  border-radius: 2px;
}

.info-progress {
  width: 100%;
}

.info-error {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 4px;
}

.error-icon {
  font-size: 14px;
}

/* 操作 */
.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}

.status-tag {
  min-width: 60px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 响应式 */
@media (max-width: 1024px) {
  .queue-item {
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    padding: 10px;
  }

  .item-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .action-buttons {
    gap: 2px;
  }
}

@media (max-width: 768px) {
  .operation-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .right-actions {
    width: 100%;
    gap: 6px;
  }

  .right-actions button {
    flex: 1;
  }

  .queue-list {
    max-height: 400px;
  }

  .item-image {
    width: 50px;
    height: 50px;
  }

  .info-meta {
    font-size: 11px;
  }
}
</style>