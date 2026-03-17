<script setup lang="ts">
import type * as Detection from "@@/apis/detection/type"
import type { DetectionStatus } from "@@/apis/detection/type"
import dayjs from "dayjs"
import { getDetectionListApi, getDetectionSignedUrlApi, getDetectionTaskApi } from "@@/apis/detection"
import { exportSelectedDetectionPdf, exportSingleDetectionPdf } from "@/common/utils/report"
import { useDetectionStore } from "@/pinia/stores/detection"

const detectionStore = useDetectionStore()

const selectedStatus = ref<"" | DetectionStatus>("")
const list = ref<Detection.DetectionTaskItem[]>([])
const total = ref(0)
const loading = ref(false)
const detailVisible = ref(false)
const historyDetailTask = ref<Detection.DetectionTaskItem | null>(null)
const selectedRows = ref<Detection.DetectionTaskItem[]>([])
const lastLoadedAt = ref(0)
const dateRange = ref<[string, string] | []>([])

// 缓存机制（按查询参数 + 页码缓存，页面切换后仍可命中）
const CACHE_DURATION = 15 * 60 * 1000 // 15分钟缓存
type HistoryCacheItem = {
  list: Detection.DetectionTaskItem[]
  total: number
  time: number
}

function getHistoryCacheStore() {
  const g = globalThis as unknown as { __historyListCache?: Map<string, HistoryCacheItem> }
  if (!g.__historyListCache) {
    g.__historyListCache = new Map<string, HistoryCacheItem>()
  }
  return g.__historyListCache
}

function getCacheKey() {
  return JSON.stringify({
    currentPage: query.currentPage,
    size: query.size,
    status: query.status || "",
    buildingName: query.buildingName.trim(),
    startTime: query.startTime || "",
    endTime: query.endTime || ""
  })
}

// 查询参数
const query = reactive({
  currentPage: 1,
  size: 10,
  status: undefined as DetectionStatus | undefined,
  buildingName: "",
  startTime: undefined as string | undefined,
  endTime: undefined as string | undefined
})

const statusOptions: Array<{ label: string, value: "" | DetectionStatus }> = [
  { label: "全部", value: "" },
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已完成", value: "done" },
  { label: "失败", value: "failed" }
]

async function fetchList(useCache = true) {
  // 检查缓存
  if (useCache) {
    const key = getCacheKey()
    const cache = getHistoryCacheStore().get(key)
    if (cache && Date.now() - cache.time < CACHE_DURATION) {
      list.value = cache.list
      total.value = cache.total
      selectedRows.value = []
      lastLoadedAt.value = cache.time
      return
    }
  }

  loading.value = true
  try {
    const { list: records, total: totalCount } = await getDetectionListApi({
      currentPage: query.currentPage,
      size: query.size,
      status: query.status,
      buildingName: query.buildingName || undefined,
      startTime: query.startTime,
      endTime: query.endTime
    })

    list.value = records
    total.value = totalCount
    selectedRows.value = []
    lastLoadedAt.value = Date.now()

    // 更新缓存
    getHistoryCacheStore().set(getCacheKey(), {
      list: records,
      total: totalCount,
      time: lastLoadedAt.value
    })
  } finally {
    loading.value = false
  }
}

function clearHistoryCache() {
  getHistoryCacheStore().clear()
}

async function openDetail(id: string | number) {
  try {
    const task = await getDetectionTaskApi(id)

    // 刷新签名URL
    if (!task.imageSignedUrl && task.imagePath) {
      try {
        const signed = await getDetectionSignedUrlApi(id)
        task.imageSignedUrl = signed.imageSignedUrl
      } catch {
        task.imageSignedUrl = null
      }
    }

    // 使用本地的历史详情任务，不影响检测页面
    historyDetailTask.value = task
    detailVisible.value = true
  } catch {
    ElMessage.error("获取详情失败")
  }
}

function handleSearch() {
  query.currentPage = 1
  query.status = selectedStatus.value || undefined
  if (dateRange.value.length === 2) {
    query.startTime = dayjs(dateRange.value[0]).toISOString()
    query.endTime = dayjs(dateRange.value[1]).toISOString()
  } else {
    query.startTime = undefined
    query.endTime = undefined
  }
  clearHistoryCache()
  void fetchList(false)
}

function handleReset() {
  selectedStatus.value = ""
  query.currentPage = 1
  query.buildingName = ""
  query.status = undefined
  dateRange.value = []
  query.startTime = undefined
  query.endTime = undefined
  clearHistoryCache()
  void fetchList(false)
}

function handleCurrentChange(page: number) {
  query.currentPage = page
  void fetchList()
}

async function handleRetry(id: string | number) {
  try {
    await detectionStore.retryTask(id)
    ElMessage.success("任务已重新提交")
    clearHistoryCache()
    await fetchList(false)
  } catch {
    ElMessage.error("重试失败")
  }
}

async function handleManualRefresh() {
  clearHistoryCache()
  await fetchList(false)
  ElMessage.success("历史列表已刷新")
}

