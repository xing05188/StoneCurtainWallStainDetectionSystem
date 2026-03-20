import type * as Detection from "./type"
import { request } from "@/http/axios"

interface UploadProgressEvent {
  loaded: number
  total?: number
}

export function createDetectionTaskApi(
  file: File,
  payload: Detection.CreateDetectionPayload,
  onUploadProgress?: (progress: number) => void
) {
  const data = new FormData()
  data.append("image", file)
  data.append("building_name", payload.buildingName)

  if (payload.locationFloor !== undefined) {
    data.append("location_floor", String(payload.locationFloor))
  }
  if (payload.locationSection) {
    data.append("location_section", payload.locationSection)
  }
  if (payload.description) {
    data.append("description", payload.description)
  }
  data.append("inference_mode", payload.inferenceMode || "local")

  return request<Detection.DetectionTaskItem>({
    url: "detections",
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress: (event: UploadProgressEvent) => {
      if (!event.total || !onUploadProgress) return
      onUploadProgress(Math.round((event.loaded / event.total) * 100))
    }
  })
}

export function getDetectionTaskApi(id: string | number) {
  return request<Detection.DetectionTaskItem>({
    url: `detections/${id}`,
    method: "get"
  })
}

export function getDetectionListApi(params: Detection.DetectionListQuery) {
  return request<Detection.DetectionListData>({
    url: "detections",
    method: "get",
    params: {
      current_page: params.currentPage,
      size: params.size,
      status: params.status,
      building_name: params.buildingName,
      start_time: params.startTime,
      end_time: params.endTime
    }
  })
}

export function retryDetectionTaskApi(id: string | number) {
  return request<Detection.RetryDetectionData>({
    url: `detections/${id}/retry`,
    method: "post"
  })
}

export function getDetectionSignedUrlApi(id: string | number, expiresIn = 3600) {
  return request<Detection.DetectionSignedUrlData>({
    url: `detections/${id}/signed-url`,
    method: "get",
    params: {
      expires_in: expiresIn
    }
  })
}
