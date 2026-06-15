<template>
    <div class="log-management-container">
      <!-- 标题和操作区 -->
      <div class="log-header">
        <h2>系统操作日志</h2>
        <div class="action-buttons">
          <el-button @click="exportLogs" :loading="exporting">
            <el-icon><document /></el-icon>
            <span>导出日志</span>
          </el-button>
          <el-button type="danger" @click="clearLogs" :disabled="logs.length === 0">
            <el-icon><delete /></el-icon>
            <span>清空日志</span>
          </el-button>
        </div>
      </div>
  
      <!-- 筛选面板 -->
      <el-card shadow="hover" class="filter-panel">
        <el-form :inline="true" :model="filterForm">
          <el-form-item label="操作类型">
            <el-select
              v-model="filterForm.actionType"
              placeholder="全部类型"
              clearable
            >
              <el-option
                v-for="type in actionTypes"
                :key="type.value"
                :label="type.label"
                :value="type.value"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="操作人员">
            <el-select
              v-model="filterForm.operator"
              placeholder="全部人员"
              clearable
              filterable
            >
              <el-option
                v-for="user in operators"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="操作时间">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          
          <el-form-item label="关键字">
            <el-input
              v-model="filterForm.keyword"
              placeholder="操作内容/IP地址"
              clearable
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="handleFilter">查询</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
  
      <!-- 日志列表 -->
      <el-card shadow="hover" class="log-list-card">
        <el-table
          :data="filteredLogs"
          style="width: 100%"
          v-loading="loading"
          stripe
          border
          @sort-change="handleSortChange"
        >
          <el-table-column
            prop="createdAt"
            label="操作时间"
            width="180"
            sortable="custom"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          
          <el-table-column
            prop="operator"
            label="操作人员"
            width="150"
          >
            <template #default="{ row }">
              <div class="operator-cell">
                <el-avatar :size="24" :src="row.operatorAvatar" />
                <span class="operator-name">{{ row.operatorName }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column
            prop="actionType"
            label="操作类型"
            width="120"
          >
            <template #default="{ row }">
              <el-tag :type="getActionTagType(row.actionType)">
                {{ getActionTypeText(row.actionType) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column
            prop="module"
            label="操作模块"
            width="150"
          >
            <template #default="{ row }">
              {{ getModuleText(row.module) }}
            </template>
          </el-table-column>
          
          <el-table-column
            prop="content"
            label="操作内容"
            min-width="200"
          />
          
          <el-table-column
            prop="ip"
            label="IP地址"
            width="150"
          />
          
          <el-table-column
            prop="status"
            label="状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'success' ? 'success' : 'danger'"
                effect="plain"
              >
                {{ row.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column
            label="操作"
            width="120"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                @click="showDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalLogs"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
  
      <!-- 日志详情对话框 -->
      <el-dialog
        v-model="detailDialogVisible"
        :title="`操作日志详情 - ${currentLog?.id || ''}`"
        width="60%"
      >
        <div v-if="currentLog" class="log-detail">
          <el-descriptions
            :column="1"
            border
            size="large"
          >
            <el-descriptions-item label="操作时间">
              {{ formatDateTime(currentLog.createdAt) }}
            </el-descriptions-item>
            
            <el-descriptions-item label="操作人员">
              <div class="operator-info">
                <el-avatar :size="36" :src="currentLog.operatorAvatar" />
                <div class="operator-meta">
                  <div class="operator-name">{{ currentLog.operatorName }}</div>
                  <div class="operator-dept">{{ currentLog.operatorDept }}</div>
                </div>
              </div>
            </el-descriptions-item>
            
            <el-descriptions-item label="操作类型">
              <el-tag :type="getActionTagType(currentLog.actionType)" size="large">
                {{ getActionTypeText(currentLog.actionType) }}
              </el-tag>
            </el-descriptions-item>
            
            <el-descriptions-item label="操作模块">
              {{ getModuleText(currentLog.module) }}
            </el-descriptions-item>
            
            <el-descriptions-item label="操作内容">
              {{ currentLog.content }}
            </el-descriptions-item>
            
            <el-descriptions-item label="请求方法">
              <el-tag :type="getMethodTagType(currentLog.method)">
                {{ currentLog.method }}
              </el-tag>
            </el-descriptions-item>
            
            <el-descriptions-item label="请求参数">
              <pre class="request-params">{{ formatJson(currentLog.params) }}</pre>
            </el-descriptions-item>
            
            <el-descriptions-item label="IP地址">
              {{ currentLog.ip }}
              <el-tag v-if="currentLog.location" size="small" style="margin-left: 8px;">
                {{ currentLog.location }}
              </el-tag>
            </el-descriptions-item>
            
            <el-descriptions-item label="操作状态">
              <el-tag
                :type="currentLog.status === 'success' ? 'success' : 'danger'"
                size="large"
              >
                {{ currentLog.status === 'success' ? '成功' : '失败' }}
              </el-tag>
              <span v-if="currentLog.errorMsg" style="margin-left: 8px; color: #f56c6c;">
                {{ currentLog.errorMsg }}
              </span>
            </el-descriptions-item>
            
            <el-descriptions-item label="耗时">
              {{ currentLog.duration }} ms
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { formatDateTime } from '../utils/format'
  
  // 日志数据
  const logs = ref([])
  const loading = ref(false)
  const exporting = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalLogs = ref(0)
  const currentLog = ref(null)
  const detailDialogVisible = ref(false)
  
  // 筛选表单
  const filterForm = ref({
    actionType: '',
    operator: '',
    dateRange: [],
    keyword: '',
    sortField: '',
    sortOrder: ''
  })
  
  // 操作类型选项
  const actionTypes = ref([
    { value: 'create', label: '新增' },
    { value: 'update', label: '修改' },
    { value: 'delete', label: '删除' },
    { value: 'login', label: '登录' },
    { value: 'logout', label: '登出' },
    { value: 'export', label: '导出' },
    { value: 'import', label: '导入' },
    { value: 'other', label: '其他' }
  ])
  
  // 操作模块选项
  const modules = ref([
    { value: 'system', label: '系统管理' },
    { value: 'user', label: '用户管理' },
    { value: 'role', label: '角色管理' },
    { value: 'dataset', label: '数据集' },
    { value: 'analysis', label: '分析任务' },
    { value: 'report', label: '报告管理' },
    { value: 'log', label: '日志管理' }
  ])
  
  // 操作人员选项
  const operators = ref([
    { id: '1', name: '管理员' },
    { id: '2', name: '张三' },
    { id: '3', name: '李四' },
    { id: '4', name: '王五' }
  ])
  
  // 计算属性 - 筛选后的日志
  const filteredLogs = computed(() => {
    let result = [...logs.value]
    
    // 操作类型筛选
    if (filterForm.value.actionType) {
      result = result.filter(log => log.actionType === filterForm.value.actionType)
    }
    
    // 操作人员筛选
    if (filterForm.value.operator) {
      result = result.filter(log => log.operatorId === filterForm.value.operator)
    }
    
    // 日期范围筛选
    if (filterForm.value.dateRange && filterForm.value.dateRange.length === 2) {
      const [start, end] = filterForm.value.dateRange
      result = result.filter(log => {
        const logDate = log.createdAt.split('T')[0]
        return logDate >= start && logDate <= end
      })
    }
    
    // 关键字筛选
    if (filterForm.value.keyword) {
      const keyword = filterForm.value.keyword.toLowerCase()
      result = result.filter(log => 
        log.content.toLowerCase().includes(keyword) ||
        log.ip.includes(keyword)
    )
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
  const fetchLogs = async () => {
    loading.value = true
    try {
      // 模拟API调用
      const res = await getLogs({
        page: currentPage.value,
        pageSize: pageSize.value,
        ...filterForm.value
      })
      logs.value = res.data
      totalLogs.value = res.total
    } catch (error) {
      ElMessage.error('获取日志列表失败')
    } finally {
      loading.value = false
    }
  }
  
  const handleFilter = () => {
    currentPage.value = 1
    fetchLogs()
  }
  
  const resetFilter = () => {
    filterForm.value = {
      actionType: '',
      operator: '',
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
    fetchLogs()
  }
  
  const showDetail = (log) => {
    currentLog.value = log
    detailDialogVisible.value = true
  }
  
  const exportLogs = async () => {
    exporting.value = true
    try {
      // 模拟API调用
      await exportLogsToFile(filterForm.value)
      ElMessage.success('日志导出成功')
    } catch (error) {
      ElMessage.error('日志导出失败')
    } finally {
      exporting.value = false
    }
  }
  
  const clearLogs = () => {
    ElMessageBox.confirm(
      '确定要清空所有操作日志吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(async () => {
      try {
        await clearAllLogs()
        ElMessage.success('日志已清空')
        fetchLogs()
      } catch (error) {
        ElMessage.error('清空日志失败')
      }
    }).catch(() => {})
  }
  
  const handleSizeChange = (val) => {
    pageSize.value = val
    fetchLogs()
  }
  
  const handlePageChange = (val) => {
    currentPage.value = val
    fetchLogs()
  }
  
  const getActionTagType = (type) => {
    const map = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'warning',
      logout: 'info',
      export: '',
      import: '',
      other: 'info'
    }
    return map[type] || ''
  }
  
  const getActionTypeText = (type) => {
    const found = actionTypes.value.find(item => item.value === type)
    return found ? found.label : type
  }
  
  const getModuleText = (module) => {
    const found = modules.value.find(item => item.value === module)
    return found ? found.label : module
  }
  
  const getMethodTagType = (method) => {
    const map = {
      GET: '',
      POST: 'success',
      PUT: 'warning',
      DELETE: 'danger',
      PATCH: 'primary'
    }
    return map[method] || 'info'
  }
  
  const formatJson = (json) => {
    if (!json) return '无'
    try {
      return JSON.stringify(JSON.parse(json), null, 2)
    } catch {
      return json
    }
  }
  
  // 模拟API函数
  const getLogs = (params) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = Array.from({ length: 150 }, (_, i) => {
          const actionTypes = ['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'other']
          const modules = ['system', 'user', 'role', 'dataset', 'analysis', 'report', 'log']
          const statuses = ['success', 'failed']
          const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
          const operators = [
            { id: '1', name: '管理员', avatar: '', dept: '系统管理部' },
            { id: '2', name: '张三', avatar: '', dept: '数据分析部' },
            { id: '3', name: '李四', avatar: '', dept: '工程部' },
            { id: '4', name: '王五', avatar: '', dept: '质量部' }
          ]
          
          const operator = operators[Math.floor(Math.random() * operators.length)]
          const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)]
          const module = modules[Math.floor(Math.random() * modules.length)]
          const status = statuses[Math.floor(Math.random() * 10) > 1 ? 0 : 1] // 10%概率失败
          const method = actionType === 'login' ? 'POST' : methods[Math.floor(Math.random() * methods.length)]
          
          return {
            id: `log_${i + 1}`,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
            operatorId: operator.id,
            operatorName: operator.name,
            operatorAvatar: operator.avatar,
            operatorDept: operator.dept,
            actionType: actionType,
            module: module,
            content: getMockLogContent(actionType, module),
            method: method,
            params: JSON.stringify({
              id: Math.floor(Math.random() * 1000),
              name: `测试数据_${Math.floor(Math.random() * 100)}`
            }),
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            location: ['北京', '上海', '广州', '深圳', '杭州', '成都'][Math.floor(Math.random() * 6)],
            status: status,
            errorMsg: status === 'failed' ? '操作失败: 未知错误' : '',
            duration: Math.floor(Math.random() * 500) + 50
          }
        })
        
        // 应用筛选条件
        let filteredData = [...mockData]
        
        if (params.actionType) {
          filteredData = filteredData.filter(log => log.actionType === params.actionType)
        }
        
        if (params.operator) {
          filteredData = filteredData.filter(log => log.operatorId === params.operator)
        }
        
        if (params.dateRange && params.dateRange.length === 2) {
          const [start, end] = params.dateRange
          filteredData = filteredData.filter(log => {
            const logDate = log.createdAt.split('T')[0]
            return logDate >= start && logDate <= end
          })
        }
        
        if (params.keyword) {
          const keyword = params.keyword.toLowerCase()
          filteredData = filteredData.filter(log => 
            log.content.toLowerCase().includes(keyword) ||
            log.ip.includes(keyword))
        }
        
        // 排序
        if (params.sortField) {
          filteredData.sort((a, b) => {
            const field = params.sortField
            const order = params.sortOrder === 'ascending' ? 1 : -1
            
            if (a[field] > b[field]) return order
            if (a[field] < b[field]) return -order
            return 0
          })
        }
        
        // 分页
        const page = params.page || 1
        const pageSize = params.pageSize || 20
        const paginatedData = filteredData.slice(
          (page - 1) * pageSize,
          page * pageSize
        )
        
        resolve({
          data: paginatedData,
          total: filteredData.length
        })
      }, 500)
    })
  }
  
  const getMockLogContent = (actionType, module) => {
    const moduleText = modules.value.find(m => m.value === module)?.label || module
    const actionText = actionTypes.value.find(a => a.value === actionType)?.label || actionType
    
    const contents = {
      create: `新增${moduleText}数据`,
      update: `修改${moduleText}数据`,
      delete: `删除${moduleText}数据`,
      login: `用户登录系统`,
      logout: `用户退出系统`,
      export: `导出${moduleText}数据`,
      import: `导入${moduleText}数据`,
      other: `执行${moduleText}操作`
    }
    
    return contents[actionType] || `执行${moduleText}${actionText}操作`
  }
  
  const exportLogsToFile = (params) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true })
      }, 1500)
    })
  }
  
  const clearAllLogs = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true })
      }, 800)
    })
  }
  
  // 生命周期
  onMounted(() => {
    fetchLogs()
  })
  </script>
  
  <style scoped lang="scss">
  .log-management-container {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .log-header {
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
    
    .filter-panel {
      margin-bottom: 20px;
      
      .el-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        
        .el-form-item {
          margin-bottom: 0;
        }
      }
    }
    
    .log-list-card {
      flex: 1;
      
      :deep(.el-card__body) {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .el-table {
        flex: 1;
        
        .operator-cell {
          display: flex;
          align-items: center;
          
          .el-avatar {
            margin-right: 8px;
          }
          
          .operator-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }
      
      .pagination-container {
        padding: 16px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #eee;
      }
    }
    
    .log-detail {
      .operator-info {
        display: flex;
        align-items: center;
        
        .el-avatar {
          margin-right: 12px;
        }
        
        .operator-meta {
          .operator-name {
            font-weight: 500;
          }
          
          .operator-dept {
            font-size: 12px;
            color: #999;
          }
        }
      }
      
      .request-params {
        margin: 0;
        padding: 8px;
        background-color: #f5f7fa;
        border-radius: 4px;
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  }
  </style>