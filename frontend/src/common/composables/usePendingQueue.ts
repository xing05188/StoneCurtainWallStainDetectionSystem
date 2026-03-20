import type { Ref } from "vue"
import type { InferenceMode } from "@/common/apis/detection/type"

export interface PendingQueueItem {
  id: string
  file: File | null
  fileSize: number // 保存文件大小用于持久化
  customName: string
  imagePreview: string
  taskId?: string
  formData: {
    buildingName: string
    locationFloor?: number
    locationSection?: string
    description?: string
    inferenceMode?: InferenceMode
  }
  uploadProgress: number
  status: "pending" | "uploading" | "done" | "failed"
  errorMessage?: string
}

export function usePendingQueue(storageKey = "detectionQueue") {
  const queue = useStateRef<PendingQueueItem[]>("pending-queue-state", [])
  const isProcessing = ref(false)

  if (!useStateRef<boolean>("pending-queue-loaded", false).value) {
    loadQueue()
    useStateRef<boolean>("pending-queue-loaded", false).value = true
  }

  function useStateRef<T>(key: string, initial: T) {
    const g = globalThis as unknown as { __queueStates?: Record<string, Ref<unknown>> }
    if (!g.__queueStates) {
      g.__queueStates = {}
    }
    if (!g.__queueStates[key]) {
      g.__queueStates[key] = ref(initial)
    }
    return g.__queueStates[key] as Ref<T>
  }

  // 从 localStorage 恢复队列
  function loadQueue() {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        // File 对象无法序列化，刷新后仅保留元数据；路由切换不会走这里覆盖内存数据
        queue.value = data.map((item: any) => ({
          ...item,
          file: null,
          imagePreview: item.imagePreview || "",
          fileSize: Number(item.fileSize || 0),
          status: item.status || "pending"
        }))
      }
    } catch (error) {
      console.error("Failed to load queue:", error)
    }
  }

  // 保存队列到 localStorage（不包含 File 和 preview）
  const saveQueue = () => {
    try {
      const safeData = queue.value.map(item => ({
        id: item.id,
        customName: item.customName,
        imagePreview: item.imagePreview,
        fileSize: item.fileSize,
        taskId: item.taskId,
        formData: item.formData,
        uploadProgress: item.uploadProgress,
        status: item.status,
        errorMessage: item.errorMessage
      }))
      localStorage.setItem(storageKey, JSON.stringify(safeData))
    } catch (error) {
      console.error("Failed to save queue:", error)
    }
  }

  // 添加到队列
  const addToQueue = (item: Omit<PendingQueueItem, "id" | "uploadProgress" | "status" | "errorMessage" | "fileSize" | "taskId">) => {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newItem: PendingQueueItem = {
      ...item,
      id,
      fileSize: item.file?.size || 0,
      uploadProgress: 0,
      status: "pending"
    }
    queue.value.push(newItem)
    saveQueue()
    return id
  }

  // 更新队列项
  const updateQueueItem = (id: string, updates: Partial<PendingQueueItem>) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index !== -1) {
      Object.assign(queue.value[index], updates)
      saveQueue()
    }
  }

  // 从队列移除
  const removeFromQueue = (id: string) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index !== -1) {
      queue.value.splice(index, 1)
      saveQueue()
    }
  }

  // 清空队列
  const clearQueue = () => {
    queue.value = []
    localStorage.removeItem(storageKey)
  }

  // 清空已完成项
  const clearCompletedItems = () => {
    queue.value = queue.value.filter(item => item.status !== "done")
    saveQueue()
  }

  // 计数器
  const queueStats = computed(() => {
    return {
      total: queue.value.length,
      pending: queue.value.filter(item => item.status === "pending").length,
      uploading: queue.value.filter(item => item.status === "uploading").length,
      done: queue.value.filter(item => item.status === "done").length,
      failed: queue.value.filter(item => item.status === "failed").length
    }
  })

  return {
    queue,
    isProcessing,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    clearQueue,
    clearCompletedItems,
    queueStats,
    saveQueue
  }
}
