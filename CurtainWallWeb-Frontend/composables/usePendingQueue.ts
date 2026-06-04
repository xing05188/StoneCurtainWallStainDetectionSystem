import type { Ref } from "vue"
import type { InferenceMode } from "../types/detection"

export interface PendingQueueItem {
  id: string
  file: File | null
  fileSize: number
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

  function loadQueue() {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const data = JSON.parse(stored)
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

  const saveQueue = () => {
    try {
      const safeData = queue.value.map(item => ({
        id: item.id,
        customName: item.customName,
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

  const updateQueueItem = (id: string, updates: Partial<PendingQueueItem>) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index !== -1) {
      Object.assign(queue.value[index], updates)
      saveQueue()
    }
  }

  const removeFromQueue = (id: string) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index !== -1) {
      queue.value.splice(index, 1)
      saveQueue()
    }
  }

  const clearQueue = () => {
    queue.value = []
    localStorage.removeItem(storageKey)
  }

  const clearCompletedItems = () => {
    queue.value = queue.value.filter(item => item.status !== "done")
    saveQueue()
  }

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
