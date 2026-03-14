import type * as Detection from "@@/apis/detection/type"
import {
  createDetectionTaskApi,
  getDetectionListApi,
  getDetectionSignedUrlApi,
  getDetectionTaskApi,
  retryDetectionTaskApi
} from "@@/apis/detection"

interface DetectionQueryState {
  currentPage: number
  size: number
  status?: Detection.DetectionStatus
  buildingName?: string
}

export const useDetectionStore = defineStore("detection", () => {
  const list = ref<Detection.DetectionTaskItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const uploadProgress = ref(0)
  const currentTask = ref<Detection.DetectionTaskItem | null>(null)

  const query = reactive<DetectionQueryState>({
    currentPage: 1,
    size: 10,
    status: undefined,
    buildingName: ""
  })

  let pollingTimer: number | null = null

  const setQuery = (value: Partial<DetectionQueryState>) => {
    Object.assign(query, value)
  }

  const stopPolling = () => {
    if (!pollingTimer) return
    window.clearInterval(pollingTimer)
    pollingTimer = null
  }

  const fetchList = async () => {
    loading.value = true
    try {
      const { list: records, total: totalCount } = await getDetectionListApi({
        currentPage: query.currentPage,
        size: query.size,
        status: query.status,
        buildingName: query.buildingName || undefined
      })

      list.value = records
      total.value = totalCount
    } finally {
      loading.value = false
    }
  }

  const fetchTask = async (id: string) => {
    const record = await getDetectionTaskApi(id)
    if (!record.imageSignedUrl && record.imagePath) {
      try {
        const signed = await getDetectionSignedUrlApi(id)
        record.imageSignedUrl = signed.imageSignedUrl
      } catch {
        record.imageSignedUrl = null
      }
    }
    currentTask.value = record
    return record
  }

  const refreshTaskImageSignedUrl = async (id: string, expiresIn = 3600) => {
    const signed = await getDetectionSignedUrlApi(id, expiresIn)
    if (currentTask.value?.id === id) {
      currentTask.value.imageSignedUrl = signed.imageSignedUrl
    }
    return signed
  }

  const startPolling = (id: string) => {
    stopPolling()
    pollingTimer = window.setInterval(async () => {
      const task = await fetchTask(id)
      if (task.status === "done" || task.status === "failed") {
        stopPolling()
        await fetchList()
      }
    }, 2000)
  }

  const createTask = async (file: File, payload: Detection.CreateDetectionPayload) => {
    uploadProgress.value = 0
    const task = await createDetectionTaskApi(file, payload, (progress) => {
      uploadProgress.value = progress
    })

    currentTask.value = task
    await fetchList()

    if (task.status === "pending" || task.status === "processing") {
      startPolling(task.id)
    }

    return task
  }

  const retryTask = async (id: string) => {
    const result = await retryDetectionTaskApi(id)
    await fetchTask(result.id)
    startPolling(result.id)
    await fetchList()
  }

  return {
    list,
    total,
    loading,
    query,
    uploadProgress,
    currentTask,
    setQuery,
    fetchList,
    fetchTask,
    refreshTaskImageSignedUrl,
    createTask,
    retryTask,
    startPolling,
    stopPolling
  }
})
