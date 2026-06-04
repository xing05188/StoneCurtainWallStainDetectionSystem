<template>
  <div class="analysis-container">
    <!-- 标题和操作区 -->
    <div class="analysis-header">
      <h2>分析任务管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showCreateDialog" size="large" class="primary-btn">
          <el-icon><plus /></el-icon>
          <span>创建分析任务</span>
        </el-button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="job-list-container">
      <el-card shadow="hover" class="job-card">
        <div class="filter-bar">
          <el-input
            v-model="filters.searchQuery"
            placeholder="搜索任务名称或数据集"
            clearable
            style="width: 300px"
            @input="applyFilters"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><search /></el-icon>
            </template>
          </el-input>
          
          <div class="filter-actions">
            <el-select
              v-model="filters.status"
              placeholder="任务状态"
              clearable
              style="width: 120px"
              @change="applyFilters"
            >
              <el-option label="全部" value="" />
              <el-option label="等待中" value="pending" />
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>

            <el-select
              v-model="filters.sortField"
              placeholder="排序方式"
              clearable
              style="width: 140px"
              @change="applyFilters"
            >
              <el-option label="按名称排序" value="job_name" />
              <el-option label="按创建时间" value="created_at" />
              <el-option label="按完成时间" value="finished_at" />
            </el-select>

            <el-button @click="toggleSortOrder" class="sort-btn">
              <el-icon>
                <sort v-if="!filters.sortField" />
                <sort-up v-else-if="filters.sortOrder === 'asc'" />
                <sort-down v-else />
              </el-icon>
              {{ filters.sortOrder === 'asc' ? '升序' : '降序' }}
            </el-button>

            <el-button type="info" plain @click="resetFilters" class="reset-btn">
              <el-icon><refresh /></el-icon>
              <span>重置</span>
            </el-button>
            <el-button type="info" plain @click="refreshList" class="refresh-btn">
              <el-icon><refresh /></el-icon>
              <span>刷新</span>
            </el-button>
          </div>
        </div>
        <el-table
          :data="filteredJobs"
          style="width: 100%"
          v-loading="loading"
          row-key="id"
          @row-click="handleRowClick"
          class="job-table"
        >
          <el-table-column prop="job_name" label="任务名称" width="220">
            <template #default="{ row }">
              <div class="job-name-cell">
                <el-icon><document /></el-icon>
                <span class="name-text">{{ row.job_name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" class="status-tag">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="error_log" label="失败原因" width="120" />
          
          <el-table-column prop="dataset" label="数据集" width="150" />
          
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="finished_at" label="完成时间" width="180">
            <template #default="{ row }">
              {{ row.finished_at ? formatDateTime(row.finished_at) : '-' }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button 
                size="small" 
                :disabled="row.status !== 'completed'"
                @click.stop="downloadResult(row)"
                class="download-btn"
              >
                <el-icon><download /></el-icon>
                <span>下载</span>
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click.stop="handleDelete(row)"
                class="delete-btn"
              >
                <el-icon><delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalJobs"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建分析任务"
      width="800px"
      top="5vh"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form
        ref="jobForm"
        label-width="120px"
        label-position="left"
        :rules="jobRules"
        class="form-container"
      >
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="job_name" placeholder="请输入任务名称" />
        </el-form-item>
        
        <el-form-item label="选择数据集" prop="dataset_id">
          <div class="dataset-select-wrapper">
            <el-button type="primary" @click="showDataSetDialog" class="dataset-select-btn">
              <el-icon><plus /></el-icon>
              <span>选择数据集</span>
            </el-button>
            <span
              v-if="selectedDataset"
              class="selected-dataset-name"
            >
              【{{ selectedDataset.name }}】
            </span>
          </div>

          <el-dialog
            title="选择数据集"
            v-model="datasetDialogVisible"
            width="80%"
            class="custom-dialog"
          >
            <DataSetsView 
              v-if="datasetDialogVisible"
              @dataset-selected="handleDatasetSelected"
            />
          </el-dialog>
        </el-form-item>

        <el-form-item label="评估维度配置">
          <div class="dimension-grid-container">
            <el-row :gutter="16">
              <el-col 
                v-for="dimension in allDimensions" 
                :key="dimension.value"
                :xs="24" :sm="12" :md="8"
              >
                <div class="dimension-card">
                  <div class="dimension-header">
                    <span class="dimension-title">{{ dimension.label }}</span>
                  </div>
                  
                  <div class="method-controls">
                    <el-select
                      v-model="selectedDimensions[dimension.value].method"
                      placeholder="选择方法"
                      size="small"
                      style="width: 100%"
                      @change="handleMethodChange(dimension.value)"
                    >
                      <el-option
                        v-for="method in dimensionMethods[dimension.value]"
                        :key="method.value"
                        :label="method.label"
                        :value="method.value"
                      />
                    </el-select>

                    <!-- 添加模型选择器 -->
                    <el-select
                      v-model="selectedDimensions[dimension.value].model_id"
                      placeholder="选择模型"
                      size="small"
                      style="width: 100%; margin-top: 8px"
                      :disabled="!selectedDimensions[dimension.value].method"
                      :loading="selectedDimensions[dimension.value].loading"
                    >
                      <el-option
                        v-for="model in modelsByDimensionMethod[`${dimension.value}_${selectedDimensions[dimension.value].method}`] || []"
                        :key="model.id"
                        :label="model.name"
                        :value="model.id"
                      >
                        <span style="float: left">{{ model.name }}</span>
                        <span v-if="model.is_default" style="float: right; color: var(--el-color-primary)">
                          <el-icon><Star /></el-icon>
                        </span>
                      </el-option>
                    </el-select>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-form-item>
        
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeCreateDialog">取消</el-button>
          <el-button type="primary" @click="submitJobForm" :loading="submitting">
            立即创建
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 任务状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="`任务状态 - ${currentJob?.job_name || ''}`"
      width="600px"
      class="custom-dialog"
    >
      <div v-if="currentJob" class="job-status">
        <el-steps :active="getStepActive(currentJob.status)" finish-status="success">
          <el-step title="已创建" :description="formatDateTime(currentJob.created_at)" />
          <el-step title="运行中" :description="currentJob.started_at ? formatDateTime(currentJob.started_at) : '等待中'" />
          <el-step title="已完成" :description="currentJob.finished_at ? formatDateTime(currentJob.finished_at) : '等待中'" />
        </el-steps>
        
        <div class="progress-container" v-if="currentJob.status === 'running'">
          <el-progress
            :percentage="currentJob.progress || 0"
            :stroke-width="16"
            striped
            striped-flow
          />
          <div class="progress-text">
            当前进度: {{ currentJob.progress || 0 }}%
            <span v-if="currentJob.current_step"> - {{ currentJob.current_step }}</span>
          </div>
        </div>
        
        <div class="status-detail">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务ID">{{ currentJob.id }}</el-descriptions-item>
            <el-descriptions-item label="数据集">{{ currentJob.dataset }}</el-descriptions-item>
            <el-descriptions-item label="失败原因">{{ currentJob.error_log || '无' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="statusDialogVisible = false">关闭</el-button>
          <el-button
            v-if="currentJob?.status === 'completed'"
            type="primary"
            @click="downloadResult(currentJob)"
          >
            下载结果
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Document,
  Download,
  Delete,
  Search,
  Sort,
  SortUp,
  SortDown,
  Refresh,
  Star
} from '@element-plus/icons-vue'
import { formatDateTime } from '../utils/format'
import axios from 'axios'
import { apiUrl } from '../config'
import DataSetsView from './DataSetsView.vue'


interface Model {
  id: number
  name: string
  version?: string
  dimension: string
  method: string
  is_default?: boolean
}
interface DimensionConfig {
  enabled: boolean
  method: string
  model_id?: number
  loading: boolean
}
interface Job {
  id: number
  job_name: string
  status: string
  dataset: string
  created_at: string
  finished_at?: string
  started_at?: string
  progress?: number
  current_step?: string
  error_log?: string
  creator?: string
}

const emit = defineEmits(['job-selected'])

// 任务列表相关
const jobs = ref<Job[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalJobs = ref(0)

// 对话框相关
const createDialogVisible = ref(false)
const statusDialogVisible = ref(false)
const datasetDialogVisible = ref(false)
const currentJob = ref<Job | null>(null)
const submitting = ref(false)
const job_name = ref('')
const dataset_id = ref('')
const description = ref('')
const selectedDataset = ref<any>(null)

const filters = ref({
  searchQuery: '',
  status: '',
  sortField: 'created_at',
  sortOrder: 'desc'
})

// 更新维度配置
const allDimensions = ref([
  { value: 'structural', label: '结构韧性' },
  { value: 'geometric', label: '几何与安装韧性' },
  { value: 'damage', label: '损伤韧性' },
  { value: 'visual', label: '耐久与视觉韧性' },
  { value: 'overall', label: '综合评估' }
])

// 更新各维度可选方法
const dimensionMethods = ref({
  structural: [
    { value: 'grey_fuzzy', label: '灰色模糊综合法' },
    { value: 'entropy', label: '熵权法' },
    { value: 'topsis', label: 'TOPSIS法' },
    { value: 'fuzzy', label: '模糊评价法' }
  ],
  geometric: [ 
    { value: 'composite', label: '复合指标法' },
    { value: 'fuzzy', label: '模糊评价法' },
    { value: 'error', label: '误差分析法' }
  ],
  damage: [
    { value: 'fuzzy_vikor', label: '模糊VIKOR法' },
    { value: 'ahp', label: 'AHP层次分析法' }
  ],
  visual: [
    { value: 'defect_analysis', label: '缺陷分析法' },
    { value: 'expert', label: '专家评分法' },
    { value: 'fuzzy_comprehensive', label: '模糊评价法' }
  ],
  overall: [
    { value: 'composite', label: '综合评分' },
    { value: 'vikor_entropy', label: 'VIKOR-熵权法' },
    { value: 'entropy', label: '熵权法' },
    { value: 'topsis', label: 'TOPSIS法' }
  ]
})

// 验证规则
const jobRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  dataset_id: [
    { required: true, message: '请选择数据集', trigger: 'change' }
  ]
}

const selectedDimensions = ref<Record<string, DimensionConfig>>(
  allDimensions.value.reduce((acc, dim) => {
    acc[dim.value] = { 
      enabled: true, 
      method: '', 
      model_id: null,
      loading: false
    }
    return acc
  }, {} as Record<string, DimensionConfig>)
)

const modelsByDimensionMethod = ref<Record<string, Model[]>>({})

// 方法
const fetchJobs = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      search: filters.value.searchQuery,
      status: filters.value.status,
      ordering: filters.value.sortField ? 
        `${filters.value.sortOrder === 'desc' ? '-' : ''}${filters.value.sortField}` : ''
    }
    
    const res = await axios.get(`${apiUrl}/analysis/list/`, { params })
    jobs.value = res.data.data.results
    totalJobs.value = res.data.data.count
  } catch (error) {
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const fetchModels = async () => {
  try {
    // 先获取所有模型
    const response = await axios.get<Model[]>(`${apiUrl}/analysis/models/`)
    const allModels = response.data.data.results.map(m => ({
      ...m,
      version: m.version || '1.0'
    }))
    
    // 按维度和方法分类
    modelsByDimensionMethod.value = allDimensions.value.reduce((acc, dim) => {
      dimensionMethods.value[dim.value].forEach(method => {
        const key = `${dim.value}_${method.value}`
        acc[key] = allModels.filter(
          model => model.dimension === dim.value && model.method === method.value
        )
      })
      return acc
    }, {} as Record<string, Model[]>)
    
    // 设置默认方法并预加载模型
    await Promise.all(allDimensions.value.map(async dim => {
      if (dimensionMethods.value[dim.value].length > 0) {
        const method = dimensionMethods.value[dim.value][0].value
        selectedDimensions.value[dim.value].method = method
        
        // 预加载默认方法的模型
        const models = await fetchModelsForMethod(dim.value, method)
        modelsByDimensionMethod.value[`${dim.value}_${method}`] = models
        
        // 设置默认模型
        const defaultModel = models.find(m => m.is_default)
        if (defaultModel) {
          selectedDimensions.value[dim.value].model_id = defaultModel.id
        }
      }
    }))
  } catch (error) {    
    let errorMessage = "获取模型失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  }
}

const fetchModelsForMethod = async (dimension: string, method: string) => {
  try {
    const response = await axios.get(`${apiUrl}/analysis/models/`, {
      params: { dimension, method }
    })
    return response.data.data.results || []
  } catch (error) {
    ElMessage.error(`获取${dimension}维度${method}方法的模型失败`)
    return []
  }
}
const handleMethodChange = async (dimension: string) => {
  const config = selectedDimensions.value[dimension]
  config.model_id = null
  config.loading = true
  
  try {
    const method = config.method
    if (method) {
      const models = await fetchModelsForMethod(dimension, method)
      modelsByDimensionMethod.value[`${dimension}_${method}`] = models
      // 自动选择默认模型
      const defaultModel = models.find(m => m.is_default)
      if (defaultModel) {
        config.model_id = defaultModel.id
      }
    }
  } catch (error) {
    ElMessage.error(`获取${dimension}维度的模型失败`)
  } finally {
    config.loading = false
  }
}
const submitJobForm = async () => {
  // 构建请求数据（不包含null的model_id）
  const payload = {
    job_name: job_name.value,
    dataset_id: dataset_id.value,
    dimensions: allDimensions.value.map(dim => {
      const dimensionConfig: any = {
        name: dim.value,
        method: selectedDimensions.value[dim.value].method
      }
      // 只有当model_id有值时才包含该字段
      if (selectedDimensions.value[dim.value].model_id) {
        dimensionConfig.model_id = selectedDimensions.value[dim.value].model_id
      }
      return dimensionConfig
    }),
    description: description.value
  }

  // 验证必填项
  const missingMethods = allDimensions.value.filter(dim => 
    !selectedDimensions.value[dim.value].method
  )
  
  if (missingMethods.length > 0) {
    ElMessage.error(`请为${missingMethods.map(d => d.label).join('、')}选择评估方法`)
    return
  }

  try {
    submitting.value = true
    await axios.post(`${apiUrl}/analysis/jobs/`, payload)
    ElMessage.success('任务创建成功')
    createDialogVisible.value = false
    fetchJobs()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '创建任务失败')
  } finally {
    submitting.value = false
  }
}
const showCreateDialog = () => {
  createDialogVisible.value = true
}

const showDataSetDialog = () => {
  datasetDialogVisible.value = true
}

const closeCreateDialog = () => {
  createDialogVisible.value = false
}

const refreshList = () => {
  currentPage.value = 1
  fetchJobs()
}

const handleRowClick = (row: Job) => {
  showDetail(row)
}

const showDetail = async (job: Job) => {
  emit('job-selected', job)
  try {
    currentJob.value = job
    fetchJobStatus(job.id)
    statusDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取分析任务详情失败')
  }
}

const fetchJobStatus = async (jobId: number) => {
  try {
    const res = await getJobStatus(jobId)
    currentJob.value = { ...currentJob.value, ...res.data }
    
    if (res.data.status === 'running') {
      setTimeout(() => fetchJobStatus(jobId), 3000)
    }
  } catch (error) {
    ElMessage.error('获取任务状态失败')
  }
}

const downloadResult = async (job: Job) => {
  try {
    const fileBlob = await downloadJobResult(job.id)
    if (fileBlob instanceof Blob) {
      const fileURL = URL.createObjectURL(fileBlob)
      const a = document.createElement('a')
      a.href = fileURL
      a.download = `${job.job_name}_分析结果`
      a.click()
      URL.revokeObjectURL(fileURL)
      ElMessage.success(`下载成功: ${job.job_name}`)
    } else {
      ElMessage.error('下载失败: 响应数据格式错误')
    }
  } catch (error: any) {
    ElMessage.error(`下载失败: ${error.message || '未知错误'}`)
  }
}

const downloadJobResult = (jobId: number) => {
  return axios.get(`${apiUrl}/analysis/jobs/${jobId}/download/`, {
    responseType: 'blob'
  }).then(response => response.data)
}

const handleDelete = (job: Job) => {
  ElMessageBox.confirm(
    `确定要删除任务 "${job.job_name}" 吗?`,
    '警告',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await deleteJob(job.id)
      ElMessage.success('删除成功')
      fetchJobs()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const applyFilters = () => {
  currentPage.value = 1
  fetchJobs()
}

const resetFilters = () => {
  filters.value = {
    searchQuery: '',
    status: '',
    sortField: 'created_at',
    sortOrder: 'desc'
  }
  applyFilters()
}

const toggleSortOrder = () => {
  filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
  applyFilters()
}

const handleDatasetSelected = (row: any) => {
  dataset_id.value = row.id
  selectedDataset.value = row
  datasetDialogVisible.value = false
}

const filteredJobs = computed(() => {
  let result = [...jobs.value]
  
  if (filters.value.searchQuery) {
    const query = filters.value.searchQuery.toLowerCase()
    result = result.filter(job => 
      job.job_name.toLowerCase().includes(query) ||
      (job.dataset && job.dataset.toLowerCase().includes(query)))
  }
  
  if (filters.value.status) {
    result = result.filter(job => job.status === filters.value.status)
  }
  
  if (filters.value.sortField) {
    result.sort((a, b) => {
      const field = filters.value.sortField
      const order = filters.value.sortOrder === 'asc' ? 1 : -1
      
      if (field === 'created_at' || field === 'finished_at') {
        return (new Date(a[field]) - new Date(b[field])) * order
      }
      
      if (field === 'job_name') {
        return a.job_name.localeCompare(b.job_name) * order
      }
      
      return 0
    })
  }
  
  return result
})

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    running: '',
    completed: 'success',
    failed: 'danger'
  }
  return map[status] || 'warning'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status
}

const getStepActive = (status: string) => {
  const map: Record<string, number> = {
    pending: 1,
    running: 2,
    completed: 3,
    failed: 2
  }
  return map[status] || 1
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchJobs()
}

const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchJobs()
}

const getJobStatus = (jobId: number) => {
  return axios.get(`${apiUrl}/analysis/jobs/${jobId}/`)
}

const deleteJob = (id: number) => {
  return axios.delete(`${apiUrl}/analysis/jobs/delete/${id}/`)
}

onMounted(() => {
  fetchModels()
  fetchJobs()
})
</script>

<style scoped lang="scss">
.analysis-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;

    h2 {
      font-size: 20px;
      color: #1d2129;
      margin: 0;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 12px;

      .primary-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
  }

  .job-list-container {
    flex: 1;

    .job-card {
      height: 100%;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-radius: 8px;

      :deep(.el-card__body) {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .filter-bar {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
        flex-wrap: wrap;
        gap: 15px;

        .el-input {
          width: 300px;

          &:deep(.el-input__wrapper) {
            border-radius: 4px;
          }
        }

        .filter-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;

          .el-select {
            width: 120px;

            &:deep(.el-select__wrapper) {
              border-radius: 4px;
            }
          }

          .sort-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
          }

          .reset-btn, .refresh-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
          }
        }
      }

      .job-table {
        flex: 1;

        :deep(.el-table) {
          width: 100%;
          border-collapse: collapse;
        }

        :deep(.el-table__header-wrapper) {
          background-color: #f5f7fa;
        }

        :deep(.el-table__header tr th) {
          background-color: #f5f7fa;
          color: #4e5969;
          font-weight: 500;
          border-bottom: 1px solid #eee;
        }

        :deep(.el-table__body tr td) {
          border-bottom: 1px solid #f0f0f0;
        }

        :deep(.el-table__body tr:hover > td) {
          background-color: #f5f7fa;
          cursor: pointer;
        }

        :deep(.job-name-cell) {
          display: flex;
          align-items: center;

          .el-icon {
            margin-right: 8px;
            color: #409eff;
          }

          .name-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        :deep(.status-tag) {
          height: 24px;
          line-height: 24px;
          padding: 0 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        :deep(.download-btn) {
          color: #409eff;
          border-color: #409eff;
          background-color: #ecf5ff;
          margin-right: 5px;

          &:hover {
            background-color: #e6f2ff;
            color: #3a8ee6;
            border-color: #3a8ee6;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        :deep(.delete-btn) {
          &:hover {
            opacity: 0.9;
          }
        }
      }

      .pagination-container {
        padding: 16px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #eee;

        :deep(.el-pagination) {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :deep(.el-pagination__sizes) {
          margin-right: 10px;
        }
      }
    }
  }
}

/* 对话框样式 */
.custom-dialog {
  border-radius: 8px;
  overflow: hidden;

  :deep(.el-dialog__header) {
    padding: 18px 20px;
    border-bottom: 1px solid #eee;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
    font-weight: 500;
    color: #1d2129;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 20px;
    border-top: 1px solid #eee;
  }

  :deep(.dialog-footer) {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  :deep(.el-button) {
    margin-left: 0;
  }
}

.form-container {
  :deep(.el-form) {
    width: 100%;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-form-item__label) {
    color: #4e5969;
    font-weight: 500;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }

  .dataset-select-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;

    .dataset-select-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .selected-dataset-name {
      font {
      font-weight: 500;
      color: #409eff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
  }

  .dimension-grid-container {
    padding: 8px;
    background-color: #f5f7fa;
    border-radius: 8px;
  }

  .dimension-card {
    background: #fff;
    border-radius: 8px;
    padding: 12px;
    height: 100%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    margin-bottom: 16px;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }
  }

  .dimension-header {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .dimension-title {
      font-weight: 500;
      font-size: 14px;
      color: #1d2129;
    }
  }

  .method-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.job-status {
  .progress-container {
    margin: 20px 0;

    .progress-text {
      margin-top: 8px;
      font-size: 13px;
      color: #666;
      text-align: center;
    }
  }

  .status-detail {
    margin-top: 20px;
  }
}

/* 步骤条样式调整 */
:deep(.el-steps) {
  padding: 0 20px;
  margin-top: 10px;

  .el-step__title {
    font-size: 13px;
  }

  .el-step__description {
    font-size: 12px;
    color: #666;
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .analysis-container {
    .job-list-container {
      .job-card {
        .filter-bar {
          flex-direction: column;
          align-items: flex-start;

          .el-input {
            width: 100% !important;
          }

          .filter-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .analysis-container {
    padding: 12px;

    .analysis-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;

        .primary-btn {
          width: 100%;
          justify-content: center;
        }
      }
    }

    .job-list-container {
      .job-card {
        .filter-bar {
          .filter-actions {
            flex-direction: column;
            width: 100%;
            gap: 8px;

            .el-select {
              width: 100% !important;
            }

            .sort-btn, .reset-btn, .refresh-btn {
              width: 100%;
              justify-content: center;
            }
          }
        }

        .job-table {
          :deep(.el-table__fixed-right) {
            width: 120px !important;
          }

          :deep(.el-button) {
            padding: 0 8px;
            font-size: 12px;

            .el-icon {
              font-size: 14px;
            }

            span {
              display: none;
            }
          }
        }
      }
    }
  }

  .custom-dialog {
    width: 90% !important;
  }

  .dimension-card {
    margin-bottom: 12px;
  }
}
}
</style>