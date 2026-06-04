<template>
  <div class="service-status-container">
    <!-- 标题和操作区 -->
    <div class="status-header">
      <h2>系统服务状态监控</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="refreshAll" :loading="refreshing">
          <el-icon><refresh /></el-icon>
          <span>刷新状态</span>
        </el-button>
      </div>
    </div>

    <!-- 服务概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <status-card 
            title="核心服务" 
            :status="serviceStatus.core" 
            :count="serviceCounts.core"
            icon="cpu"
            color="#409EFF"
          />
        </el-col>
        <el-col :span="6">
          <status-card 
            title="数据服务" 
            :status="serviceStatus.data" 
            :count="serviceCounts.data"
            icon="data-board"
            color="#67C23A"
          />
        </el-col>
        <el-col :span="6">
          <status-card 
            title="分析服务" 
            :status="serviceStatus.analysis" 
            :count="serviceCounts.analysis"
            icon="data-analysis"
            color="#E6A23C"
          />
        </el-col>
        <el-col :span="6">
          <status-card 
            title="外部依赖" 
            :status="serviceStatus.dependencies" 
            :count="serviceCounts.dependencies"
            icon="connection"
            color="#F56C6C"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 左侧内容 -->
      <div class="left-content">
        <!-- 服务健康状态 -->
        <el-card shadow="hover" class="health-status">
          <template #header>
            <div class="card-header">
              <span>服务健康状态</span>
              <!-- <el-tag :type="overallStatus === 'healthy' ? 'success' : 'danger'">
                {{ overallStatus === 'healthy' ? '所有系统正常' : '发现异常服务' }}
              </el-tag> -->
            </div>
          </template>
          <el-table
            :data="serviceList"
            style="width: 100%"
            v-loading="loading"
            row-class-name="service-row"
          >
            <el-table-column prop="name" label="服务名称" width="180">
              <template #default="{ row }">
                <div class="service-name">
                  <el-icon :color="getStatusColor(row.status)">
                    <circle-check-filled />
                  </el-icon>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="type" label="服务类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getServiceTypeTag(row.type)">
                  {{ getServiceTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="host" label="主机/IP" width="150" />
            
            <!-- <el-table-column prop="uptime" label="运行时间" width="150">
              <template #default="{ row }">
                {{ formatUptime(row.uptime) }}
              </template>
            </el-table-column> -->
            
            <!-- <el-table-column prop="version" label="版本" width="120" /> -->
            
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusTag(row.status)" effect="plain">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <!-- <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="text" @click="showServiceDetail(row)">详情</el-button>
              </template>
            </el-table-column> -->
          </el-table>
        </el-card>

        <!-- 实时日志 -->
        <!-- <el-card shadow="hover" class="live-logs">
          <template #header>
            <div class="card-header">
              <span>实时系统日志</span>
              <el-button-group>
                <el-button :type="logLevel === 'all' ? 'primary' : ''" @click="changeLogLevel('all')">全部</el-button>
                <el-button :type="logLevel === 'error' ? 'primary' : ''" @click="changeLogLevel('error')">错误</el-button>
                <el-button :type="logLevel === 'warning' ? 'primary' : ''" @click="changeLogLevel('warning')">警告</el-button>
              </el-button-group>
            </div>
          </template>
          <div class="log-content">
            <div 
              v-for="(log, index) in filteredLogs" 
              :key="index" 
              class="log-item"
              :class="log.level"
            >
              <div class="log-time">{{ formatLogTime(log.time) }}</div>
              <div class="log-message">
                <span class="log-service">[{{ log.service }}]</span>
                {{ log.message }}
              </div>
            </div>
            <div v-if="filteredLogs.length === 0" class="empty-logs">
              暂无日志数据
            </div>
          </div>
        </el-card> -->
      </div>

      <!-- 右侧内容 -->
      <div class="right-content">
        <!-- 资源监控 -->
        <el-card shadow="hover" class="resource-monitor">
          <template #header>
            <div class="card-header">
              <span>资源监控</span>
              <el-select v-model="resourceView" size="small" style="width: 120px">
                <el-option label="概览视图" value="overview" />
                <el-option label="详细视图" value="detailed" />
              </el-select>
            </div>
          </template>
          <div class="resource-grid">
            <div class="resource-item">
              <div class="resource-header">
                <el-icon><cpu /></el-icon>
                <span>CPU使用率</span>
              </div>
              <div class="resource-chart">
                <mini-chart :data="cpuUsage.slice(-10)" color="#409EFF" />
              </div>
              <div class="resource-stats">
                <span>当前: {{ currentCpuUsage }}%</span>
                <span>峰值: {{ maxCpuUsage }}%</span>
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-header">
                <el-icon><grid /></el-icon>
                <span>内存使用</span>
              </div>
              <div class="resource-chart">
                <mini-chart :data="memoryUsage.slice(-10)" color="#67C23A" />
              </div>
              <div class="resource-stats">
                <span>使用: {{ formatMemory(currentMemory) }}GB</span>
                <span>剩余: {{ formatMemory(totalMemory - currentMemory) }}GB</span>
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-header">
                <el-icon><data-board /></el-icon>
                <span>磁盘空间</span>
              </div>
              <div class="resource-chart">
                <mini-chart :data="diskUsage.slice(-10)" color="#E6A23C" />
              </div>
              <div class="resource-stats">
                <span>使用: {{ formatDiskSpace(usedDisk) }}GB</span>
                <span>剩余: {{ formatDiskSpace(totalDisk - usedDisk) }}GB</span>
              </div>
            </div>
            
            <div class="resource-item">
              <div class="resource-header">
                <el-icon><link /></el-icon>
                <span>网络流量</span>
              </div>
              <div class="resource-chart">
                <mini-chart :data="networkIn.slice(-10)" color="#F56C6C" />
                <mini-chart :data="networkOut.slice(-10)" color="#909399" />
              </div>
              <div class="resource-stats">
                <span>入: {{ formatNetwork(currentNetworkIn) }}</span>
                <span>出: {{ formatNetwork(currentNetworkOut) }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 告警信息 -->
        <!-- <el-card shadow="hover" class="alerts-card">
          <template #header>
            <div class="card-header">
              <span>告警信息</span>
              <el-button type="text" @click="navigateToAlerts">查看全部</el-button>
            </div>
          </template>
          <div class="alert-list">
            <div v-for="alert in recentAlerts" :key="alert.id" class="alert-item">
              <el-icon :size="20" :color="getAlertColor(alert.severity)">
                <component :is="getAlertIcon(alert.severity)" />
              </el-icon>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-meta">
                  <span class="alert-service">{{ alert.service }}</span>
                  <span class="alert-time">{{ formatAlertTime(alert.time) }}</span>
                </div>
              </div>
            </div>
            <div v-if="recentAlerts.length === 0" class="empty-alerts">
              暂无未处理告警
            </div>
          </div>
        </el-card> -->
      </div>
    </div>

    <!-- 服务详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`服务详情 - ${currentService?.name || ''}`"
      width="60%"
    >
      <div v-if="currentService" class="service-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务名称">{{ currentService.name }}</el-descriptions-item>
          <el-descriptions-item label="服务类型">{{ getServiceTypeText(currentService.type) }}</el-descriptions-item>
          <el-descriptions-item label="主机地址">{{ currentService.host }}</el-descriptions-item>
          <el-descriptions-item label="运行状态">
            <el-tag :type="getStatusTag(currentService.status)" size="small">
              {{ getStatusText(currentService.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启动时间">{{ formatFullTime(currentService.startTime) }}</el-descriptions-item>
          <!-- <el-descriptions-item label="运行时间">{{ formatUptime(currentService.uptime) }}</el-descriptions-item> -->
          <!-- <el-descriptions-item label="服务版本">{{ currentService.version }}</el-descriptions-item> -->
          <el-descriptions-item label="资源占用">
            CPU: {{ currentService.cpuUsage || 0 }}% | 
            内存: {{ formatMemory(currentService.memoryUsage || 0) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="service-metrics">
          <h3>性能指标</h3>
          <div class="metrics-grid">
            <div class="metric-chart">
              <h4>CPU使用率</h4>
              <service-chart :data="currentService.cpuHistory || []" color="#409EFF" />
            </div>
            <div class="metric-chart">
              <h4>内存占用</h4>
              <service-chart :data="currentService.memoryHistory || []" color="#67C23A" />
            </div>
          </div>
        </div>
        
        <div class="service-actions">
          <el-button type="primary" v-if="currentService.status !== 'running'" @click="restartService(currentService)">
            <el-icon><refresh /></el-icon>
            <span>重启服务</span>
          </el-button>
          <el-button v-if="currentService.status === 'running'" @click="stopService(currentService)">
            <el-icon><switch-button /></el-icon>
            <span>停止服务</span>
          </el-button>
          <el-button @click="showServiceLogs(currentService)">
            <el-icon><document /></el-icon>
            <span>查看日志</span>
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { apiUrl } from '../config'
import {
  Refresh,
  Setting,
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled,
  Cpu,
  Grid,
  DataBoard,
  Link,
  SwitchButton,
  Document
} from '@element-plus/icons-vue'
import StatusCard from '../components/StatusCard.vue'
import MiniChart from '../components/MiniChart.vue'
import ServiceChart from '../components/ColumnTypeChart.vue'
import { formatMemory, formatDiskSpace, formatNetwork, formatTime } from '../utils/format'

const router = useRouter()

// 服务状态数据
const loadingStatus = ref(false)
const refreshing = ref(false)
const detailDialogVisible = ref(false)
const currentService = ref(null)
const resourceView = ref('overview')
const logLevel = ref('all')
const loadingList = ref(false)

// 服务分类状态
const serviceStatus = ref({
  core: 'healthy',
  data: 'healthy',
  analysis: 'warning',
  dependencies: 'error'
})

const serviceCounts = ref({
  core: { total: 0, running: 0, warning: 0, down: 0 },
  data: { total: 0, running: 0, warning: 0, down: 0 },
  analysis: { total: 0, running: 0, warning: 0, down: 0 },
  dependencies: { total: 0, running: 0, warning: 0, down: 0 }
})

// 服务列表
const serviceList = ref([])

// 实时日志
const systemLogs = ref([
  { time: Date.now() - 10000, service: 'API Gateway', level: 'info', message: 'Request processed successfully' },
  { time: Date.now() - 15000, service: 'Database', level: 'warning', message: 'Connection pool 80% utilized' },
  { time: Date.now() - 20000, service: 'Analysis', level: 'error', message: 'Failed to process job #12345' },
  // 更多日志数据...
])

// 资源监控数据
// const cpuUsage = ref([30, 35, 40, 38, 42, 45, 40, 38, 35, 32])
// const memoryUsage = ref([60, 62, 65, 63, 67, 70, 68, 65, 63, 60])
// const diskUsage = ref([45, 46, 47, 48, 49, 50, 49, 48, 47, 46])
// const networkIn = ref([10, 12, 15, 18, 20, 18, 15, 12, 10, 8])
// const networkOut = ref([8, 10, 12, 15, 18, 15, 12, 10, 8, 6])
const cpuUsage = ref([])
const memoryTotal = ref([])
const memoryUsage = ref([])
const diskTotal = ref([])
const diskUsage = ref([])
const networkIn = ref([])
const networkOut = ref([])

// 告警信息
const recentAlerts = ref([
  { id: 1, title: '数据库连接池接近满载', service: 'Database', severity: 'warning', time: Date.now() - 3600000 },
  { id: 2, title: '外部API服务不可用', service: 'External API', severity: 'critical', time: Date.now() - 7200000 },
  // 更多告警数据...
])

// 计算属性
const overallStatus = computed(() => {
  return serviceList.value.some(s => s.status !== 'running') ? 'degraded' : 'healthy'
})

const filteredLogs = computed(() => {
  return logLevel.value === 'all' 
    ? [...systemLogs.value].reverse() 
    : systemLogs.value.filter(log => log.level === logLevel.value).reverse()
})

const currentCpuUsage = computed(() => cpuUsage.value[cpuUsage.value.length - 1])
const maxCpuUsage = computed(() => Math.max(...cpuUsage.value))
const currentMemory = computed(() => memoryUsage.value[memoryUsage.value.length - 1])
const totalMemory = computed(() => 1024 * 1024 * 32) // 32GB
const usedDisk = computed(() => diskUsage.value[diskUsage.value.length - 1])
const totalDisk = computed(() => diskTotal.value[diskTotal.value.length - 1])
const currentNetworkIn = computed(() => networkIn.value[networkIn.value.length - 1])
const currentNetworkOut = computed(() => networkOut.value[networkOut.value.length - 1])

// 方法
const refreshAll = async () => {
  refreshing.value = true
  try {
    await fetchServiceStatus()
    await fetchResourceUsage()
    console.log(currentMemory.value)
    ElMessage.success('状态已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const showSettings = () => {
  // 跳转到监控设置页面
  // router.push('/settings/monitoring')
  ElMessage.info('跳转到监控设置页面')
}

const showServiceDetail = (service) => {
  currentService.value = service
  detailDialogVisible.value = true
}

const restartService = (service) => {
  ElMessageBox.confirm(
    `确定要重启服务 "${service.name}" 吗?`,
    '确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 模拟API调用
      await restartServiceById(service.id)
      ElMessage.success('服务重启命令已发送')
      fetchServiceStatus()
    } catch (error) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

const stopService = (service) => {
  ElMessageBox.confirm(
    `确定要停止服务 "${service.name}" 吗?`,
    '确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 模拟API调用
      await stopServiceById(service.id)
      ElMessage.success('服务停止命令已发送')
      fetchServiceStatus()
    } catch (error) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

const showServiceLogs = (service) => {
  // 跳转到服务日志页面
  // router.push(`/logs/service/${service.id}`)
  ElMessage.info(`查看 ${service.name} 的日志`)
}

const changeLogLevel = (level) => {
  logLevel.value = level
}

const navigateToAlerts = () => {
  // router.push('/alerts')
  ElMessage.info('跳转到告警管理页面')
}

const getStatusColor = (status) => {
  return {
    running: '#67C23A',
    warning: '#67C23A',
    down: '#67C23A'
  }[status] || '#909399'
}

const getStatusTag = (status) => {
  return {
    running: 'success',
    warning: 'success',
    down: 'danger'
  }[status] || 'info'
}

const getStatusText = (status) => {
  return {
    running: '运行中',
    warning: '运行中',
    down: '已停止'
  }[status] || status
}

const getServiceTypeTag = (type) => {
  return {
    core: '',
    data: 'success',
    analysis: 'warning',
    external: 'danger'
  }[type] || 'info'
}

const getServiceTypeText = (type) => {
  return {
    core: '核心服务',
    data: '数据服务',
    analysis: '分析服务',
    external: '外部依赖'
  }[type] || type
}

const getAlertColor = (severity) => {
  return {
    critical: '#F56C6C',
    warning: '#E6A23C',
    info: '#409EFF'
  }[severity] || '#909399'
}

const getAlertIcon = (severity) => {
  return {
    critical: CircleCloseFilled,
    warning: WarningFilled,
    info: CircleCheckFilled
  }[severity] || CircleCheckFilled
}

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  return `${days}d ${hours}h ${mins}m`
}

const formatLogTime = (timestamp) => {
  return formatTime(new Date(timestamp))
}

const formatFullTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatAlertTime = (timestamp) => {
  return formatTime(new Date(timestamp))
}

const fetchServiceStatus = async () => {
  try {
    const response = await axios.get(`${ apiUrl }/monitoring/status/`)
    serviceCounts.value = response.data.data
    console.log(serviceCounts.value)
  } catch (error) {
    ElMessage.error('获取服务状态失败')
    console.error(error)
  }
}

const fetchServiveList = async () => {
  try {
    const response = await axios.get(`${ apiUrl }/monitoring/list/`)
    serviceList.value = response.data.data
    console.log(response.data)
  } catch (error) {
    ElMessage.error('获取服务列表失败')
    console.error(error)
  }
}

const fetchResourceUsage = async () => {
  try {
    const res = await axios.get(`${ apiUrl }/monitoring/resource`)
    if (res.data.code === 200) {
      const data = res.data.data
      cpuUsage.value.push(data.cpu_usage.toFixed(2))
      memoryTotal.value.push(data.memory_total)
      memoryUsage.value.push(data.memory_used)
      diskTotal.value.push(data.disk_total)
      diskUsage.value.push(data.disk_used)
      networkIn.value.push(data.network_in)
      networkOut.value.push(data.network_out)
    }
  } catch (err) {
    console.error('资源监控数据获取失败:', err)
  }
}

const restartServiceById = (serviceId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true })
    }, 1000)
  })
}

const stopServiceById = (serviceId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true })
    }, 1000)
  })
}

