<template>
  <div class="page-card corrosion-page" style="background: var(--card);">
    <div class="history-header">
      <div>
        <h1 class="card-title">历史记录</h1>
        <p class="card-sub">查看所有检测历史和批次详情。</p>
      </div>
      <div class="link-row">
        <NuxtLink class="text-link" :to="{ path: '/corrosion', query: { view: 'detect' } }">返回检测</NuxtLink>
        <NuxtLink class="text-link" to="/corrosion/logs">日志中心</NuxtLink>
      </div>
    </div>

    <!-- 筛选器 -->
    <section class="filter-section">
      <div class="filter-group">
        <label>类型筛选：</label>
        <select v-model="currentType" @change="handleTypeChange" class="filter-select">
          <option value="all">全部</option>
          <option value="single">单次检测</option>
          <option value="batch">批量数据集</option>
        </select>
      </div>
      <button @click="handleRefresh" :disabled="historyLoading" class="btn-refresh">
        {{ historyLoading ? '加载中...' : '刷新' }}
      </button>
    </section>

    <!-- 历史记录列表 -->
    <section class="section-block">
      <div v-if="historyLoading" class="placeholder-box">加载中...</div>
      <div v-else-if="historyList.length === 0" class="placeholder-box">暂无历史记录</div>
      <div v-else class="history-list">
        <!-- 批次记录 -->
        <div 
          v-for="item in historyList" 
          :key="item.type === 'batch' ? item.batch_no : item.job_id"
          class="history-item"
          :class="{ 'is-batch': item.type === 'batch' }"
          @click="handleItemClick(item)"
        >
          <div class="item-icon">
            <span v-if="item.type === 'batch'">📦</span>
            <span v-else>📄</span>
          </div>
          <div class="item-content">
            <div class="item-header">
              <h3 class="item-title">
                <template v-if="item.type === 'batch'">
                  {{ item.name || item.batch_no }}
                </template>
                <template v-else>
                  单次检测 - {{ item.job_id.slice(0, 12) }}...
                </template>
              </h3>
              <span class="item-status" :class="`status-${item.status}`">
                {{ getStatusText(item.status) }}
              </span>
            </div>
            <div class="item-meta">
              <span v-if="item.type === 'batch'">
                进度: {{ item.processed_count }} / {{ item.total_count }}
              </span>
              <span v-else>
                模型: {{ item.model }}
              </span>
              <span class="item-date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="historyTotal > 0" class="pagination">
        <button 
          @click="handlePageChange(historyPage - 1)" 
          :disabled="historyPage <= 1 || historyLoading"
          class="btn-page"
        >
          上一页
        </button>
        <span class="page-info">
          第 {{ historyPage }} 页 / 共 {{ Math.ceil(historyTotal / pageLimit) }} 页 (总计 {{ historyTotal }} 条)
        </span>
        <button 
          @click="handlePageChange(historyPage + 1)" 
          :disabled="historyPage >= Math.ceil(historyTotal / pageLimit) || historyLoading"
          class="btn-page"
        >
          下一页
        </button>
      </div>
    </section>

    <!-- 批次详情弹窗 -->
    <div v-if="showBatchDetails" class="modal-overlay" @click="closeBatchDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>批次详情</h2>
          <button @click="closeBatchDetails" class="btn-close">✕</button>
        </div>
        <div v-if="batchDetailsLoading" class="modal-body">加载中...</div>
        <div v-else-if="batchDetails" class="modal-body">
          <div class="batch-info">
            <p><strong>批次编号:</strong> {{ batchDetails.batch_info.batch_no }}</p>
            <p><strong>批次名称:</strong> {{ batchDetails.batch_info.name }}</p>
            <p><strong>进度:</strong> {{ batchDetails.batch_info.progress }}</p>
            <p><strong>状态:</strong> 
              <span class="item-status" :class="`status-${batchDetails.batch_info.status}`">
                {{ getStatusText(batchDetails.batch_info.status) }}
              </span>
            </p>
          </div>
          
          <h3 class="tasks-title">任务列表</h3>
          <div class="batch-tasks">
            <div 
              v-for="task in batchDetails.tasks" 
              :key="task.job_id"
              class="task-item"
              :class="`task-${task.status}`"
            >
              <div class="task-header">
                <span class="task-filename">{{ getFilename(task.input_image) }}</span>
                <span class="task-status" :class="`status-${task.status}`">
                  {{ getStatusText(task.status) }}
                </span>
              </div>
              <div v-if="task.status === 'error' && task.error_msg" class="task-error">
                {{ task.error_msg }}
              </div>
              <div v-if="task.status === 'done' && task.output_image" class="task-content-row">
                <div class="task-images">
                  <div class="task-image-wrapper">
                    <img :src="getImageUrl(task.input_image)" alt="输入图片" class="task-img" />
                    <span class="image-label">原图</span>
                  </div>
                  <span class="arrow">→</span>
                  <div class="task-image-wrapper">
                    <img :src="getImageUrl(task.output_image)" alt="输出图片" class="task-img" />
                    <span class="image-label">检测结果</span>
                  </div>
                </div>
                <div v-if="task.metrics" class="task-params">
                  <h4 class="params-title">检测结果</h4>
                  <div class="params-list">
                    <div class="param-item">
                      <span class="param-label">检测数量</span>
                      <span class="param-value">{{ task.metrics.count ?? 0 }}</span>
                    </div>
                    <div v-if="task.metrics.avg_conf" class="param-item">
                      <span class="param-label">平均置信度</span>
                      <span class="param-value">{{ (task.metrics.avg_conf * 100).toFixed(1) }}%</span>
                    </div>
                    <div v-if="task.metrics.area_ratio" class="param-item">
                      <span class="param-label">面积比例</span>
                      <span class="param-value">{{ (task.metrics.area_ratio * 100).toFixed(2) }}%</span>
                    </div>
                  </div>
                  <div v-if="task.metrics.classification" class="params-list" style="margin-top: 12px; padding-top: 12px; border-top: 2px dashed var(--border, #e0e0e0);">
                    <div class="param-item classification-item">
                      <span class="param-label">分类结果</span>
                      <span class="param-value classification-label">{{ formatClassificationLabel(task.metrics.classification.label) }}</span>
                    </div>
                    <div class="param-item">
                      <span class="param-label">分类置信度</span>
                      <span class="param-value">{{ (task.metrics.classification.confidence * 100).toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 单次检测详情弹窗 -->
    <div v-if="showSingleDetails" class="modal-overlay" @click="closeSingleDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>检测详情</h2>
          <button @click="closeSingleDetails" class="btn-close">✕</button>
        </div>
        <div v-if="singleDetailsLoading" class="modal-body">加载中...</div>
        <div v-else-if="singleDetails" class="modal-body">
          <div class="single-info">
            <p><strong>任务ID:</strong> {{ singleDetails.job_id }}</p>
            <p><strong>模型:</strong> {{ singleDetails.model || 'N/A' }}</p>
            <p><strong>状态:</strong> 
              <span class="item-status" :class="`status-${singleDetails.status}`">
                {{ getStatusText(singleDetails.status) }}
              </span>
            </p>
            <p><strong>检测时间:</strong> {{ formatDate(singleDetails.created_at) }}</p>
          </div>
          
          <div v-if="singleDetails.status === 'done' || singleDetails.status === 'completed'" class="single-content">
            <!-- 显示图片（如果有） -->
            <div v-if="singleDetails.input_image || singleDetails.output_image" class="task-content-row">
              <div class="task-images" v-if="singleDetails.input_image || singleDetails.output_image">
                <div v-if="singleDetails.input_image" class="task-image-wrapper">
                  <img :src="getImageUrl(singleDetails.input_image)" alt="输入图片" class="task-img" @error="handleImageError" />
                  <span class="image-label">原图</span>
                </div>
                <span v-if="singleDetails.input_image && singleDetails.output_image" class="arrow">→</span>
                <div v-if="singleDetails.output_image" class="task-image-wrapper">
                  <img :src="getImageUrl(singleDetails.output_image)" alt="输出图片" class="task-img" @error="handleImageError" />
                  <span class="image-label">检测结果</span>
                </div>
              </div>
              <div v-if="singleDetails.metrics" class="task-params">
                <h4 class="params-title">检测结果</h4>
                <div class="params-list">
                  <div class="param-item">
                    <span class="param-label">检测数量</span>
                    <span class="param-value">{{ singleDetails.metrics.count ?? 0 }}</span>
                  </div>
                  <div v-if="singleDetails.metrics.avg_conf !== undefined && singleDetails.metrics.avg_conf !== null" class="param-item">
                    <span class="param-label">平均置信度</span>
                    <span class="param-value">{{ (singleDetails.metrics.avg_conf * 100).toFixed(1) }}%</span>
                  </div>
                  <div v-if="singleDetails.metrics.area_ratio !== undefined && singleDetails.metrics.area_ratio !== null" class="param-item">
                    <span class="param-label">面积比例</span>
                    <span class="param-value">{{ (singleDetails.metrics.area_ratio * 100).toFixed(2) }}%</span>
                  </div>
                </div>
                <div v-if="singleDetails.metrics.classification" class="params-list" style="margin-top: 12px; padding-top: 12px; border-top: 2px dashed var(--border, #e0e0e0);">
                  <div class="param-item classification-item">
                    <span class="param-label">分类结果</span>
                    <span class="param-value classification-label">{{ formatClassificationLabel(singleDetails.metrics.classification.label) }}</span>
                  </div>
                  <div class="param-item">
                    <span class="param-label">分类置信度</span>
                    <span class="param-value">{{ (singleDetails.metrics.classification.confidence * 100).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 只有指标没有图片时的显示 -->
            <div v-else-if="singleDetails.metrics" class="metrics-only">
              <h4 class="params-title">📊 检测结果</h4>
              <div class="params-list">
                <div class="param-item">
                  <span class="param-label">检测数量</span>
                  <span class="param-value">{{ singleDetails.metrics.count ?? 0 }}</span>
                </div>
                <div v-if="singleDetails.metrics.avg_conf !== undefined && singleDetails.metrics.avg_conf !== null" class="param-item">
                  <span class="param-label">平均置信度</span>
                  <span class="param-value">{{ (singleDetails.metrics.avg_conf * 100).toFixed(1) }}%</span>
                </div>
                <div v-if="singleDetails.metrics.area_ratio !== undefined && singleDetails.metrics.area_ratio !== null" class="param-item">
                  <span class="param-label">面积比例</span>
                  <span class="param-value">{{ (singleDetails.metrics.area_ratio * 100).toFixed(2) }}%</span>
                </div>
              </div>
              <div v-if="singleDetails.metrics.classification" class="params-list" style="margin-top: 12px; padding-top: 12px; border-top: 2px dashed var(--border, #e0e0e0);">
                <div class="param-item classification-item">
                  <span class="param-label">分类结果</span>
                  <span class="param-value classification-label">{{ formatClassificationLabel(singleDetails.metrics.classification.label) }}</span>
                </div>
                <div class="param-item">
                  <span class="param-label">分类置信度</span>
                  <span class="param-value">{{ (singleDetails.metrics.classification.confidence * 100).toFixed(1) }}%</span>
                </div>
              </div>
              <div v-if="singleDetails.error_msg" class="info-message" style="margin-top: 16px;">
                <p style="white-space: pre-line;">{{ singleDetails.error_msg }}</p>
              </div>
            </div>
            
            <!-- 既没有图片也没有指标 -->
            <div v-else class="info-message">
              <p>暂无检测数据</p>
              <p v-if="singleDetails.error_msg" style="margin-top: 8px; white-space: pre-line;">{{ singleDetails.error_msg }}</p>
            </div>
          </div>
          
          <div v-else-if="singleDetails.status === 'error'" class="error-message">
            <p>{{ singleDetails.error_msg || '检测失败' }}</p>
          </div>
          
          <div v-else class="info-message">
            <p>任务尚未完成或数据不可用</p>
          </div>
        </div>
        <div v-else class="modal-body">
          <div class="error-message">
            <p>无法加载详情信息</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCorrosion } from '~/composables/useCorrosion'

const { 
  historyList, 
  historyPage, 
  historyTotal, 
  historyLoading,
  historyType,
  batchDetails,
  batchDetailsLoading,
  fetchHistory,
  fetchBatchDetails
} = useCorrosion()

const pageLimit = ref(10)
const currentType = ref<'single' | 'batch' | 'all'>('all')
const showBatchDetails = ref(false)
const showSingleDetails = ref(false)
const singleDetails = ref<any>(null)
const singleDetailsLoading = ref(false)

const getCorrosionApiBase = () => {
  const config = useRuntimeConfig()
  return (config.public.corrosionApiBase as string) || 'http://8.153.161.229:18000'
}

onMounted(() => {
  currentType.value = historyType.value
  handleRefresh()
})

const handleTypeChange = () => {
  handlePageChange(1)
}

const handleRefresh = () => {
  fetchHistory(historyPage.value, pageLimit.value, currentType.value)
}

const handlePageChange = (page: number) => {
  fetchHistory(page, pageLimit.value, currentType.value)
}

const handleItemClick = async (item: any) => {
  console.log('[历史记录] 点击项目:', item)
  
  if (item.type === 'batch') {
    await fetchBatchDetails(item.batch_no)
    showBatchDetails.value = true
  } else {
    // 单次检测 - 检查是否有完整的图片数据
    console.log('[单次检测] 数据检查:', {
      hasResultPreview: !!item.result_preview,
      hasInputImage: !!item.input_image,
      hasOutputImage: !!item.output_image,
      item
    })
    
    // 只有当同时有输入输出图片时才直接显示，否则请求 API
    if (item.input_image && item.output_image) {
      // 直接使用历史记录中的数据
      singleDetails.value = {
        job_id: item.job_id,
        model: item.model,
        status: item.status,
        created_at: item.created_at,
        input_image: item.input_image,
        output_image: item.output_image,
        metrics: item.result_preview || item.metrics,
        error_msg: item.error_msg
      }
      console.log('[单次检测] 使用缓存数据（包含图片）:', singleDetails.value)
      showSingleDetails.value = true
    } else {
      // 数据不完整（没有图片路径），需要请求完整详情
      console.log('[单次检测] 图片数据不完整，请求 API 获取完整信息')
      await fetchSingleDetails(item.job_id)
    }
  }
}

const fetchSingleDetails = async (jobId: string) => {
  singleDetailsLoading.value = true
  showSingleDetails.value = true
  try {
    console.log('[单次检测] 请求任务详情 API:', jobId)
    const res = await $fetch<any>(`${getCorrosionApiBase()}/jobs/${jobId}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    
    console.log('[单次检测] API 响应:', res)
    
    if (res?.status === 'done' && res?.result) {
      // 处理成功的检测结果
      const result = res.result
      
      // 构建输入图片 URL（从历史记录或 gallery 中获取）
      const historyItem = historyList.value.find((x: any) => x.type === 'single' && x.job_id === jobId)
      let inputImageUrl = (historyItem as any)?.input_image
      
      // 如果没有输入图片，尝试从 gallery 查找
      if (!inputImageUrl) {
        const { gallery } = useCorrosion()
        const galleryItem = gallery.value.find((x: any) => x.id === jobId)
        inputImageUrl = galleryItem?.input
      }
      
      // 构建输出图片 URL（Base64）
      const outputImageUrl = result.image_base64 
        ? `data:image/png;base64,${result.image_base64}` 
        : undefined
      
      singleDetails.value = {
        job_id: res.job_id,
        model: result.params?.model || (historyItem?.type === 'single' ? historyItem.model : undefined) || 'N/A',
        status: 'done',
        created_at: historyItem?.created_at || new Date().toISOString(),
        input_image: inputImageUrl,
        output_image: outputImageUrl,
        metrics: result.metrics,
        error_msg: undefined
      }
      console.log('[单次检测] ✅ 成功获取任务结果')
    } else if (res?.status === 'error') {
      // 处理失败的任务
      const historyItem = historyList.value.find((x: any) => x.type === 'single' && x.job_id === jobId)
      singleDetails.value = {
        job_id: res.job_id,
        model: (historyItem?.type === 'single' ? historyItem.model : undefined) || 'N/A',
        status: 'error',
        created_at: historyItem?.created_at || new Date().toISOString(),
        input_image: undefined,
        output_image: undefined,
        metrics: undefined,
        error_msg: res.message || '检测失败'
      }
      console.log('[单次检测] ⚠️ 任务执行失败:', res.message)
    } else if (res?.status === 'running' || res?.status === 'queued') {
      // 任务还在处理中
      const historyItem = historyList.value.find((x: any) => x.type === 'single' && x.job_id === jobId)
      singleDetails.value = {
        job_id: res.job_id,
        model: (historyItem?.type === 'single' ? historyItem.model : undefined) || 'N/A',
        status: res.status,
        created_at: historyItem?.created_at || new Date().toISOString(),
        input_image: undefined,
        output_image: undefined,
        metrics: undefined,
        error_msg: '任务正在处理中，请稍后再试'
      }
      console.log('[单次检测] ⏳ 任务处理中')
    } else {
      console.error('[单次检测] 获取详情失败: 响应格式异常', res)
      useFallbackData(jobId)
    }
  } catch (error: any) {
    console.error('[单次检测] API 异常:', error)
    // 使用回退数据
    useFallbackData(jobId)
  } finally {
    singleDetailsLoading.value = false
  }
}

// 回退方案：从历史记录或 gallery 中查找数据
const useFallbackData = (jobId: string) => {
  // 先从历史记录中查找
  const historyItem = historyList.value.find((x: any) => x.type === 'single' && x.job_id === jobId)
  console.log('[单次检测] 从历史记录查找数据:', historyItem)
  
  // 从 gallery 中查找（gallery 包含完整的输入输出图片）
  const { gallery } = useCorrosion()
  console.log('[单次检测] Gallery 数据:', gallery.value)
  
  // 尝试多种方式匹配 gallery 数据
  // 1. 直接匹配 ID
  let galleryItem = gallery.value.find((x: any) => x.id === jobId)
  
  // 2. 如果历史记录有文件名，尝试通过文件名匹配
  if (!galleryItem && historyItem) {
    const filename = (historyItem as any).filename || (historyItem as any).input_image?.split('/').pop()
    if (filename) {
      galleryItem = gallery.value.find((x: any) => 
        x.filename === filename || 
        x.input?.includes(filename) ||
        x.output?.includes(filename)
      )
      console.log('[单次检测] 尝试通过文件名匹配:', filename, '结果:', !!galleryItem)
    }
  }
  
  // 3. 如果还没找到，尝试通过模型和时间戳范围匹配最近的一条
  if (!galleryItem && historyItem && historyItem.type === 'single' && gallery.value.length > 0) {
    const historyTime = new Date(historyItem.created_at).getTime()
    const recentItems = gallery.value.filter((x: any) => {
      const itemTime = new Date(x.timestamp || 0).getTime()
      return x.params?.model === historyItem.model && 
             Math.abs(itemTime - historyTime) < 5 * 60 * 1000 // 5分钟内
    })
    if (recentItems.length > 0) {
      galleryItem = recentItems[0]
      console.log('[单次检测] 通过模型和时间匹配到 gallery 数据')
    }
  }
  
  console.log('[单次检测] 从 gallery 查找数据 (jobId=' + jobId + '):', galleryItem)
  
  if (galleryItem) {
    // Gallery 有完整数据（包含 blob URL 或 base64）
    singleDetails.value = {
      job_id: jobId,
      model: galleryItem.params?.model || (historyItem?.type === 'single' ? historyItem.model : undefined) || 'N/A',
      status: 'done',
      created_at: historyItem?.created_at || new Date().toISOString(),
      input_image: galleryItem.input,  // 可能是 blob:// 或 data://
      output_image: galleryItem.output, // 可能是 blob:// 或 data://
      metrics: galleryItem.metrics,
      error_msg: undefined
    }
    console.log('[单次检测] ✅ 使用 gallery 数据，图片类型:', {
      inputType: galleryItem.input?.substring(0, 20),
      outputType: galleryItem.output?.substring(0, 20)
    })
  } else if (historyItem && historyItem.type === 'single') {
    // 使用历史记录数据（可能不完整）
    singleDetails.value = {
      job_id: historyItem.job_id,
      model: historyItem.model,
      status: historyItem.status,
      created_at: historyItem.created_at,
      input_image: (historyItem as any).input_image,
      output_image: (historyItem as any).output_image,
      metrics: historyItem.result_preview || (historyItem as any).metrics,
      error_msg: historyItem.result_preview ? undefined : '⚠️ /jobs/{jobId} API 调用失败，仅显示检测指标。请检查后端服务是否正常运行。'
    }
    console.log('[单次检测] ⚠️ 使用历史记录数据（图片不可用）')
  } else {
    singleDetails.value = {
      job_id: jobId,
      model: 'N/A',
      status: 'error',
      created_at: new Date().toISOString(),
      input_image: undefined,
      output_image: undefined,
      metrics: undefined,
      error_msg: '❌ 无法加载检测详情：\n\n1. 后端 /jobs/{jobId} API 调用失败\n2. 本地无缓存数据\n\n请检查后端服务是否正常运行。'
    }
    console.log('[单次检测] ❌ 无可用数据')
  }
}

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      return { Authorization: `Bearer ${storedToken}` }
    }

    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    
    const token = cookies['auth_token']
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }
  
  try {
    const tokenCookie = useCookie('auth_token')
    if (tokenCookie.value) {
      return { Authorization: `Bearer ${tokenCookie.value}` }
    }
  } catch (e) {
    console.warn('Error reading cookie in SSR:', e)
  }
  return {}
}

const closeBatchDetails = () => {
  showBatchDetails.value = false
}

const closeSingleDetails = () => {
  showSingleDetails.value = false
  singleDetails.value = null
}

const handleImageError = (event: Event) => {
  console.error('图片加载失败:', (event.target as HTMLImageElement).src)
  ;(event.target as HTMLImageElement).style.border = '2px solid red'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    processing: '处理中',
    done: '完成',
    error: '错误',
    partial_error: '部分失败'
  }
  return statusMap[status] || status
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

const formatClassificationLabel = (label: string) => {
  const labelMap: Record<string, string> = {
    'light': '轻度锈蚀',
    'moderate': '中度锈蚀',
    'severe': '重度锈蚀',
    'none': '无锈蚀'
  }
  return labelMap[label] || label
}

const getFilename = (path: string) => {
  if (!path) return ''
  return path.split(/[/\\]/).pop() || path
}

const getImageUrl = (path: string) => {
  if (!path) return ''
  
  // 如果已经是完整的 URL（blob:// 或 data:// 或 http:// 或 https://），直接返回
  if (path.startsWith('blob:') || 
      path.startsWith('data:') || 
      path.startsWith('http://') || 
      path.startsWith('https://')) {
    return path
  }
  
  // 否则拼接 API base URL
  const baseUrl = getCorrosionApiBase().replace(/\/$/, '')
  
  // 规范化路径
  let normalizedPath = path.replace(/\\/g, '/')
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath
  }
  
  return `${baseUrl}${normalizedPath}`
}
</script>

<style scoped>
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.text-link {
  color: var(--accent);
  font-size: 13px;
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}

.link-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-refresh {
  padding: 6px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-refresh:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-block {
  margin-top: 16px;
}

.placeholder-box {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary, #666);
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 6px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-item.is-batch {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.item-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.item-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-done {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-processing,
.status-running {
  background: #fff3e0;
  color: #e65100;
}

.status-error {
  background: #ffebee;
  color: #c62828;
}

.status-pending {
  background: #e3f2fd;
  color: #1565c0;
}

.status-partial_error {
  background: #fff9c4;
  color: #f57f17;
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin-bottom: 8px;
}

.item-date {
  margin-left: auto;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
}

.btn-page {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-page:hover:not(:disabled) {
  background: var(--bg-hover, #f5f5f5);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.corrosion-page {
  width: 100%;
  max-width: none;
  min-width: 0;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border, #e0e0e0);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background: var(--bg-hover, #f5f5f5);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.batch-info {
  padding: 16px;
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  margin-bottom: 20px;
}

.batch-info p {
  margin: 8px 0;
  font-size: 14px;
}

.tasks-title {
  margin: 16px 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.batch-tasks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 12px;
  background: white;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
}

.task-item.task-error {
  border-color: #ffcdd2;
  background: #ffebee;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-filename {
  font-weight: 500;
  font-size: 14px;
}

.task-status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.task-error {
  font-size: 12px;
  color: #c62828;
  margin-top: 4px;
}

.task-content-row {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  max-width: 100%;
  flex-wrap: wrap;
}

.task-images {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.task-image-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.task-img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border, #e0e0e0);
}

.image-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
  font-weight: 500;
}

.arrow {
  font-size: 20px;
  color: var(--text-secondary, #999);
  flex-shrink: 0;
}

.task-params {
  width: 250px;
  padding: 16px;
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--border, #e0e0e0);
  flex-shrink: 0;
}

.params-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #e0e0e0);
}

.param-item:last-child {
  border-bottom: none;
}

.param-label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.param-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent, #1976d2);
}

.classification-item {
  background: linear-gradient(to right, rgba(25, 118, 210, 0.05), rgba(25, 118, 210, 0.02));
  padding: 10px 8px !important;
  border-radius: 4px;
  border: 1px solid rgba(25, 118, 210, 0.2) !important;
}

.classification-label {
  font-weight: 700;
  font-size: 15px;
  color: var(--accent, #1976d2);
  padding: 4px 8px;
  background: rgba(25, 118, 210, 0.1);
  border-radius: 4px;
}

.single-info {
  padding: 16px;
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  margin-bottom: 20px;
  max-width: 100%;
}

.single-info p {
  margin: 8px 0;
  font-size: 14px;
}

.single-content {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-message {
  padding: 20px;
  text-align: center;
  color: #c62828;
  background: #ffebee;
  border-radius: 8px;
}

.info-message {
  padding: 20px;
  text-align: center;
  color: #1565c0;
  background: #e3f2fd;
  border-radius: 8px;
}

.metrics-only {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metrics-only .params-title {
  text-align: center;
  margin-bottom: 20px;
  font-size: 16px;
}

.metrics-only .params-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics-only .param-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--border, #e0e0e0);
}

.no-data {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #999);
  text-align: center;
}
</style>
