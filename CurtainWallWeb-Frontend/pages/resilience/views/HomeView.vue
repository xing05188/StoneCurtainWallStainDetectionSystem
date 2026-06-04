<template>
  <div class="dashboard-container">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="system-status">
        <div class="status-item">
          <el-icon><clock /></el-icon>
          <span>运行时间: {{ uptime }}</span>
        </div>
      </div>
    </div>

    <!-- 数据概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" :lg="6">
          <statistic-card 
            title="数据集数" 
            :value="overviewData.dataset_total" 
            icon="folder-opened"
            color="#409EFF"
            :action="() => navigateTo('datasets')"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6">
          <statistic-card 
            title="运行中任务" 
            :value="overviewData.job_running" 
            icon="loading"
            color="#E6A23C"
            :action="() => navigateTo('analysis/jobs')"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6">
          <statistic-card 
            title="报告数量" 
            :value="overviewData.report_total" 
            icon="document-checked"
            color="#67C23A"
            :action="() => navigateTo('reports')"
          />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6">
          <statistic-card 
            title="材料数据总记录数" 
            :value="overviewData.material_data_total" 
            icon="warning"
            color="#F56C6C"
            :action="() => navigateTo('projects?risk=high')"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区 -->
    <div class="main-content">
      <div class="left-content">
        <!-- 快速入口区域 -->
        <el-card shadow="hover" class="quick-access-card">
          <template #header>
            <div class="card-header">
              <span>快速入口</span>
            </div>
          </template>
          <div class="quick-access-grid">
            <div 
              v-for="(item, index) in quickAccessItems" 
              :key="index" 
              class="access-item"
              @click="$router.push(item.path)"
            >
              <div class="access-icon-wrapper" :style="{backgroundColor: item.color}">
                <el-icon class="access-icon"><component :is="item.icon" /></el-icon>
              </div>
              <div class="access-text">
                <div class="access-title">{{ item.title }}</div>
                <div class="access-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
      
      <!-- 右侧内容 -->
      <div class="right-content">
        <el-card shadow="hover" class="alert-wall-card">
          <template #header>
            <div class="card-header">
              <span>预警幕墙单元</span>
              <el-button type="text" style="margin-left: 200px;" @click="$router.push('/alerts')">查看全部</el-button>
            </div>
          </template>
          <div class="alert-list">
            <div v-for="alert in resilienceAlerts" :key="alert.id" class="alert-item">
              <div class="alert-header">
                <div class="alert-batch">
                  <el-tag :type="alert.level === 'CRITICAL' ? 'danger' : 'warning'" size="small">
                    {{ alert.level === 'CRITICAL' ? '警告' : '需干预' }}
                  </el-tag>
                  <span class="batch-number">{{ alert.batch }}</span>
                </div>
                <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
              </div>
              <div class="alert-details">
                <div class="analysis-info">
                  <span>分析任务: {{ alert.analysis_job || '--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  Monitor,
  Clock,
  Warning,
  FolderOpened,
  Loading,
  DocumentChecked,
  CircleCheck,
  CircleClose,
  InfoFilled,
  Bell,
  User
} from '@element-plus/icons-vue'
import StatisticCard from '../components/StatisticCard.vue'
import { apiUrl } from '../config'

const router = useRouter()

const quickAccessItems = [
  // 主页
  {
    title: '主页',
    desc: '返回系统首页',
    icon: 'HomeFilled',
    path: '/',
    color: '#409EFF'
  },
  
  // 数据集管理
  {
    title: '数据集管理',
    desc: '上传、查看和管理数据集',
    icon: 'Document',
    path: '/datasets',
    color: '#67C23A'
  },
  
  // 分析任务子菜单
  {
    title: '模型列表',
    desc: '查看和管理分析模型',
    icon: 'Cpu',
    path: '/analysis/models',
    color: '#E6A23C'
  },
  {
    title: '任务管理',
    desc: '创建和管理分析任务',
    icon: 'List',
    path: '/analysis/jobs',
    color: '#F56C6C'
  },
  
  // 可视化子菜单
  {
    title: '聚类分析',
    desc: '数据聚类可视化',
    icon: 'DataAnalysis',
    path: '/visualization/cluster',
    color: '#909399'
  },
  {
    title: '雷达图',
    desc: '多维数据雷达图',
    icon: 'PieChart',
    path: '/visualization/radar',
    color: '#409EFF'
  },
  {
    title: '热力图',
    desc: '数据分布热力图',
    icon: 'TrendCharts',
    path: '/visualization/heatmap',
    color: '#67C23A'
  },
  {
    title: '剖面分析',
    desc: '数据剖面可视化',
    icon: 'SetUp',
    path: '/visualization/slice',
    color: '#E6A23C'
  },
  
  // 报告管理子菜单
  {
    title: '报告生成',
    desc: '创建新的分析报告',
    icon: 'DocumentAdd',
    path: '/reports/generate',
    color: '#F56C6C'
  },
  {
    title: '历史报告',
    desc: '查看历史分析报告',
    icon: 'Notebook',
    path: '/reports/history',
    color: '#909399'
  },
  
  // 系统监控
  {
    title: '系统监控',
    desc: '查看系统运行状态',
    icon: 'Monitor',
    path: '/system/status',
    color: '#409EFF'
  },
  
  // 新增的预警幕墙单元入口
  {
    title: '预警幕墙',
    desc: '查看系统预警信息',
    icon: 'Warning',
    path: '/alerts',
    color: '#F56C6C'
  }
];

// 系统状态
const uptime = ref('')
let uptimeInterval = null

const calculateUptime = () => {
  const startDate = new Date('2025-03-20T00:00:00') // 系统上线时间
  const now = new Date()
  
  // 确保当前时间晚于起始时间
  if (now < startDate) {
    uptime.value = '系统未上线'
    return
  }

  const diffInMs = now - startDate
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInHours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  uptime.value = `${diffInDays}天${diffInHours}小时`
}



const alertsCount = ref(3)

// 数据概览
const overviewData = ref({
  dataset_total: 0,
  dataset_pending: 0,
  job_running: 0,
  report_total: 0,
  material_data_total: 0
})

// 预警幕墙
const resilienceAlerts = ref([])

const fetchResilienceAlerts = async () => {
  try {
    const res = await axios.get(`${apiUrl}/monitoring/alerts/`)
    resilienceAlerts.value = res.data.data.alerts.map(alert => ({
      id: alert.id,
      level: alert.level,
      batch: alert.batch || '未知批次',
      timestamp: alert.timestamp,
      damage_area: alert.damage_area || 0,
      analysis_job: alert.analysis_job
    }))
  } catch (error) {
    console.error('获取预警数据失败:', error)
  }
}



// 快速分析
const quickAnalysis = ref({
  dataset: '',
  model: '',
  method: 'entropy'
})
const analyzing = ref(false)
const datasets = ref([
  { id: 1, name: '幕墙应力数据_202308' },
  { id: 2, name: '风荷载测试数据_Q3' },
  { id: 3, name: '热力学性能数据集' }
])
const analysisModels = ref([
  { id: 1, name: '结构安全评估模型 v2.1' },
  { id: 2, name: '风荷载分析模型 v1.5' },
  { id: 3, name: '热力学性能模型 v3.0' }
])

// 告警通知
const recentAlerts = ref([
  { id: 1, title: '数据库备份失败', level: 'high', time: '2023-08-15T14:30:00' },
  { id: 2, title: 'GPU节点负载过高', level: 'medium', time: '2023-08-15T10:15:00' },
  { id: 3, title: '存储空间不足警告', level: 'low', time: '2023-08-14T16:45:00' }
])

// 最近活动
const recentActivities = ref([
  { id: 1, user: '张工程师', action: '上传了新的数据集', target: '幕墙应力数据_202308', time: '2023-08-15T15:30:00', type: 'user' },
  { id: 2, user: '系统', action: '完成了夜间数据备份', time: '2023-08-15T03:00:00', type: 'system' },
  { id: 3, user: '李分析师', action: '提交了分析报告', target: 'CBD项目中期报告', time: '2023-08-14T17:45:00', type: 'user' },
  { id: 4, user: '王研究员', action: '创建了新的分析任务', target: '热力学性能分析', time: '2023-08-14T09:20:00', type: 'user' }
])

// 方法
const navigateTo = (path) => {
  router.push(`/${path}`)
}

const startQuickAnalysis = () => {
  analyzing.value = true
  setTimeout(() => {
    analyzing.value = false
    ElMessage.success('分析任务已创建')
  }, 1500)
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getMonth()+1}月${date.getDate()}日`
}

const formatTime = (timeStr) => {
  const date = new Date(timeStr)
  return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
}

const getProjectStatus = (project) => {
  const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))
  
  if (project.progress === 100) return 'success'
  if (daysLeft < 3 && project.progress < 80) return 'exception'
  if (daysLeft < 7 && project.progress < 50) return 'warning'
  return ''
}

const getAlertColor = (level) => {
  return {
    high: '#F56C6C',
    medium: '#E6A23C',
    low: '#409EFF'
  }[level] || '#909399'
}

const getAlertIcon = (level) => {
  return {
    high: CircleClose,
    medium: Warning,
    low: InfoFilled
  }[level] || Bell
}

const getActivityType = (activity) => {
  return activity.type === 'system' ? 'primary' : ''
}

const fetchDashboardData = async () => {
  try {
    const res = await axios.get(`${apiUrl}/monitoring/dashboard/`)
    overviewData.value = res.data.data
    alertsCount.value = res.data.alerts_count || 0 // 如果接口返回告警数
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}


// 添加用户状态
// const isLoggedIn = ref(false) // 根据实际登录状态更新

// 添加方法
// const logout = () => {
//   // 调用退出登录API
//   isLoggedIn.value = false
//   router.push('/login')
// }

// 修改用户信息为响应式
// const userInfo = ref({
//   name: '',
//   avatar: ''
// })

// const userName = computed(() => userInfo.value.name || '未登录')
// const userAvatar = computed(() => userInfo.value.avatar || '')

// 在onMounted中添加检查登录状态的逻辑
onMounted(async () => {
  calculateUptime() // 立即计算一次
  uptimeInterval = setInterval(calculateUptime, 3600000) // 每小时更新一次
  try {
    fetchDashboardData()
    fetchResilienceAlerts()
  } catch (error) {
    console.error('主页初始化失败:', error)
  }
})

onBeforeUnmount(() => {
  if (uptimeInterval) clearInterval(uptimeInterval)
})
</script>

<style scoped lang="scss">
.dashboard-container {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 12px 16px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    
    .system-status {
      display: flex;
      gap: 24px;
      
      .status-item {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #606266;
        
        .el-icon {
          margin-right: 8px;
          font-size: 16px;
          color: #909399;
        }
        
        .warning-count {
          color: #F56C6C;
          font-weight: bold;
        }
      }
    }
  }
  
  .overview-cards {
    margin-bottom: 16px;
    
    .el-row {
      margin: 0 -8px;
      
      .el-col {
        padding: 0 8px;
        margin-bottom: 16px;
      }
    }
  }
  
  .main-content {
    flex: 1;
    display: flex;
    gap: 16px;
    
    .left-content {
      flex: 2;
      min-width: 0;
      
      .quick-access-card {
        height: 100%;
        
        .quick-access-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          padding: 8px;
        }
        
        .access-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s;
          background-color: #fff;
          
          &:hover {
            background-color: #f5f7fa;
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }
          
          .access-icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            
            .access-icon {
              font-size: 20px;
              color: white;
            }
          }
          
          .access-text {
            .access-title {
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 4px;
              color: #303133;
            }
            
            .access-desc {
              font-size: 12px;
              color: #909399;
            }
          }
        }
      }
    }
    
    .right-content {
      flex: 1;
      min-width: 0;
      
      .alert-wall-card {
        height: 100%;
        
        .alert-list {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 8px;
          
          .alert-item {
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
            
            &:last-child {
              border-bottom: none;
            }
            
            .alert-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              
              .alert-batch {
                display: flex;
                align-items: center;
                gap: 8px;
                
                .batch-number {
                  font-weight: 500;
                  color: #303133;
                }
              }
              
              .alert-time {
                color: #909399;
                font-size: 12px;
              }
            }
            
            .alert-details {
              .analysis-info {
                font-size: 13px;
                color: #606266;
              }
            }
          }
        }
      }
    }
  }
}

@media (max-width: 992px) {
  .main-content {
    flex-direction: column !important;
    
    .left-content, .right-content {
      flex: none !important;
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .quick-access-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
  }
  
  .status-bar .system-status {
    flex-wrap: wrap;
    gap: 12px !important;
    
    .status-item {
      flex: 1 0 calc(50% - 12px);
    }
  }
}
</style>