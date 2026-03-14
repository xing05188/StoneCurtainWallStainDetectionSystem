export type DetectionStatus = "pending" | "processing" | "done" | "failed"

export interface DetectionRegion {
  label: string
  confidence: number
  severity: "low" | "medium" | "high"
  bbox: [number, number, number, number]
}

export interface DetectionMetrics {
  runtimeMs?: number
  overallCleanliness?: number
}

export interface DetectionTaskItem {
  id: string
  userId: string
  buildingName: string
  locationFloor?: number | null
  locationSection?: string | null
  description?: string | null
  status: DetectionStatus
  createdAt: string
  updatedAt: string
  imagePath?: string | null
  imageSignedUrl?: string | null
  processedImagePath?: string | null
  processedImageSignedUrl?: string | null
  thumbnailPath?: string | null
  summary?: string | null
  stainDetected?: boolean | null
  stainType?: string | null
  severityLevel?: number | null
  affectedAreaPercentage?: number | null
  regions?: DetectionRegion[]
  metrics?: DetectionMetrics | null
  errorMessage?: string | null
}

export interface CreateDetectionPayload {
  buildingName: string
  locationFloor?: number
  locationSection?: string
  description?: string
}

export interface DetectionListQuery {
  currentPage: number
  size: number
  status?: DetectionStatus
  buildingName?: string
}

export interface DetectionListData {
  list: DetectionTaskItem[]
  total: number
}

export interface RetryDetectionData {
  id: string
  status: DetectionStatus
}

export interface DetectionSignedUrlData {
  id: string
  imagePath: string
  imageSignedUrl: string | null
  expiresIn: number
}