async function handleExportRowReport(taskId: string | number) {
  try {
    const task = await getDetectionTaskApi(taskId)
    await exportSingleDetectionPdf(task, `history-report-${task.id}.pdf`)
    ElMessage.success("PDF报告已导出")
  } catch {
    ElMessage.error("导出失败，请稍后重试")
  }
}

function handleSelectionChange(rows: Detection.DetectionTaskItem[]) {
  selectedRows.value = rows
}

async function handleExportSelectedReport() {
  if (!selectedRows.value.length) {
    ElMessage.warning("请先勾选历史记录")
    return
  }

  try {
    const tasks = await Promise.all(selectedRows.value.map((item) => getDetectionTaskApi(item.id)))
    await exportSelectedDetectionPdf(tasks)
    ElMessage.success(`已导出${tasks.length}条历史记录`)
  } catch {
    ElMessage.error("导出失败，请稍后重试")
  }
}

// 定期刷新签名URL
async function refreshTaskUrl() {
  if (!historyDetailTask.value?.id) return
  try {
    const signed = await getDetectionSignedUrlApi(historyDetailTask.value.id, 3600)
    if (historyDetailTask.value) {
      historyDetailTask.value.imageSignedUrl = signed.imageSignedUrl
    }
  } catch {
    // 忽略错误
  }
}

onMounted(() => {
  selectedStatus.value = query.status || ""
  void fetchList(true)
})

// 当详情框打开时，设置定时刷新签名URL
watch(detailVisible, (isVisible) => {
  if (isVisible) {
    // 每1小时刷新一次签名URL
    const interval = setInterval(refreshTaskUrl, 1000 * 60 * 60)
    onBeforeUnmount(() => clearInterval(interval))
  }
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
          <el-input v-model.trim="query.buildingName" placeholder="输入建筑名称" clearable />
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
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
          <el-button :loading="loading" @click="handleManualRefresh">
            刷新
          </el-button>
          <el-button type="success" plain :disabled="!selectedRows.length" @click="handleExportSelectedReport">
            导出所选PDF
          </el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="任务ID" width="80" />
        <el-table-column prop="buildingName" label="建筑" min-width="60" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'done' ? 'success' : scope.row.status === 'failed' ? 'danger' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="总结" min-width="220" show-overflow-tooltip />
        <el-table-column prop="affectedAreaPercentage" label="污渍占比" width="100">
          <template #default="scope">
            {{ scope.row.affectedAreaPercentage ?? "-" }}%
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="70" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openDetail(scope.row.id)">
              详情
            </el-button>
            <el-button link type="success" @click="handleExportRowReport(scope.row.id)">
              导出PDF
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
          :total="total"
          :page-size="query.size"
          :current-page="query.currentPage"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="检测详情" size="50%">
      <template v-if="historyDetailTask">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="任务ID" :span="2">
            {{ historyDetailTask.id }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="historyDetailTask.status === 'done' ? 'success' : historyDetailTask.status === 'failed' ? 'danger' : 'warning'"
              size="small"
            >
              {{ historyDetailTask.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="建筑">
            {{ historyDetailTask.buildingName }}
          </el-descriptions-item>
          <el-descriptions-item label="楼层">
            {{ historyDetailTask.locationFloor || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="分区">
            {{ historyDetailTask.locationSection || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="污渍类型">
            {{ historyDetailTask.stainType || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="污渍占比">
            {{ historyDetailTask.affectedAreaPercentage ?? "-" }}%
          </el-descriptions-item>
          <el-descriptions-item label="检测时间" :span="2">
            {{ historyDetailTask.createdAt || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="总结" :span="2">
            {{ historyDetailTask.summary || "-" }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 区域明细表格 -->
        <div v-if="historyDetailTask.regions?.length" class="regions-section">
          <p class="section-title">区域明细</p>
          <el-table
            :data="historyDetailTask.regions"
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
          v-if="historyDetailTask.status === 'failed'"
          type="error"
          :closable="false"
          :title="historyDetailTask.errorMessage || '检测失败'"
          style="margin-top: 12px"
        />

        <!-- 图像展示 -->
        <div
          v-if="historyDetailTask.imageSignedUrl || historyDetailTask.processedImageSignedUrl"
          class="image-section"
        >
          <p class="section-title">检测图像</p>
          <div class="image-grid">
            <div class="image-item">
              <p class="image-label">原图</p>
              <el-image
                v-if="historyDetailTask.imageSignedUrl"
                :src="historyDetailTask.imageSignedUrl"
                fit="contain"
                style="width: 100%; height: 300px"
                preview-teleported
              />
              <el-empty v-else description="原图不可用" />
            </div>
            <div class="image-item">
              <p class="image-label">检测后图片</p>
              <el-image
                v-if="historyDetailTask.processedImageSignedUrl"
                :src="historyDetailTask.processedImageSignedUrl"
                fit="contain"
                style="width: 100%; height: 300px"
                preview-teleported
              />
              <el-empty v-else description="检测后图片暂未生成" />
            </div>
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

/* 区域明细表格 */
.regions-section {
  margin-top: 12px;
}

.regions-table {
  width: 100%;
}

/* 图像展示 */
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
  width: 100%;
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

@media (max-width: 1024px) {
  .history-compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>