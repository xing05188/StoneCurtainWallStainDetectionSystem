<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white shadow-sm">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-semibold">异常监控与统计</h1>
        <div class="flex items-center space-x-4">
          <el-tooltip content="X/Y/Z轴及CH1/CH2通道异常数据监控" placement="bottom">
            <el-icon><InfoFilled /></el-icon>
          </el-tooltip>
          <el-button type="primary" @click="router.push('/')">返回主页</el-button>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6">
      <div class="bg-white rounded p-4 mb-6">
        <div class="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
          这里展示的是后端异常记录表中的预警记录，并按设备、方向、等级和时间范围查询。
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block mb-2">设备选择</label>
            <el-cascader
              v-model="params.device"
              :options="cascaderDevices"
              :props="cascaderProps"
              placeholder="请选择设备"
              class="w-full"
              :disabled="loading"
              @change="handleDeviceChange"
            >
              <template #default="{ data }">
                <span>
                  <span
                    v-if="data.children"
                    class="inline-block h-2 w-2 flex-shrink-0 rounded-full mr-2 bg-green-400"
                    aria-hidden="true"
                  />
                  <span
                    v-else
                    class="inline-block h-2 w-2 flex-shrink-0 rounded-full mr-2"
                    :class="{
                      'bg-green-400': data.online,
                      'bg-gray-400': !data.online
                    }"
                    aria-hidden="true"
                  />
                  {{ data.label }}
                  <span v-if="!data.children" class="ml-1 text-xs text-gray-500">(在线)</span>
                </span>
              </template>
            </el-cascader>
          </div>

          <div>
            <label class="block mb-2">异常方向</label>
            <el-cascader
              v-model="params.direction"
              :options="filteredDirectionOptions"
              :props="directionProps"
              placeholder="请选择方向"
              class="w-full"
              :disabled="loading"
              @change="handleDirectionChange"
            >
              <template #default="{ data }">
                <span>{{ data.label }}</span>
              </template>
            </el-cascader>
          </div>

          <div>
            <label class="block mb-2">预警等级</label>
            <el-select v-model="selectedLevel" class="w-full" :disabled="loading">
              <el-option
                v-for="option in levelOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <div class="md:col-span-2">
            <label class="block mb-2">时间范围</label>
            <div class="flex items-center space-x-2">
              <el-date-picker
                v-model="params.start_time"
                type="datetime"
                placeholder="开始时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                class="!w-[220px]"
                :disabled="loading"
                :disabledDate="disabledStartDate"
                :shortcuts="startDateShortcuts"
              />
              <span class="text-gray-500">至</span>
              <el-date-picker
                v-model="params.end_time"
                type="datetime"
                placeholder="结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                class="!w-[220px]"
                :disabled="loading"
                :disabledDate="disabledEndDate"
                :shortcuts="endDateShortcuts"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4 space-x-4">
          <el-button
            type="primary"
            @click="handleSearch"
            :loading="loading"
            :disabled="!hasCompleteQueryParams"
          >
            查询
          </el-button>
          <el-button
            type="primary"
            @click="downloadData"
            :loading="loading"
            :disabled="!hasCompleteQueryParams"
          >
            导出数据
          </el-button>
        </div>
      </div>

      <div class="bg-white rounded p-4">
        <div class="flex justify-center w-full">
          <div v-if="loading" class="h-[500px] flex items-center justify-center">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
          <div v-else-if="chartData.length > 0" class="table-container w-[90%]">
            <el-table
              :data="chartData"
              border
              style="width: 100%"
              height="500"
              :max-height="500"
            >
              <el-table-column prop="device_id" label="设备ID" min-width="120" fixed />
              <el-table-column prop="device_name" label="设备名称" min-width="120" fixed />
              <el-table-column prop="time" label="时间" min-width="180" />
              <el-table-column label="预警等级" min-width="120">
                <template #default="scope">
                  <el-tag :type="getAlertLevelTag(scope.row.alert_level)" size="small">
                    {{ getAlertLabel(scope.row.alert_level) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="实际值" min-width="120">
                <template #default="scope">
                  {{ formatMetric(scope.row.actual_value) }}
                </template>
              </el-table-column>
              <el-table-column label="标准值" min-width="120">
                <template #default="scope">
                  {{ formatMetric(scope.row.standard_value) }}
                </template>
              </el-table-column>
              <el-table-column label="绝对差" min-width="120">
                <template #default="scope">
                  {{ formatMetric(scope.row.deviation) }}
                </template>
              </el-table-column>
              <el-table-column prop="direction" label="方向" min-width="150">
                <template #default="scope">
                  {{ getDirectionLabel(scope.row.direction) }}
                </template>
              </el-table-column>
              <el-table-column prop="min" label="最小阈值" min-width="120" />
              <el-table-column prop="max" label="最大阈值" min-width="120" />
            </el-table>

            <div class="pagination-bar">
              <span class="pagination-total">共 {{ paginationTotal }} 条</span>
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[50, 100, 200, 500]"
                :total="paginationTotal"
                layout="sizes, prev, pager, next, jumper"
                :disabled="loading"
                @size-change="handlePageSizeChange"
                @current-change="fetchData"
              />
            </div>
          </div>
          <el-empty v-else description="暂无数据" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sub } from 'date-fns'
import { Loading, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  deriveAlertMetrics,
  getAlertLevelLabel,
  getAlertLevelTagType,
  getVibrationAlertConfig
} from '~/composables/useVibrationAlertConfig'

type AlertLevel = 'normal' | 'level3' | 'level2' | 'level1'

interface DeviceInfo {
  device_id: string
  device_name: string
  device_type?: 'acc' | 'strain' | string
}

interface AlertRecord {
  device_id?: string
  device_name?: string
  time?: string
  data?: number | string
  direction?: string
  min?: number | string
  max?: number | string
  alert_level?: string
  level?: string
  [key: string]: unknown
}

interface TableRow extends AlertRecord {
  device_id: string
  device_name: string
  actual_value: number | null
  standard_value: number | null
  deviation: number | null
  alert_level: AlertLevel
}

interface AbnormalResponse {
  status?: string
  message?: string
  data?: AlertRecord[]
  total?: number | string
}

const router = useRouter()
const apiServerUrl = 'http://8.153.161.229:8009'

const loading = ref(false)
const deviceOnlineStatus = ref<Record<string, boolean>>({})
const chartData = ref<TableRow[]>([])
const selectedLevel = ref('all')
const paginationTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)

