<template>
  <div class="report-management-container">
    <!-- 标题和操作区 -->
    <div class="report-header">
      <h2>历史报告管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="generateNewReport">
          <el-icon><document-add /></el-icon>
          <span>生成新报告</span>
        </el-button>
        <el-button @click="refreshReports" class="refresh-btn">
          <el-icon><refresh /></el-icon>
          <span>刷新列表</span>
        </el-button>
      </div>
    </div>

    <!-- 筛选面板 -->
    <el-card shadow="hover" class="filter-panel">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="生成时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="date-picker"
          />
        </el-form-item>
        
        <el-form-item label="关键字">
          <el-input
            v-model="filterForm.keyword"
            placeholder="报告名称/任务名称"
            clearable
            class="keyword-input"
          />
        </el-form-item>
        
        <el-form-item class="filter-actions">
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter" class="reset-btn">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报告列表 -->
    <el-card shadow="hover" class="report-list-card">
      <el-table
        :data="filteredReports"
        style="width: 100%"
        v-loading="loading"
        stripe
        @sort-change="handleSortChange"
        :cell-style="{ padding: '10px 0' }"
      >
        <el-table-column
          prop="name"
          label="报告名称"
          width="320"
          sortable
        >
          <template #default="{ row }">
            <div class="report-name-cell">
              <el-icon :size="18" color="#409EFF">
                <document />
              </el-icon>
              <span class="name-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="job_name"
          label="任务名称"
          width="340"
        >
          <template #default="{ row }">
            <div class="job-name-cell" :title="row.job_name">
              {{ row.job_name }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="size"
          label="文件大小"
          width="120"
          sortable
        >
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        
        <el-table-column
          prop="generation_time"
          label="生成时间"
          width="180"
          sortable
        >
          <template #default="{ row }">
            <div class="time-cell" :title="formatDateTime(row.generation_time)">
              {{ formatDateTime(row.generation_time) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column
          label="操作"
          width="180"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="operation-buttons">
              <el-button size="small" @click="downloadReport(row)" class="download-btn">
                <el-icon size="14"><download /></el-icon>
                <span>下载</span>
              </el-button>
              <el-button size="small" type="danger" @click="deleteReport(row)" class="delete-btn">
                <el-icon size="14"><delete /></el-icon>
                <span>删除</span>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalReports"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  DocumentAdd,
  Refresh,
  Delete,
  Download
} from '@element-plus/icons-vue'
import { formatDateTime, formatFileSize } from '../utils/format'
import { apiUrl } from '../config'
const router = useRouter()

// 报告数据
const reports = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalReports = ref(0)
const currentReport = ref(null)
const previewDialogVisible = ref(false)

// 筛选表单
const filterForm = ref({
  dateRange: [],
  keyword: '',
  sortField: '',
  sortOrder: ''
})

// 报告类型选项
const reportTypes = ref([
  { value: 'structure', label: '结构分析报告' },
  { value: 'thermal', label: '热力学报告' },
  { value: 'wind', label: '风荷载报告' },
  { value: 'comprehensive', label: '综合评估报告' },
  { value: 'inspection', label: '检测报告' }
])

// 计算属性 - 筛选后的报告
const filteredReports = computed(() => {
  let result = [...reports.value]
  
  // 日期范围筛选
  if (filterForm.value.dateRange && filterForm.value.dateRange.length === 2) {
    const [start, end] = filterForm.value.dateRange
    result = result.filter(report => {
      const reportDate = report.generation_time.split('T')[0]
      return reportDate >= start && reportDate <= end
    })
  }
  
  // 关键字筛选
  if (filterForm.value.keyword) {
    const keyword = filterForm.value.keyword.toLowerCase()
    result = result.filter(report => 
      report.name.toLowerCase().includes(keyword) ||
      report.job_name?.toLowerCase().includes(keyword))
  }
  
  // 排序
  if (filterForm.value.sortField) {
    result.sort((a, b) => {
      const field = filterForm.value.sortField
      const order = filterForm.value.sortOrder === 'ascending' ? 1 : -1
      
      if (a[field] > b[field]) return order
      if (a[field] < b[field]) return -order
      return 0
    })
  }
  
  // 分页
  return result.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value
  )
})

// 方法
const fetchReports = async () => {
  loading.value = true
  try {
    const response = await getReports({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...filterForm.value
    })
    reports.value = response.results
    totalReports.value = response.count
  } catch (error) {
    console.error(error)
    ElMessage.error('获取报告列表失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  currentPage.value = 1
  fetchReports()
}

const resetFilter = () => {
  filterForm.value = {
    dateRange: [],
    keyword: '',
    sortField: '',
    sortOrder: ''
  }
  handleFilter()
}

const handleSortChange = ({ prop, order }) => {
  filterForm.value.sortField = prop
  filterForm.value.sortOrder = order
  fetchReports()
}

const downloadReport = async (report) => {
  try {
    ElMessage.info(`开始下载: ${report.name}`)
    // 创建隐藏的a标签触发下载
    const link = document.createElement('a')
    link.href = `${apiUrl}/reports/${report.id}/history/download/`
    link.download = `${report.name}.pdf`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('下载请求已发送')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

const deleteReport = async (report) => {
  try {
    await ElMessageBox.confirm(
      `确定删除【${report.name}】吗？此操作不可逆！`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await axios.delete(`${apiUrl}/reports/${report.id}/delete/`)
    
    if (response.data.code === 200) {
      ElMessage.success({
        message: response.data.message || '删除成功',
        duration: 2000
      })
      await fetchReports() // 刷新列表
    }

  } catch (error) {
    if (error.response) {
      // 处理标准错误响应
      const res = error.response.data
      ElMessage.error(res.message || '删除失败')
    } else if (error !== 'cancel') {
      ElMessage.error('请求发送失败')
    }
  }
}

const generateNewReport = () => {
  // 跳转到生成报告页面
  router.push('/reports/generate')
  ElMessage.info('跳转到报告生成页面')
}

const refreshReports = () => {
  fetchReports()
}

const getReportTypeText = (type) => {
  const found = reportTypes.value.find(item => item.value === type)
  return found ? found.label : type
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchReports()
}

const handlePageChange = (val) => {
  currentPage.value = val
  fetchReports()
}

const getReports = async (params) => {
  try {
    const response = await axios.get(`${apiUrl}/reports/history`, { params })
    return response.data.data
  } catch (error) {
    console.error(error) 
  }
}

// 生命周期
onMounted(() => {
  fetchReports()
})
</script>

<style scoped lang="scss">
.report-management-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .report-header {
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

      .refresh-btn {
        color: #4e5969;
        border-color: #dcdfe6;

        &:hover {
          color: #1d2129;
          border-color: #c0c4cc;
          background-color: #f2f3f5;
        }
      }
    }
  }

  .filter-panel {
    margin-bottom: 16px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    :deep(.el-card__body) {
      padding: 16px;
    }

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;

      .el-form-item {
        margin-bottom: 0;

        &.filter-actions {
          margin-left: auto;
          display: flex;
          gap: 8px;
        }
      }

      .date-picker {
        width: 280px;
      }

      .keyword-input {
        width: 200px;
      }

      .reset-btn {
        color: #4e5969;
        border-color: #dcdfe6;

        &:hover {
          color: #1d2129;
          border-color: #c0c4cc;
          background-color: #f2f3f5;
        }
      }
    }
  }

  .report-list-card {
    flex: 1;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      padding: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .el-table {
      flex: 1;
      border-bottom: 1px solid #e5e6eb;

      :deep(.el-table__header) {
        background-color: #f7f8fa;

        th {
          color: #4e5969;
          font-weight: 500;
          background-color: #f7f8fa;
        }
      }

      :deep(.el-table__row) {
        &:hover > td {
          background-color: #f5f7fa;
        }
      }

      .report-name-cell {
        display: flex;
        align-items: center;
        padding-left: 16px;

        .el-icon {
          margin-right: 8px;
        }

        .name-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #1d2129;
        }
      }

      .job-name-cell {
        padding: 0 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #4e5969;
      }

      .time-cell {
        padding: 0 16px;
        color: #4e5969;
        font-size: 13px;
      }

      .operation-buttons {
        display: flex;
        gap: 4px;
        justify-content: center;

        .download-btn {
          color: #409eff;
          border-color: #409eff;

          &:hover {
            background-color: #ecf5ff;
          }
        }

        .delete-btn {
          &:hover {
            background-color: #fef0f0;
          }
        }
      }
    }

    .pagination-container {
      padding: 16px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #f0f0f0;
      background-color: #fff;

      :deep(.el-pagination) {
        color: #4e5969;

        button:disabled {
          color: #c0c4cc;
        }

        .btn-next, .btn-prev {
          &:hover {
            color: #409eff;
          }
        }

        .el-pager {
          li {
            &.active {
              background-color: #409eff;
              color: #fff;
            }
          }
        }
      }
    }
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .report-management-container {
    .filter-panel {
      .filter-form {
        .date-picker {
          width: 240px;
        }

        .keyword-input {
          width: 180px;
        }
      }
    }
  }
}

@media (max-width: 992px) {
  .report-management-container {
    .filter-panel {
      .filter-form {
        .el-form-item.filter-actions {
          margin-left: 0;
          width: 100%;
          justify-content: flex-start;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .report-management-container {
    padding: 12px;

    .report-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;
        flex-direction: column;

        .el-button {
          width: 100%;
        }
      }
    }

    .filter-panel {
      .filter-form {
        gap: 12px;

        .date-picker, .keyword-input {
          width: 100%;
        }
      }
    }
  }
}
</style>