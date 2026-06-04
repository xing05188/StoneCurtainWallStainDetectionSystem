export type DetectionStatus = 'success' | 'warning' | 'error'

export interface FitHeightBandPlane {
  name: string
  z: number
  corners: [number, number, number][]
}

export interface FitHeightBandRenderHint {
  color: string
  opacity: number
}

export interface FitHeightBand {
  enabled: boolean
  coordinate_system: string
  unit: string
  lower_z?: number
  upper_z?: number
  x_range?: [number, number]
  y_range?: [number, number]
  boundary_planes: FitHeightBandPlane[]
  render_hint?: FitHeightBandRenderHint
}

export interface PointCloudData {
  points: number[][]
  dists: number[]
  plane: number[]
  normal?: number[]
  projected_points?: number[][]
  projected_dists?: number[]
  fit_height_band?: FitHeightBand
}

export interface DetectionDetail {
  label: string
  value: string
  description?: string
  image?: string
}

export interface DetectionResultData {
  status: DetectionStatus
  title: string
  description: string
  details?: DetectionDetail[]
  image?: string
  pointcloud?: PointCloudData
}

export const FLATNESS_FIELD_NAMES = ['left_env', 'left_mix', 'right_env', 'right_mix'] as const

export type FlatnessFieldName = (typeof FLATNESS_FIELD_NAMES)[number]
