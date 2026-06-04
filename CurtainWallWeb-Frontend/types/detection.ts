export type DetectionStatus = "pending" | "processing" | "done" | "failed"
export type InferenceMode = "local" | "cloud"

export interface DetectionRegion {
  label: string
  confidence: number
  bbox: [number, number, number, number]
}

export interface DetectionMetrics {
  runtimeMs?: number
  overallCleanliness?: number
  inferenceMode?: InferenceMode
}

export interface DetectionTaskItem {
  id: string | number
  userId: string
  buildingName: string
  locationFloor?: number | null
  locationSection?: string | null
  description?: string | null
  status: DetectionStatus
  createdAt: string
  updatedAt: string
  imageName?: string | null
  imagePath?: string | null
  imageSignedUrl?: string | null
  processedImagePath?: string | null
  processedImageSignedUrl?: string | null
  summary?: string | null
  stainDetected?: boolean | null
  stainType?: string | null
  affectedAreaPercentage?: number | null
  inferenceMode?: InferenceMode
  regions?: DetectionRegion[]
  metrics?: DetectionMetrics | null
  errorMessage?: string | null
}

export interface CreateDetectionPayload {
  buildingName: string
  locationFloor?: number
  locationSection?: string
  description?: string
  inferenceMode?: InferenceMode
}

export interface DetectionListQuery {
  currentPage: number
  size: number
  status?: DetectionStatus
  buildingName?: string
  startTime?: string
  endTime?: string
}

export interface DetectionListData {
  list: DetectionTaskItem[]
  total: number
}

export interface RetryDetectionData {
  id: string | number
  status: DetectionStatus
}

export interface DetectionSignedUrlData {
  id: string | number
  imagePath: string
  imageSignedUrl: string | null
  expiresIn: number
}
