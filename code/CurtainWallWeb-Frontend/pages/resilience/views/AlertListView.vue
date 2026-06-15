<template>
<div class="alert-wall-container">
    <!-- 顶部筛选栏 -->
    <el-card shadow="never" class="filter-card">
    <el-form :inline="true" :model="filterForm">
        <el-form-item label="预警级别" style="width: 205px;">
        <el-select v-model="filterForm.level" placeholder="全部级别" clearable>
            <el-option label="警告" value="CRITICAL" />
            <el-option label="需干预" value="WARNING" />
        </el-select>
        </el-form-item>
        
        <el-form-item label="处理状态" style="width: 205px;">
        <el-select v-model="filterForm.resolved" placeholder="全部状态" clearable>
            <el-option label="已处理" :value="true" />
            <el-option label="未处理" :value="false" />
        </el-select>
        </el-form-item>
        
        <el-form-item label="时间范围">
        <el-date-picker
            v-model="filterForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD HH:mm"
        />
        </el-form-item>
        
        <el-form-item>
        <el-button type="primary" @click="fetchAlerts">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
    </el-form>
    </el-card>

    <!-- 预警数据统计 -->
    <div class="alert-stats">
    <el-row :gutter="20">
        <el-col :span="6">
        <statistic-card 
            title="总预警数" 
            :value="stats.total" 
            icon="warning"
            color="#F56C6C"
        />
        </el-col>
        <el-col :span="6">
        <statistic-card 
            title="严重预警" 
            :value="stats.critical" 
            icon="circle-close-filled"
            color="#F5222D"
        />
        </el-col>
        <el-col :span="6">
        <statistic-card 
            title="未处理预警" 
            :value="stats.unresolved" 
            icon="clock"
            color="#E6A23C"
        />
        </el-col>
        <el-col :span="6">
        <statistic-card 
            title="今日新增" 
            :value="stats.today" 
            icon="data-line"
            color="#409EFF"
        />
        </el-col>
    </el-row>
    </div>

    <!-- 预警列表 -->
    <el-card shadow="never" class="alert-list-card">
    <template #header>
        <div class="card-header">
        <span>预警列表</span>
        <div>
            <el-button type="primary" plain @click="exportAlerts">
            <el-icon><download /></el-icon>
            导出数据
            </el-button>
            <el-button type="success" plain @click="batchResolve" :disabled="!selectedAlerts.length">
            <el-icon><check /></el-icon>
            批量处理
            </el-button>
        </div>
        </div>
    </template>
    
    <el-table
        :data="alertData"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        v-loading="loading"
    >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="alert_id" label="预警ID" width="120" />
        <el-table-column label="预警级别" width="120">
        <template #default="{row}">
            <el-tag :type="row.level === 'CRITICAL' ? 'danger' : 'warning'" effect="dark">
            {{ row.level === 'CRITICAL' ? '警告' : '需干预' }}
            </el-tag>
        </template>
        </el-table-column>
        <el-table-column prop="batch" label="材料批次" width="180" />
        <el-table-column prop="analysis_job" label="分析任务" />
        <el-table-column prop="timestamp" label="预警时间" width="180" />
        <el-table-column label="处理状态" width="120">
        <template #default="{row}">
            <el-tag :type="row.resolved ? 'success' : 'danger'" effect="plain">
            {{ row.resolved ? '已处理' : '未处理' }}
            </el-tag>
        </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
        <template #default="{row}">
            <el-button 
            size="small" 
            type="primary" 
            plain 
            @click="showDetail(row)"
            >
            详情
            </el-button>
            <el-button 
            size="small" 
            type="success" 
            plain 
            @click="resolveAlert(row.alert_id)"
            v-if="!row.resolved"
            >
            处理
            </el-button>
        </template>
        </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination">
        <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchAlerts"
        @current-change="fetchAlerts"
        />
    </div>
    </el-card>

    <!-- 预警详情对话框 -->
    <el-dialog v-model="detailVisible" title="预警详情" width="50%">
    <el-descriptions :column="2" border v-if="currentAlert">
        <el-descriptions-item label="预警ID">{{ currentAlert.alert_id }}</el-descriptions-item>
        <el-descriptions-item label="预警级别">
        <el-tag :type="currentAlert.level === 'CRITICAL' ? 'danger' : 'warning'">
            {{ currentAlert.level === 'CRITICAL' ? '警告' : '需干预' }}
        </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="材料批次">{{ currentAlert.batch }}</el-descriptions-item>
        <el-descriptions-item label="损伤面积">{{ currentAlert.damage_area }}%</el-descriptions-item>
        <el-descriptions-item label="分析任务">{{ currentAlert.analysis_job || '--' }}</el-descriptions-item>
        <el-descriptions-item label="预警时间">{{ currentAlert.timestamp }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">
        <el-tag :type="currentAlert.resolved ? 'success' : 'danger'">
            {{ currentAlert.resolved ? '已处理' : '未处理' }}
        </el-tag>
        </el-descriptions-item>
    </el-descriptions>
    
    <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button 
        type="primary" 
        @click="resolveAlert(currentAlert.alert_id)"
        v-if="!currentAlert.resolved"
        >
        标记为已处理
        </el-button>
    </template>
    </el-dialog>
</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Download, Check } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiUrl } from '../config'