const defaultDeviceList: DeviceInfo[] = [
  { device_id: '14B0F67E', device_name: '安楼外幕墙1C', device_type: 'acc' },
  { device_id: '55DA00B5', device_name: '安楼外幕墙2D', device_type: 'acc' },
  { device_id: '87C3D4E4', device_name: '安楼外幕墙1A', device_type: 'acc' },
  { device_id: '9A0D1958', device_name: '安楼外幕墙2E', device_type: 'acc' },
  { device_id: '1A193E69', device_name: '安楼外幕墙1B', device_type: 'acc' },
  { device_id: 'F853ED49', device_name: '安楼外幕墙2F', device_type: 'acc' },
  { device_id: '4787BE3A', device_name: '衷和楼测点7', device_type: 'acc' },
  { device_id: '612B04ED', device_name: '衷和楼#1H', device_type: 'acc' },
  { device_id: '8361D7CD', device_name: '衷和楼#2I', device_type: 'acc' },
  { device_id: '8850A7D7', device_name: '衷和楼#2J', device_type: 'acc' },
  { device_id: 'E884C99D', device_name: '衷和楼#1G', device_type: 'acc' },
  { device_id: '0002', device_name: '安楼外幕墙2Y', device_type: 'strain' },
  { device_id: '0020', device_name: '衷和楼#2Y', device_type: 'strain' }
]

const deviceList = ref<DeviceInfo[]>(defaultDeviceList)

const levelOptions = [
  { value: 'all', label: '全部等级' },
  { value: 'level1', label: '一级预警' },
  { value: 'level2', label: '二级预警' },
  { value: 'level3', label: '三级预警' },
  { value: 'normal', label: '普通异常' }
]

