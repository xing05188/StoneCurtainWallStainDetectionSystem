/**
 * Hook 名称：useCorrosion
 * 作用：管理锈蚀检测前端状态，并调用 Nuxt API 代理转发到 Flask 后端。
 */
import { ref } from 'vue'

// 获取认证 token 的辅助函数
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      console.log('[useCorrosion] Token found in localStorage, length:', storedToken.length)
      return { Authorization: `Bearer ${storedToken}` }
    }

    // 在客户端，从 document.cookie 读取
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    
    const token = cookies['auth_token']
    if (token) {
      console.log('[useCorrosion] ✅ Token found, length:', token.length)
      return { Authorization: `Bearer ${token}` }
    }
    console.warn('[useCorrosion] No auth token found in localStorage or cookies')
    return {}
  }
  
  // 在服务器端，使用 useCookie
  try {
    const tokenCookie = useCookie('auth_token')
    if (tokenCookie.value) {
      console.log('[useCorrosion] ✅ Token found in SSR')
      return { Authorization: `Bearer ${tokenCookie.value}` }
    }
  } catch (e) {
    console.warn('[useCorrosion] ⚠️ Error reading cookie in SSR:', e)
  }
  return {}
}

const getCorrosionApiBase = () => {
  const config = useRuntimeConfig()
  return (config.public.corrosionApiBase as string) || 'http://8.153.161.229:18000'
}

interface ModelItem {
  key: string
  name: string
}

interface DetectionMetrics {
  count?: number
  area_ratio?: number
  avg_conf?: number
  classification?: {
    label: string
    confidence: number
  }
}

interface DetectParams {
  model: string
  conf: number
  iou: number
  imgsz: number
  max_det: number
}

interface TaskItem {
  id: string
  filename: string
  mode: 'sync' | 'queue'
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
  metrics?: DetectionMetrics
  batchId?: string
  model?: string
  batchOrder?: number
}

interface HistoryBatchItem {
  type: 'batch'
  batch_no: string
  name: string
  status: string
  total_count: number
  processed_count: number
  created_at: string
  thumbnail_urls?: string[]
}

interface HistorySingleItem {
  type: 'single'
  job_id: string
  status: string
  model: string
  created_at: string
  result_preview?: DetectionMetrics
  input_image?: string
  output_image?: string
  metrics?: DetectionMetrics
  error_msg?: string
}

type HistoryItem = HistoryBatchItem | HistorySingleItem

interface HistoryListResponse {
  page: number
  total: number
  list: HistoryItem[]
}

interface BatchDetailsTask {
  job_id: string
  input_image: string
  output_image?: string
  status: string
  metrics?: DetectionMetrics
  error_msg?: string
}

interface BatchDetailsResponse {
  batch_info: {
    batch_no: string
    name: string
    progress: string
    status: string
  }
  tasks: BatchDetailsTask[]
}