let updateInterval
const updateResourceData = () => {
  // // 更新CPU数据
  // cpuUsage.value = [...cpuUsage.value.slice(1), Math.max(5, Math.min(80, cpuUsage.value[cpuUsage.value.length - 1] + (Math.random() * 10 - 5)))]
  
  // // 更新内存数据
  // memoryUsage.value = [...memoryUsage.value.slice(1), Math.max(50, Math.min(80, memoryUsage.value[memoryUsage.value.length - 1] + (Math.random() * 5 - 2.5)))]
  
  // // 更新磁盘数据
  // diskUsage.value = [...diskUsage.value.slice(1), Math.max(40, Math.min(60, diskUsage.value[diskUsage.value.length - 1] + (Math.random() * 2 - 1)))]
  
  // // 更新网络数据
  // networkIn.value = [...networkIn.value.slice(1), Math.max(5, Math.min(25, networkIn.value[networkIn.value.length - 1] + (Math.random() * 6 - 3)))]
  // networkOut.value = [...networkOut.value.slice(1), Math.max(4, Math.min(20, networkOut.value[networkOut.value.length - 1] + (Math.random() * 5 - 2.5)))]
  
  // // 模拟新日志
  // if (Math.random() > 0.7) {
  //   const levels = ['info', 'warning', 'error']
  //   const services = ['API Gateway', 'Database', 'Analysis', 'Cache']
  //   systemLogs.value.push({
  //     time: Date.now(),
  //     service: services[Math.floor(Math.random() * services.length)],
  //     level: levels[Math.floor(Math.random() * levels.length)],
  //     message: 'Sample log message ' + Math.floor(Math.random() * 10000)
  //   })
    
  //   // 保持日志数量不超过100条
  //   if (systemLogs.value.length > 100) {
  //     systemLogs.value = systemLogs.value.slice(-100)
  //   }
  // }
}