const directionLabels: Record<string, string> = {
  all: '全部方向',
  x_above_max: 'X轴超过最大值',
  x_below_min: 'X轴低于最小值',
  y_above_max: 'Y轴超过最大值',
  y_below_min: 'Y轴低于最小值',
  z_above_max: 'Z轴超过最大值',
  z_below_min: 'Z轴低于最小值',
  ch1_above_max: 'CH1超过最大值',
  ch1_below_min: 'CH1低于最小值',
  ch2_above_max: 'CH2超过最大值',
  ch2_below_min: 'CH2低于最小值'
}

const cascaderProps = {
  expandTrigger: 'hover' as const,
  value: 'value',
  label: 'label',
  children: 'children',
  multiple: false,
  checkStrictly: false
}

const directionProps = {
  expandTrigger: 'hover' as const,
  value: 'value',
  label: 'label',
  children: 'children',
  multiple: false,
  checkStrictly: false
}

const directionOptions = [
  {
    label: '全部方向',
    value: 'all_group',
    type: 'all',
    children: [{ label: '全部方向', value: 'all' }]
  },
  {
    label: 'X轴',
    value: 'x',
    type: 'vibration',
    children: [
      { label: '超过最大值', value: 'x_above_max' },
      { label: '低于最小值', value: 'x_below_min' }
    ]
  },
  {
    label: 'Y轴',
    value: 'y',
    type: 'vibration',
    children: [
      { label: '超过最大值', value: 'y_above_max' },
      { label: '低于最小值', value: 'y_below_min' }
    ]
  },
  {
    label: 'Z轴',
    value: 'z',
    type: 'vibration',
    children: [
      { label: '超过最大值', value: 'z_above_max' },
      { label: '低于最小值', value: 'z_below_min' }
    ]
  },
  {
    label: 'CH1',
    value: 'ch1',
    type: 'strain',
    children: [
      { label: '超过最大值', value: 'ch1_above_max' },
      { label: '低于最小值', value: 'ch1_below_min' }
    ]
  },
  {
    label: 'CH2',
    value: 'ch2',
    type: 'strain',
    children: [
      { label: '超过最大值', value: 'ch2_above_max' },
      { label: '低于最小值', value: 'ch2_below_min' }
    ]
  }
]

const params = reactive({
  device: [] as string[],
  direction: [] as string[],
  start_time: '',
  end_time: ''
})

const getApiBaseUrl = () => apiServerUrl

const getDeviceId = (deviceValue: unknown): string => {
  if (!deviceValue) return ''
  if (Array.isArray(deviceValue)) {
    return String(deviceValue[deviceValue.length - 1] || '')
  }
  return String(deviceValue)
}

const getDirectionValue = (directionValue: unknown): string => {
  if (!directionValue) return ''
  if (Array.isArray(directionValue)) {
    return String(directionValue[directionValue.length - 1] || '')
  }
  return String(directionValue)
}

const isStrainDevice = (device: DeviceInfo | undefined) =>
  device?.device_type === 'strain' ||
  device?.device_name.includes('Y') ||
  ['0002', '0020', '011A', '0075'].includes(device?.device_id || '')

const isStrainDeviceId = (deviceId: string) =>
  isStrainDevice(deviceList.value.find(device => device.device_id === deviceId))

const getDeviceNameById = (deviceId: string): string => {
  const device = deviceList.value.find(item => item.device_id === deviceId)
  return device ? device.device_name : ''
}

const getFallbackDeviceId = (deviceName: string): string => {
  const device = defaultDeviceList.find(item => item.device_name === deviceName)
  return device?.device_id || deviceName
}

const getDeviceGroupPath = (device: DeviceInfo): string[] => {
  if (isStrainDevice(device)) return ['应力计设备', device.device_id]
  if (device.device_name.includes('衷和楼') || device.device_name.includes('综合楼')) {
    return ['衷和楼设备', device.device_id]
  }
  return ['安楼设备', device.device_id]
}

const getDefaultDirectionPath = (deviceId: string): string[] =>
  isStrainDeviceId(deviceId) ? ['ch1', 'ch1_above_max'] : ['y', 'y_above_max']

const hasCompleteQueryParams = computed(() =>
  Boolean(
    getDeviceId(params.device) &&
    getDirectionValue(params.direction) &&
    params.start_time &&
    params.end_time
  )
)

