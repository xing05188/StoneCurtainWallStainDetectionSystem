<script setup lang="ts">
import type { DetectionStatus } from "@@/apis/detection/type"
import { useDetectionStore } from "@/pinia/stores/detection"

const detectionStore = useDetectionStore()

const selectedStatus = ref<"" | DetectionStatus>("")

const statusOptions: Array<{ label: string, value: "" | DetectionStatus }> = [
  { label: "全部", value: "" },
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已完成", value: "done" },
  { label: "失败", value: "failed" }
]

const detailVisible = ref(false)

function openDetail(id: string) {
  void detectionStore.fetchTask(id)
  detailVisible.value = true
}

function handleSearch() {
  detectionStore.setQuery({
    currentPage: 1,
    status: selectedStatus.value || undefined
  })
  void detectionStore.fetchList()
}

function handleReset() {
  selectedStatus.value = ""
  detectionStore.setQuery({
    currentPage: 1,
    buildingName: "",
    status: undefined
  })
  void detectionStore.fetchList()
}

function handleCurrentChange(page: number) {
  detectionStore.setQuery({ currentPage: page })
  void detectionStore.fetchList()
}

async function handleRetry(id: string) {
  await detectionStore.retryTask(id)
  ElMessage.success("任务已重新提交")
}

onMounted(() => {
  selectedStatus.value = detectionStore.query.status || ""
  void detectionStore.fetchList()
})
</script>

<template>
  <section class="history-page">
    <el-card shadow="never">
      <template #header>
        <div class="header-row">
          <h3>检测历史</h3>
          <el-button type="primary" plain @click="$router.push('/detection')">
            返回检测工作台
          </el-button>
        </div>
      </template>

      <el-form inline class="search-row">
        <el-form-item label="建筑">
          <el-input v-model.trim="detectionStore.query.buildingName" placeholder="输入建筑名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="selectedStatus" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="item in statusOptions"
              :key="item.label"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="detectionStore.loading" :data="detectionStore.list" border>
        <el-table-column prop="buildingName" label="建筑" min-width="180" />
        <el-table-column prop="locationFloor" label="楼层" width="100" />
        <el-table-column prop="locationSection" label="分区" width="120" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'done' ? 'success' : scope.row.status === 'failed' ? 'danger' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openDetail(scope.row.id)">
              详情
            </el-button>
            <el-button
              v-if="scope.row.status === 'failed'"
              link
              type="warning"
              @click="handleRetry(scope.row.id)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-row">
        <el-pagination
          layout="total, prev, pager, next"
          :total="detectionStore.total"
          :page-size="detectionStore.query.size"
          :current-page="detectionStore.query.currentPage"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="检测详情" size="50%">
      <template v-if="detectionStore.currentTask">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务ID">
            {{ detectionStore.currentTask.id }}
          </el-descriptions-item>
          <el-descriptions-item label="建筑">
            {{ detectionStore.currentTask.buildingName }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ detectionStore.currentTask.status }}
          </el-descriptions-item>
          <el-descriptions-item label="污渍类型">
            {{ detectionStore.currentTask.stainType || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="受影响面积(%)">
            {{ detectionStore.currentTask.affectedAreaPercentage ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="摘要">
            {{ detectionStore.currentTask.summary || "-" }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="history-compare-grid">
          <div class="history-img-panel">
            <p class="history-img-title">原图</p>
            <el-image
              v-if="detectionStore.currentTask.imageSignedUrl"
              :src="detectionStore.currentTask.imageSignedUrl"
              fit="contain"
              style="width: 100%; max-height: 360px"
              preview-teleported
            />
            <el-empty v-else description="原图不可用" />
          </div>
          <div class="history-img-panel">
            <p class="history-img-title">检测后（分割叠加）</p>
            <el-image
              v-if="detectionStore.currentTask.processedImageSignedUrl"
              :src="detectionStore.currentTask.processedImageSignedUrl"
              fit="contain"
              style="width: 100%; max-height: 360px"
              preview-teleported
            />
            <el-empty v-else description="检测后图片暂未生成" />
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无详情" />
    </el-drawer>
  </section>
</template>

<style scoped>
.history-page {
  min-height: calc(100vh - 84px);
  padding: 22px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 18px;
  }
}

.search-row {
  margin-bottom: 14px;
}

.pager-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.history-compare-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.history-img-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 8px;
}

.history-img-title {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1024px) {
  .history-compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