// 生命周期
onMounted(() => {
  fetchServiceStatus()
  fetchServiveList()
  fetchResourceUsage()
  updateInterval = setInterval(fetchResourceUsage, 1000)
})

onBeforeUnmount(() => {
  clearInterval(updateInterval)
})
</script>

<style scoped lang="scss">
.service-status-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      font-size: 24px;
      color: #333;
      margin: 0;
    }
  }
  
  .overview-cards {
    margin-bottom: 20px;
    
    .el-row {
      margin-bottom: -20px;
      
      .el-col {
        margin-bottom: 20px;
      }
    }
  }
  
  .main-content {
    flex: 1;
    display: flex;
    gap: 20px;
    
    .left-content {
      flex: 2;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .right-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  }
  
  .health-status {
    :deep(.service-row) {
      &.warning-row {
        --el-table-tr-bg-color: var(--el-color-warning-light-9);
      }
      &.error-row {
        --el-table-tr-bg-color: var(--el-color-danger-light-9);
      }
    }
    
    .service-name {
      display: flex;
      align-items: center;
      
      .el-icon {
        margin-right: 8px;
      }
    }
  }
  
  .live-logs {
    flex: 1;
    
    .log-content {
      height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 14px;
      
      .log-item {
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &.error {
          color: #F56C6C;
        }
        
        &.warning {
          color: #E6A23C;
        }
        
        .log-time {
          color: #909399;
          margin-bottom: 4px;
        }
        
        .log-service {
          font-weight: 500;
        }
      }
      
      .empty-logs {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: #909399;
      }
    }
  }
  
  .resource-monitor {
    .resource-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      
      .resource-item {
        padding: 12px;
        border-radius: 8px;
        background-color: #f9f9f9;
        
        .resource-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-weight: 500;
          
          .el-icon {
            margin-right: 8px;
            font-size: 18px;
          }
        }
        
        .resource-chart {
          height: 60px;
          margin-bottom: 8px;
        }
        
        .resource-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #606266;
        }
      }
    }
  }
  
  .alerts-card {
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .alert-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background-color: #f9f9f9;
        
        .alert-content {
          flex: 1;
          
          .alert-title {
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .alert-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #909399;
          }
        }
      }
      
      .empty-alerts {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
        color: #909399;
      }
    }
  }
  
  .service-detail {
    .service-metrics {
      margin-top: 24px;
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #333;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        
    .metric-chart {
          h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #606266;
          }
        }
      }
    }
    
    .service-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
  }
}
</style>