const cascaderDevices = computed(() => {
  const mapDevice = (device: DeviceInfo) => ({
    label: device.device_name,
    value: device.device_id,
    online: deviceOnlineStatus.value[device.device_id] ?? true
  })

  const anlouDevices = deviceList.value
    .filter(device => device.device_name.includes('安楼') && !isStrainDevice(device))
    .map(mapDevice)

  const zhongheDevices = deviceList.value
    .filter(device =>
      (device.device_name.includes('衷和楼') || device.device_name.includes('综合楼')) &&
      !isStrainDevice(device)
    )
    .map(mapDevice)

  const strainDevices = deviceList.value
    .filter(device => isStrainDevice(device))
    .map(mapDevice)

  return [
    { label: '安楼设备', value: '安楼设备', children: anlouDevices },
    { label: '衷和楼设备', value: '衷和楼设备', children: zhongheDevices },
    { label: '应力计设备', value: '应力计设备', children: strainDevices }
  ].filter(group => group.children.length > 0)
})

const filteredDirectionOptions = computed(() => {
  const deviceId = getDeviceId(params.device)
  if (!deviceId) return directionOptions

  const type = isStrainDeviceId(deviceId) ? 'strain' : 'vibration'
  return directionOptions.filter(option => option.type === 'all' || option.type === type)
})

const normalizeDeviceFromApi = (rawDevice: unknown): DeviceInfo | null => {
  if (!rawDevice || typeof rawDevice !== 'object') return null

  const raw = rawDevice as Record<string, unknown>
  const deviceName = String(raw.device_name || raw.name || '')
  if (!deviceName) return null

  const fallbackId = getFallbackDeviceId(deviceName)
  const deviceId = String(raw.device_id || raw.id || fallbackId)
  const deviceType = String(raw.device_type || raw.type || '')

  return {
    device_id: deviceId,
    device_name: deviceName,
    device_type: deviceType || (deviceName.includes('Y') ? 'strain' : 'acc')
  }
}