export function useCorrosion() {
  // 使用 useState 在页面之间共享状态（任务、日志、画廊、进度）
  const models = ref<ModelItem[]>([])
  const files = ref<File[]>([])
  const busy = ref(false)
  const metrics = useState<DetectionMetrics>('corrosion-metrics', () => ({}))
  const previewSrc = useState<string>('corrosion-preview', () => '')
  const inputPreviewSrc = useState<string>('corrosion-input-preview', () => '')
  const progressText = useState<string>('corrosion-progress', () => '未开始')
  const gallery = useState<Array<{ id: string; input: string; output: string; metrics: DetectionMetrics; params: DetectParams; filename: string; batchId?: string; batchOrder?: number }>>('corrosion-gallery', () => [])
  const tasks = useState<TaskItem[]>('corrosion-tasks', () => [])
  const logs = useState<string[]>('corrosion-logs', () => [])
  const params = useState<DetectParams>('corrosion-params', () => ({ model: 'yolo11s.pt', conf: 0.25, iou: 0.45, imgsz: 640, max_det: 300 }))
  const lastParams = useState<DetectParams>('corrosion-last-params', () => ({ ...params.value }))
  const batchSeq = useState<number>('corrosion-batch-seq', () => 0)
  const currentBatchId = useState<string>('corrosion-current-batch', () => '')
  
  // 历史记录相关状态
  const historyList = useState<HistoryItem[]>('corrosion-history-list', () => [])
  const historyPage = useState<number>('corrosion-history-page', () => 1)
  const historyTotal = useState<number>('corrosion-history-total', () => 0)
  const historyLoading = ref(false)
  const historyType = useState<'single' | 'batch' | 'all'>('corrosion-history-type', () => 'all')
  
  // 批次详情相关状态
  const batchDetails = useState<BatchDetailsResponse | null>('corrosion-batch-details', () => null)
  const batchDetailsLoading = ref(false)

  const pushLog = (msg: string) => {
    const line = `${new Date().toLocaleTimeString()} - ${msg}`
    logs.value.unshift(line)
    if (logs.value.length > 100) logs.value.pop()
  }

  const fetchModels = async () => {
    try {
      const res = await $fetch<any>(`${getCorrosionApiBase()}/models`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      })
      // 兼容嵌套的 data 结构和扁平结构
      const modelsList = res?.data?.models || res?.models
      if (res?.success && modelsList?.length) {
        models.value = modelsList
        // 仅在当前选择无效或为空时才回落到第一个模型，避免覆盖用户选择
        const current = params.value.model
        const hasCurrent = modelsList.some((m: ModelItem) => m.key === current)
        if (!current || !hasCurrent) {
          params.value.model = modelsList[0].key
        }
        pushLog('模型列表加载成功')
      }
      if (!res?.success) {
        console.error('加载模型列表失败', res)
        pushLog('模型列表加载失败')
      }
    } catch (e) {
      console.warn('加载模型列表失败', e)
      pushLog('模型列表加载异常')
    }
  }

  const setFiles = (list: File[]) => {
    files.value = list
    progressText.value = list.length ? `已选择 ${list.length} 张图片` : '未开始'
    currentBatchId.value = ''
    if (list.length) {
      inputPreviewSrc.value = URL.createObjectURL(list[0])
    } else {
      inputPreviewSrc.value = ''
    }
  }

  const handleResult = (data: any, inputUrl: string, filename: string, taskId?: string, batchId?: string) => {
    if (!data) return
    const outputUrl = data.image_base64 
      ? `data:image/png;base64,${data.image_base64}` 
      : (data.output_image_url || '')
    
    previewSrc.value = outputUrl
    inputPreviewSrc.value = inputUrl
    
    // 检查后端是否返回了 metrics
    if (!data.metrics) {
      console.warn('⚠️ 后端返回 metrics 为 null，检测可能失败或后端未正确计算指标')
      progressText.value = '⚠️ 后端未返回检测指标，请检查后端日志'
      pushLog(`警告: ${filename} - 后端返回 metrics 为 null`)
    }
    
    const m = data.metrics || {}
    const met: DetectionMetrics = {
      count: m['检测数量'] ?? m.count ?? m.box_count ?? 0,
      area_ratio: m['面积比例'] ?? m.area_ratio ?? 0,
      avg_conf: m['平均置信度'] ?? m.avg_conf ?? m.max_conf ?? 0
    }
    // 如果有分类结果，添加到 metrics
    if (m.classification && m.classification.label && typeof m.classification.confidence === 'number') {
      met.classification = {
        label: m.classification.label,
        confidence: m.classification.confidence
      }
    }
    metrics.value = met
    const p: DetectParams = {
      model: data.params?.model ?? params.value.model,
      conf: data.params?.conf ?? params.value.conf,
      iou: data.params?.iou ?? params.value.iou,
      imgsz: data.params?.imgsz ?? params.value.imgsz,
      max_det: data.params?.max_det ?? params.value.max_det
    }
    lastParams.value = p
    console.log('检测结果', {
      filename,
      base64Length: data.image_base64 ? data.image_base64.length : 0,
      metrics: met,
      metricsIsNull: !data.metrics,
      params: p
    })
    if ((met.count ?? 0) === 0) {
      if (!data.metrics) {
        progressText.value = '⚠️ 后端未返回检测指标 (metrics: null)'
      } else {
        progressText.value = '模型未检出目标（count=0），可尝试降低 conf 或换权重'
      }
    }
    let batchOrder: number | undefined
    if (taskId) {
      const t = tasks.value.find((x: TaskItem) => x.id === taskId)
      if (t) {
        t.status = 'done'
        t.metrics = met
        t.message = '完成'
        if (!batchId) batchId = t.batchId
        batchOrder = t.batchOrder
      }
    }
    pushLog(`检测成功: ${filename}, count=${met.count ?? '-'}, model=${p.model}`)
    gallery.value.unshift({
      id: taskId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      input: inputUrl,
      output: outputUrl,
      metrics: met,
      params: p,
      filename,
      batchId,
      batchOrder
    })
  }

  const startDetect = async () => {
    if (!files.value.length) return
    busy.value = true
    progressText.value = '检测中...'
    try {
      const batchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      batchSeq.value += 1
      const batchOrder = batchSeq.value
      currentBatchId.value = batchId
      let done = 0
      for (const file of files.value) {
        const inputUrl = URL.createObjectURL(file)
        const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        // 将路径中的 / 替换为 \ (macOS 转 Windows 路径格式)
        const windowsStyleFilename = file.name.replace(/\//g, '\\')
        tasks.value.unshift({ id: taskId, filename: windowsStyleFilename, mode: 'sync', status: 'running', batchId, model: params.value.model, batchOrder })
        const form = new FormData()
        // 创建新的 File 对象，使用转换后的文件名
        const renamedFile = new File([file], windowsStyleFilename, { type: file.type })
        form.append('file', renamedFile)
        form.append('model', params.value.model)
        form.append('conf', String(params.value.conf))
        form.append('iou', String(params.value.iou))
        form.append('imgsz', String(params.value.imgsz))
        form.append('max_det', String(params.value.max_det))

        try {
          const res = await $fetch<any>(`${getCorrosionApiBase()}/detect`, {
            method: 'POST',
            body: form,
            headers: getAuthHeaders(),
            credentials: 'include'
          })
          if (res?.success) {
            handleResult(res, inputUrl, file.name, taskId, batchId)
          } else {
            console.error('检测失败', res)
            const errorMsg = res?.message || '检测失败'
            progressText.value = errorMsg
            const t = tasks.value.find((x: TaskItem) => x.id === taskId)
            if (t) {
              t.status = 'error'
              t.message = errorMsg
            }
            pushLog(`检测失败: ${file.name} - ${errorMsg}`)
          }
        } catch (err: any) {
          console.error('检测请求异常', err)
          const errorMsg = err?.data?.message || err?.message || '请求异常'
          
          // 特别处理 401 认证错误
          if (err?.statusCode === 401) {
            progressText.value = '认证失败，请重新登录'
            const t = tasks.value.find((x: TaskItem) => x.id === taskId)
            if (t) {
              t.status = 'error'
              t.message = '认证失败，请重新登录'
            }
            pushLog(`认证失败: ${file.name}`)
          } else {
            progressText.value = errorMsg
            const t = tasks.value.find((x: TaskItem) => x.id === taskId)
            if (t) {
              t.status = 'error'
              t.message = errorMsg
            }
            pushLog(`请求异常: ${file.name} - ${errorMsg}`)
          }
        }
        done += 1
        progressText.value = `完成 ${done}/${files.value.length}`
      }
      progressText.value = '完成'
    } catch (error) {
      console.error('同步检测过程中发生未预期的错误', error)
      progressText.value = '检测过程异常，部分任务可能未完成'
      pushLog('同步检测发生异常，请查看任务列表')
    } finally {
      busy.value = false
    }
  }

  const startQueue = async () => {
    if (!files.value.length) return
    busy.value = true
    try {
      progressText.value = '正在提交批量任务...'
      
      const form = new FormData()
      // 添加所有文件
      for (const file of files.value) {
        const windowsStyleFilename = file.name.replace(/\//g, '\\')
        const renamedFile = new File([file], windowsStyleFilename, { type: file.type })
        form.append('files', renamedFile)
      }
      
      // 添加参数
      form.append('model', params.value.model)
      form.append('conf', String(params.value.conf))
      form.append('iou', String(params.value.iou))
      form.append('imgsz', String(params.value.imgsz))
      form.append('max_det', String(params.value.max_det))

      // 1. 提交批量任务
      const res = await $fetch<any>(`${getCorrosionApiBase()}/detect/batch`, {
        method: 'POST',
        body: form,
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (!res?.success || !res?.data?.batch_no) {
        throw new Error(res?.message || '批量提交失败')
      }

      const batchNo = res.data.batch_no
      const totalFiles = res.data.total_files || files.value.length
      pushLog(`批量任务提交成功: ${batchNo} (共 ${totalFiles} 个文件)`)
      
      batchSeq.value += 1
      const batchOrder = batchSeq.value
      currentBatchId.value = batchNo
      progressText.value = `批量处理中 (0/${totalFiles})...`

      // 2. 轮询批次状态
      const pollBatch = async () => {
        try {
          const batchRes = await $fetch<any>(`${getCorrosionApiBase()}/history/batches/${batchNo}`, {
            headers: getAuthHeaders(),
            credentials: 'include'
          })

          if (batchRes?.success && batchRes?.data) {
            const info = batchRes.data.batch_info
            const taskList = batchRes.data.tasks || []
            
            // 更新进度文本
            progressText.value = `批量处理中 (${info.progress || '?'})...`
            
            // 同步任务列表到前端 tasks
            // 这里我们只添加新的或更新已有的，避免重复
            taskList.forEach((t: any) => {
              const existingTask = tasks.value.find(x => x.id === t.job_id)
              const taskStatus = t.status === 'done' ? 'done' : (t.status === 'error' ? 'error' : 'running')
              
              if (existingTask) {
                existingTask.status = taskStatus
                existingTask.metrics = t.metrics
                existingTask.message = t.error_msg || (taskStatus === 'done' ? '完成' : '处理中')
                
                // 如果完成了，且没有添加到画廊，则直接使用 batch details 中的路径
                if (taskStatus === 'done' && !gallery.value.find(g => g.id === t.job_id)) {
                   const config = useRuntimeConfig()
                   const apiBase = (config.public.corrosionApiBase as string) || 'http://8.153.161.229:18000'
                   const baseUrl = apiBase.replace(/\/$/, '')
                   
                   // 构建图片 URL
                   // 1. 替换所有的反斜杠 \ 为正斜杠 /
                   // 2. 确保以 / 开头
                   const normalizePath = (p: string) => {
                     if (!p) return ''
                     let path = p.replace(/\\/g, '/')
                     if (!path.startsWith('/')) {
                       path = '/' + path
                     }
                     return path
                   }

                   const inputImgPath = normalizePath(t.input_image)
                   const outputImgPath = normalizePath(t.output_image)
                   
                   const inputUrl = inputImgPath ? `${baseUrl}${inputImgPath}` : ''
                   const outputUrl = outputImgPath ? `${baseUrl}${outputImgPath}` : ''
                   
                   if (outputUrl) {
                      const resData = {
                        metrics: t.metrics,
                        output_image_url: outputUrl,
                        params: params.value // 批量任务通常使用统一参数
                      }
                      const fileName = t.input_image ? t.input_image.split(/[/\\]/).pop() : `Task ${t.job_id}`
                      handleResult(resData, inputUrl, fileName, t.job_id, batchNo)
                   }
                }
              } else {
                // 新任务
                tasks.value.unshift({
                  id: t.job_id,
                  filename: t.input_image ? t.input_image.split(/[/\\]/).pop() : `Task ${t.job_id}`,
                  mode: 'queue',
                  status: taskStatus,
                  batchId: batchNo,
                  batchOrder: batchOrder,
                  model: params.value.model,
                  message: t.error_msg
                })
              }
            })

            // 检查是否所有任务都已完成（防止后端状态更新滞后导致无限轮询）
            const allTasksDone = taskList.length > 0 && taskList.every((t: any) => ['done', 'error'].includes(t.status))

            if (info.status === 'done' || info.status === 'partial_error' || allTasksDone) {
              progressText.value = (info.status === 'done' || allTasksDone) ? '批量处理完成' : '批量处理完成(部分失败)'
              pushLog(`批量任务结束: ${batchNo}`)
              busy.value = false
              return // 结束轮询
            }
          }
        } catch (e) {
          console.error('轮询批次失败', e)
        }
        
        // 继续轮询
        setTimeout(pollBatch, 2000)
      }

      pollBatch()

    } catch (error: any) {
      console.error('批量检测请求异常', error)
      const errorMsg = error?.data?.message || error?.message || '请求异常'
      
      if (error?.statusCode === 401) {
        progressText.value = '认证失败，请重新登录'
        pushLog(`认证失败: 请重新登录`)
      } else {
        progressText.value = errorMsg
        pushLog(`批量请求异常: ${errorMsg}`)
      }
      busy.value = false
    }
  }

  const fetchHistory = async (page: number = 1, limit: number = 10, type: 'single' | 'batch' | 'all' = 'all') => {
    historyLoading.value = true
    try {
      const res = await $fetch<any>(`${getCorrosionApiBase()}/history`, {
        method: 'GET',
        params: { page, limit, type },
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (res?.success && res?.data) {
        historyList.value = res.data.list || []
        historyPage.value = res.data.page || page
        historyTotal.value = res.data.total || 0
        historyType.value = type
        pushLog(`历史记录加载成功: 第 ${page} 页，共 ${res.data.total} 条`)
      } else {
        console.error('获取历史记录失败', res)
        pushLog('历史记录加载失败')
      }
    } catch (error: any) {
      console.error('获取历史记录异常', error)
      const errorMsg = error?.data?.message || error?.message || '请求异常'
      
      if (error?.statusCode === 401) {
        pushLog('认证失败: 请重新登录')
      } else {
        pushLog(`历史记录请求异常: ${errorMsg}`)
      }
    } finally {
      historyLoading.value = false
    }
  }

  const fetchBatchDetails = async (batchNo: string, statusFilter?: string) => {
    batchDetailsLoading.value = true
    try {
      const res = await $fetch<any>(`${getCorrosionApiBase()}/history/batches/${batchNo}`, {
        method: 'GET',
        params: statusFilter ? { status: statusFilter } : {},
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (res?.success && res?.data) {
        batchDetails.value = res.data
        pushLog(`批次详情加载成功: ${batchNo}`)
      } else {
        console.error('获取批次详情失败', res)
        pushLog('批次详情加载失败')
      }
    } catch (error: any) {
      console.error('获取批次详情异常', error)
      const errorMsg = error?.data?.message || error?.message || '请求异常'
      
      if (error?.statusCode === 401) {
        pushLog('认证失败: 请重新登录')
      } else {
        pushLog(`批次详情请求异常: ${errorMsg}`)
      }
    } finally {
      batchDetailsLoading.value = false
    }
  }

  return {
    models,
    files,
    params,
    busy,
    metrics,
    previewSrc,
    inputPreviewSrc,
    lastParams,
    progressText,
    gallery,
    tasks,
    logs,
    currentBatchId,
    // 历史记录相关
    historyList,
    historyPage,
    historyTotal,
    historyLoading,
    historyType,
    batchDetails,
    batchDetailsLoading,
    // 方法
    fetchModels,
    setFiles,
    startDetect,
    startQueue,
    fetchHistory,
    fetchBatchDetails
  }
}
