import type { DetectionResultData } from '~/types/glassInspection'

const DEFAULT_GLASS_DETECTION_BASE = 'http://8.153.161.229:8003'
const LOCAL_GLASS_BACKEND_BASE = 'http://127.0.0.1:8080'
const REMOTE_GLASS_DETECTION_BASE = 'http://47.102.208.89:8007'
const RESULT_PATH_PATTERN = /(?:^|[\\/])data[\\/]result(?<suffix>[\\/].+)$/i
const PUBLIC_RESULT_PATH_PATTERN = /(?:^|[\\/])results(?<suffix>[\\/].+)$/i
const PUBLIC_IMAGE_PATH_PATTERN = /(?:^|[\\/])images(?<suffix>[\\/].+)$/i

export function isAbsoluteMediaSrc(src: string) {
  return /^(?:data:|blob:|https?:\/\/)/i.test(src)
}

function toLeadingSlashPath(prefix: '/results' | '/images', suffix: string) {
  const normalizedSuffix = suffix.replace(/\\/g, '/').replace(/^\/+/, '')
  return `${prefix}/${normalizedSuffix}`
}

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function inferMediaBaseURL(path: string) {
  if (path.startsWith('/results/') || path.startsWith('/images/')) {
    return LOCAL_GLASS_BACKEND_BASE
  }

  return REMOTE_GLASS_DETECTION_BASE
}

export function normalizeInspectionMediaPath(src?: string | null) {
  if (!src) {
    return ''
  }

  const trimmed = String(src).trim()
  if (!trimmed) {
    return ''
  }

  if (isAbsoluteMediaSrc(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('/results/') || trimmed.startsWith('/images/')) {
    return trimmed.replace(/\\/g, '/')
  }

  if (trimmed.startsWith('results/') || trimmed.startsWith('images/')) {
    return ensureLeadingSlash(trimmed.replace(/\\/g, '/'))
  }

  const resultMatch = trimmed.match(RESULT_PATH_PATTERN)
  if (resultMatch?.groups?.suffix) {
    return toLeadingSlashPath('/results', resultMatch.groups.suffix)
  }

  const publicResultMatch = trimmed.match(PUBLIC_RESULT_PATH_PATTERN)
  if (publicResultMatch?.groups?.suffix) {
    return toLeadingSlashPath('/results', publicResultMatch.groups.suffix)
  }

  const publicImageMatch = trimmed.match(PUBLIC_IMAGE_PATH_PATTERN)
  if (publicImageMatch?.groups?.suffix) {
    return toLeadingSlashPath('/images', publicImageMatch.groups.suffix)
  }

  return ensureLeadingSlash(trimmed.replace(/\\/g, '/'))
}

export function absolutizeInspectionMediaSrc(src?: string | null, baseURL?: string) {
  if (!src) {
    return ''
  }

  const normalized = normalizeInspectionMediaPath(src)
  if (!normalized) {
    return ''
  }

  if (isAbsoluteMediaSrc(normalized)) {
    return normalized
  }

  const resolvedBaseURL = (baseURL || inferMediaBaseURL(normalized)).replace(/\/+$/, '')
  return `${resolvedBaseURL}${ensureLeadingSlash(normalized)}`
}

export function resolveInspectionMediaSrc(src?: string | null) {
  return absolutizeInspectionMediaSrc(src)
}

export function absolutizeDetectionResultMedia(
  result?: DetectionResultData | null,
  baseURL?: string
): DetectionResultData | null {
  if (!result) {
    return null
  }

  return {
    ...result,
    image: absolutizeInspectionMediaSrc(result.image, baseURL),
    details: result.details?.map((detail) => ({
      ...detail,
      image: absolutizeInspectionMediaSrc(detail.image, baseURL)
    }))
  }
}