const fetchDeviceList = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/data/get_device_list`)
    if (!response.ok) return

    const result = await response.json()
    const rawDevices = Array.isArray(result?.data) ? result.data : []
    const devices = rawDevices
      .map((item: unknown) => normalizeDeviceFromApi(item))
      .filter((item: DeviceInfo | null): item is DeviceInfo => Boolean(item))

    if (devices.length > 0) {
      deviceList.value = devices
    }
  } catch (error) {
    console.warn('获取后端设备列表失败，使用前端默认设备列表', error)
  }

  const selectedDeviceId = getDeviceId(params.device)
  if (!selectedDeviceId || !deviceList.value.some(device => device.device_id === selectedDeviceId)) {
    const defaultDevice =
      deviceList.value.find(device => device.device_id === '55DA00B5') ||
      deviceList.value.find(device => device.device_name.includes('安楼') && !isStrainDevice(device)) ||
      deviceList.value[0]

    if (defaultDevice) {
      params.device = getDeviceGroupPath(defaultDevice)
      params.direction = getDefaultDirectionPath(defaultDevice.device_id)
    }
  }
}

const resetCurrentResult = () => {
  currentPage.value = 1
  chartData.value = []
  paginationTotal.value = 0
}

const deviceMatchesDirection = (deviceId: string, direction: string) => {
  if (direction === 'all') return true
  const directionIsStrain = direction.startsWith('ch')
  return isStrainDeviceId(deviceId) === directionIsStrain
}

watch(
  () => params.device,
  newDevice => {
    const deviceId = getDeviceId(newDevice)
    if (!deviceId) return

    const directionValue = getDirectionValue(params.direction)
    if (directionValue && !deviceMatchesDirection(deviceId, directionValue)) {
      params.direction = getDefaultDirectionPath(deviceId)
    }
  },
  { deep: true }
)

watch(
  () => [params.device, params.direction, selectedLevel.value, params.start_time, params.end_time],
  resetCurrentResult,
  { deep: true }
)

const getDirectionLabel = (direction: string): string =>
  directionLabels[direction] || direction

const formatMetric = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '--'

const normalizeAlertLevel = (level: unknown): AlertLevel | null => {
  if (level === 'normal' || level === 'level1' || level === 'level2' || level === 'level3') {
    return level
  }
  return null
}

const getAlertLabel = (level: AlertLevel) => getAlertLevelLabel(level)

const getAlertLevelTag = (level: AlertLevel) => getAlertLevelTagType(level)

const enrichAlertRecord = (record: AlertRecord, fallbackDeviceName: string): TableRow => {
  const deviceName = String(record.device_name || fallbackDeviceName)
  const metrics = deriveAlertMetrics(record, getVibrationAlertConfig(deviceName))
  const backendLevel = normalizeAlertLevel(record.alert_level || record.level)
  const deviceId = String(record.device_id || getFallbackDeviceId(deviceName))

  return {
    ...record,
    device_id: deviceId,
    device_name: deviceName,
    actual_value: metrics.actualValue,
    standard_value: metrics.standardValue,
    deviation: metrics.deviation,
    alert_level: backendLevel || metrics.level
  }
}

const fetchAbnormalRecords = async (
  deviceName: string,
  options: { page?: number; pageSize?: number } = {}
) => {
  const directionValue = getDirectionValue(params.direction)
  if (!directionValue) throw new Error('无效的方向值')

  const queryParams = {
    device: deviceName,
    direction: directionValue,
    level: selectedLevel.value,
    start_time: params.start_time,
    end_time: params.end_time,
    page: String(options.page || currentPage.value),
    page_size: String(options.pageSize || pageSize.value)
  }

  const apiUrl = `${getApiBaseUrl()}/data/get_abnormal_data?${new URLSearchParams(queryParams).toString()}`
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  const result = (await response.json()) as AbnormalResponse
  if (result.status === 'error') {
    throw new Error(result.message || '获取数据失败')
  }

  const records = Array.isArray(result.data) ? result.data : []
  const total = Number(result.total ?? records.length)

  return {
    records,
    total: Number.isFinite(total) ? total : records.length
  }
}

const fetchData = async () => {
  loading.value = true
  chartData.value = []

  try {
    const deviceId = getDeviceId(params.device)
    if (!deviceId) throw new Error('无效的设备ID')

    const deviceName = getDeviceNameById(deviceId)
    if (!deviceName) throw new Error('未找到设备名称')

    const { records, total } = await fetchAbnormalRecords(deviceName)
    paginationTotal.value = total
    chartData.value = records.map(record => enrichAlertRecord(record, deviceName))

    if (chartData.value.length === 0) {
      ElMessage.info('查询结果为空，未找到符合条件的数据')
    }
  } catch (err) {
    console.error('请求失败:', err)
    paginationTotal.value = 0
    ElMessage.error(err instanceof Error ? err.message : '获取数据失败')
  } finally {
    loading.value = false
  }
}

const validateQueryParams = () => {
  if (!getDeviceId(params.device)) {
    ElMessage.warning('请选择设备')
    return false
  }
  if (!getDirectionValue(params.direction)) {
    ElMessage.warning('请选择异常方向')
    return false
  }
  if (!params.start_time) {
    ElMessage.warning('请选择开始时间')
    return false
  }
  if (!params.end_time) {
    ElMessage.warning('请选择结束时间')
    return false
  }
  if (new Date(params.start_time) > new Date(params.end_time)) {
    ElMessage.warning('开始时间不能晚于结束时间')
    return false
  }
  return true
}

const handleSearch = async () => {
  if (!validateQueryParams()) return
  currentPage.value = 1
  await fetchData()
}

const handlePageSizeChange = async () => {
  currentPage.value = 1
  await fetchData()
}

const handleDeviceChange = (val: unknown) => {
  params.device = Array.isArray(val) ? val.map(String) : [String(val)]
  const deviceId = getDeviceId(params.device)
  const directionValue = getDirectionValue(params.direction)

  if (deviceId && directionValue && !deviceMatchesDirection(deviceId, directionValue)) {
    params.direction = getDefaultDirectionPath(deviceId)
  }
}

const handleDirectionChange = (val: unknown) => {
  params.direction = Array.isArray(val) ? val.map(String) : [String(val)]
}

const escapeCsvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const exportRowsToCsv = (rows: TableRow[], deviceId: string) => {
  const headers = [
    '设备ID',
    '设备名称',
    '时间',
    '预警等级',
    '实际值',
    '标准值',
    '绝对差',
    '方向',
    '最小阈值',
    '最大阈值'
  ]

  const csvRows = rows.map(row => [
    row.device_id,
    row.device_name,
    row.time || '',
    getAlertLabel(row.alert_level),
    formatMetric(row.actual_value),
    formatMetric(row.standard_value),
    formatMetric(row.deviation),
    getDirectionLabel(String(row.direction || '')),
    row.min ?? '',
    row.max ?? ''
  ])

  const csvContent = [headers, ...csvRows]
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `异常数据_${deviceId}_${formatLocalDate(new Date())}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const fetchAllAbnormalRowsForExport = async (deviceName: string) => {
  const exportPageSize = 500
  const rows: TableRow[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while (rows.length < total) {
    const result = await fetchAbnormalRecords(deviceName, {
      page,
      pageSize: exportPageSize
    })

    total = result.total
    rows.push(...result.records.map(record => enrichAlertRecord(record, deviceName)))

    if (result.records.length < exportPageSize || result.records.length === 0) break
    page += 1
  }

  return rows
}

const downloadData = async () => {
  if (!validateQueryParams()) return

  loading.value = true
  try {
    const deviceId = getDeviceId(params.device)
    const deviceName = getDeviceNameById(deviceId)
    if (!deviceName) throw new Error('未找到设备名称')

    const rows = await fetchAllAbnormalRowsForExport(deviceName)
    if (rows.length === 0) {
      ElMessage.info('当前筛选条件下没有可导出的数据')
      return
    }

    exportRowsToCsv(rows, deviceId)
    ElMessage.success(`已导出 ${rows.length} 条异常数据`)
  } catch (err) {
    console.error('下载失败:', err)
    ElMessage.error(err instanceof Error ? err.message : '下载失败')
  } finally {
    loading.value = false
  }
}

const updateDeviceOnlineStatus = () => {
  deviceList.value.forEach(device => {
    deviceOnlineStatus.value[device.device_id] = true
  })
}

const handleResize = () => {
  // 保留窗口监听入口，后续如果恢复图表视图可以直接接入 resize。
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatLocalDateTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${formatLocalDate(date)} ${hours}:${minutes}:${seconds}`
}

onMounted(async () => {
  await fetchDeviceList()

  const end = new Date()
  const start = sub(end, { days: 7 })
  params.start_time = formatLocalDateTime(start)
  params.end_time = formatLocalDateTime(end)

  window.addEventListener('resize', handleResize)
  updateDeviceOnlineStatus()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const startDateShortcuts = [
  {
    text: '一个月前',
    value: () => {
      const date = new Date()
      date.setMonth(date.getMonth() - 1)
      return date
    }
  },
  {
    text: '一周前',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24 * 7)
      return date
    }
  },
  {
    text: '昨天',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24)
      return date
    }
  },
  {
    text: '2023年1月1日',
    value: () => new Date('2023-01-01T00:00:00')
  }
]

const endDateShortcuts = [
  {
    text: '现在',
    value: () => new Date()
  },
  {
    text: '昨天',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24)
      return date
    }
  },
  {
    text: '一周前',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() - 3600 * 1000 * 24 * 7)
      return date
    }
  }
]

const disabledStartDate = (time: Date) => {
  const earliestDate = new Date('2023-01-01T00:00:00')
  const latestDate = new Date()
  return time.getTime() < earliestDate.getTime() || time.getTime() > latestDate.getTime()
}

const disabledEndDate = (time: Date) => {
  let earliestDate = new Date('2023-01-01T00:00:00')
  if (params.start_time) {
    earliestDate = new Date(params.start_time)
  }

  const latestDate = new Date()
  return time.getTime() < earliestDate.getTime() || time.getTime() > latestDate.getTime()
}
</script>

<style scoped>
.el-date-editor.el-input,
.el-date-editor.el-input__wrapper {
  width: 100%;
}

.table-container {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 0 auto;
  width: 90%;
}

:deep(.el-table) {
  width: 100% !important;
}

.el-table {
  margin-top: 1rem;
}

.el-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 500;
  text-align: center;
}

.el-table td {
  padding: 8px 0;
  text-align: center;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #dcdfe6;
  border-radius: 4px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: #f5f7fa;
}

:deep(.el-table .cell) {
  text-align: center;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.pagination-total {
  color: #606266;
  font-size: 14px;
}
</style>