// 筛选表单
const filterForm = reactive({
  level: '',
  resolved: '',
  timeRange: []
})

// 分页配置
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

// 统计数据
const stats = reactive({
  total: 0,
  critical: 0,
  unresolved: 0,
  today: 0
})

// 预警数据
const alertData = ref([])
const loading = ref(false)
const selectedAlerts = ref([])

// 详情对话框
const detailVisible = ref(false)
const currentAlert = ref(null)

// 直接实现的API方法 - 获取预警列表
const getResilienceAlerts = async (params) => {
  try {
    const response = await axios.get(`${apiUrl}/monitoring/alerts/`, { params })
    return response.data
  } catch (error) {
    console.error('获取预警数据失败:', error)
    throw error
  }
}

// 直接实现的API方法 - 处理单个预警
const apiResolveAlert = async (alertId) => {
  try {
    const response = await axios.post(`${apiUrl}/monitoring/alerts/${alertId}/resolve/`)
    return response.data
  } catch (error) {
    console.error('处理预警失败:', error)
    throw error
  }
}

// 获取预警数据
const fetchAlerts = async () => {
  try {
    loading.value = true
    
    // 构造查询参数
    const params = {
      page: pagination.current,
      page_size: pagination.size,
      ...filterForm
    }
    
    // 如果有时间范围
    if (filterForm.timeRange && filterForm.timeRange.length === 2) {
      params.start_time = filterForm.timeRange[0]
      params.end_time = filterForm.timeRange[1]
    }
    
    const res = await getResilienceAlerts(params)
    alertData.value = res.data.alerts
    pagination.total = res.data.total_alerts
    
    // 更新统计数据（这里简化处理，实际应该从接口获取）
    updateStats(res.data.alerts)
    
  } catch (error) {
    console.error('获取预警数据失败:', error)
    ElMessage.error('获取预警数据失败')
  } finally {
    loading.value = false
  }
}

// 更新统计数据
const updateStats = (alerts) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  stats.total = alerts.length
  stats.critical = alerts.filter(a => a.level === 'CRITICAL').length
  stats.unresolved = alerts.filter(a => !a.resolved).length
  stats.today = alerts.filter(a => a.timestamp.includes(today)).length
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.level = ''
  filterForm.resolved = ''
  filterForm.timeRange = []
  fetchAlerts()
}

// 处理预警
const resolveAlert = async (alertId) => {
  try {
    loading.value = true
    await apiResolveAlert(alertId)
    ElMessage.success('预警处理成功')
    fetchAlerts()
    detailVisible.value = false
  } catch (error) {
    console.error('处理预警失败:', error)
    ElMessage.error('处理预警失败')
  } finally {
    loading.value = false
  }
}

// 批量处理
const batchResolve = async () => {
  try {
    loading.value = true
    const alertIds = selectedAlerts.value.map(a => a.alert_id)
    await Promise.all(alertIds.map(id => apiResolveAlert(id)))
    ElMessage.success(`已成功处理 ${alertIds.length} 条预警`)
    fetchAlerts()
  } catch (error) {
    console.error('批量处理失败:', error)
    ElMessage.error('批量处理失败')
  } finally {
    loading.value = false
  }
}

// 导出数据
const exportAlerts = () => {
  // 这里实现导出逻辑，可以使用第三方库如 xlsx
  ElMessage.info('导出功能待实现')
}

// 显示详情
const showDetail = (alert) => {
  currentAlert.value = alert
  detailVisible.value = true
}

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedAlerts.value = selection
}

// 获取损伤状态
const getDamageStatus = (percentage) => {
  if (percentage > 30) return 'exception'
  if (percentage > 15) return 'warning'
  return 'success'
}

// 初始化加载数据
onMounted(() => {
  fetchAlerts()
})
</script>

<style scoped lang="scss">
.alert-wall-container {
padding: 20px;

.filter-card {
    margin-bottom: 20px;
    
    .el-form-item {
    margin-bottom: 0;
    }
}

.alert-stats {
    margin-bottom: 20px;
}

.alert-list-card {
    .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    }
    
    .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    }
}

:deep(.el-descriptions) {
    margin-top: 20px;
}
}
</style>