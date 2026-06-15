<template>
  <div class="cluster-container">
    <!-- 标题和操作区 -->
    <div class="cluster-header">
      <h2>幕墙数据聚类分析</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="runClusterAnalysis" :loading="loading">
          <el-icon><refresh /></el-icon>
          <span>执行聚类分析</span>
        </el-button>
        <el-button @click="exportImage" class="export-btn">
          <el-icon><download /></el-icon>
          <span>导出图片并上传为报告素材</span>
        </el-button>
        <el-button 
          type="primary" 
          @click="exportBatchLists"
          :disabled="!hasClusterData"
          size="small"
          class="batch-export-btn"
        >
          <el-icon><Document /></el-icon>
          <span>导出批次名单</span>
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="cluster-content">
      <el-card shadow="hover" class="control-panel">
        <div class="panel-header">
          <el-icon><setting /></el-icon>
          <span>分析参数配置</span>
        </div>
        
        <el-form label-width="120px" label-position="left" :model="clusterParams" class="analysis-form">
          <el-form-item label="选择分析任务" prop="job_id">
            <div class="job-select-wrapper">
              <el-tag v-if="selectedJob" closable @close="selectedJob = null" class="job-tag">
                {{ selectedJob.job_name }}
              </el-tag>
              <el-button v-else type="primary" @click="showJobDialog" class="job-select-btn">
                <el-icon><plus /></el-icon>
                <span>选择分析任务</span>
              </el-button>
            </div>

            <el-dialog
              title="选择分析任务"
              v-model="jobDialogVisible"
              :width="dialogWidth"
            >
              <JobsView 
                v-if="jobDialogVisible"
                @job-selected="handleJobSelected"
                key="job-selector"
              />
            </el-dialog>
          </el-form-item>
          
          <!-- 聚类参数配置 -->
          <el-form-item label="聚类数量">
            <el-input-number 
              v-model="clusterParams.num_clusters" 
              :min="2" 
              :max="10" 
              controls-position="right"
            />
          </el-form-item>
          
          <el-form-item label="降维方式">
            <el-radio-group v-model="clusterParams.use_pca" class="radio-group">
              <el-radio-button :label="true">PCA降维</el-radio-button>
              <el-radio-button :label="false">原始特征</el-radio-button>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="降维维度" v-if="clusterParams.use_pca">
            <el-input-number 
              v-model="clusterParams.n_components" 
              :min="2" 
              :max="5" 
              controls-position="right"
            />
          </el-form-item>
          
          <el-form-item label="标准化方法">
            <el-select v-model="clusterParams.scaling_method" style="width: 100%">
              <el-option label="Z-score标准化" value="standard" />
              <el-option label="Min-Max归一化" value="minmax" />
              <el-option label="不标准化" value="none" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="聚类算法">
            <el-select v-model="clusterParams.algorithm" style="width: 100%">
              <el-option label="DBSCAN" value="dbscan" />
              <el-option label="K-means" value="kmeans" />
              <el-option label="层次聚类" value="hierarchical" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="颜色方案">
            <el-select v-model="clusterParams.color_scheme" style="width: 100%">
              <el-option
                v-for="scheme in colorSchemes"
                :key="scheme.value"
                :label="scheme.label"
                :value="scheme.value"
              >
                <div class="color-scheme-option">
                  <span class="scheme-label">{{ scheme.label }}</span>
                  <span class="scheme-preview" :style="`background: ${scheme.preview}`"></span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="显示批次号">
            <el-switch v-model="clusterParams.show_batch" />
          </el-form-item>
          
          <el-form-item label="显示中心点">
            <el-switch v-model="clusterParams.show_centroids" />
          </el-form-item>

          <el-form-item label="搜索">
            <el-input
              v-model="searchBatch"
              placeholder="输入批次号搜索"
              clearable
              style="width: 200px; margin-right: 10px"
              @keyup.enter="highlightBatch"
            >
              <template #append>
                <el-button @click="highlightBatch" class="search-btn">
                  <el-icon><search /></el-icon>
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
        
      </el-card>
      
      <!-- 聚类分析绘制区 -->
      <div class="visualization-area">
        <el-card shadow="hover" class="cluster-card">
          <div class="card-header">
            <div class="title">幕墙数据聚类分析图</div>
            <div class="subtitle" v-if="selectedJob">
              当前任务: {{ selectedJob.job_name }} | 
              更新时间: {{ formatDateTime(lastUpdated) }}
            </div>
            <div class="cluster-stats" v-if="clusterStats">
              <el-tag 
                v-for="(stat, idx) in clusterStats" 
                :key="idx"
                :color="getClusterColor(idx)"
                class="stat-tag"
              >
                类{{ idx }}: {{ stat.count }}个样本 ({{ stat.percentage }}%)
              </el-tag>
            </div>
          </div>
          <div class="cluster-wrapper">
            <div ref="clusterChart" class="cluster-chart">            
              <el-empty
                description="请先选择分析任务并设置参数"
                :image-size="120"
                v-if="!hasClusterData"
              />
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Setting, Plus, Document, Search } from '@element-plus/icons-vue'
import { formatDateTime } from '../utils/format'
import JobsView from '../views/AnalysisJobView.vue'
import axios from 'axios'
import { apiUrl } from '../config'
import 'echarts-gl'

// 图表实例
let chartInstance: echarts.ECharts | null = null

// 数据相关
const loading = ref(false)
const selectedJob = ref<any>(null)
const hasClusterData = ref(false)
const lastUpdated = ref('')
const clusterStats = ref<any[]>([])
const clusterResult = ref<any>(null) 

// 聚类参数
const clusterParams = ref({
  num_clusters: 3,
  use_pca: true,
  n_components: 3,
  scaling_method: 'standard',
  algorithm: 'dbscan',
  color_scheme: 'viridis',
  show_batch: true,
  show_centroids: true
})

// 颜色方案选项
const colorSchemes = ref([
  {
    label: 'Viridis',
    value: 'viridis',
    preview: 'linear-gradient(to right, #440154, #482475, #414487, #355f8d, #2a788e, #21908d, #22a884, #42be71, #7ad151, #bddf26, #bddf26)'
  },
  {
    label: 'Plasma',
    value: 'plasma',
    preview: 'linear-gradient(to right, #0d0887, #46039f, #7201a8, #9c179e, #bd3786, #d8576b, #ed7953, #fb9f3a, #fdca26, #f0f921)'
  },
  {
    label: 'Inferno',
    value: 'inferno',
    preview: 'linear-gradient(to right, #000004, #1b0c41, #4a0c6b, #781c6d, #a52c60, #cf4446, #ed6925, #fb9b06, #f7d13d, #fcffa4)'
  },
  {
    label: 'Magma',
    value: 'magma',
    preview: 'linear-gradient(to right, #000004, #180f3d, #440f76, #721f81, #9e2f7f, #cd4071, #f1605d, #fd9668, #feca8d, #fcfdbf)'
  },
  {
    label: '热力红黄',
    value: 'red-yellow',
    preview: 'linear-gradient(to right, #fff7ec, #fee8c8, #fdd49e, #fdbb84, #fc8d59, #ef6548, #d7301f, #b30000, #7f0000)'
  }
])

// DOM 引用
const clusterChart = ref<HTMLElement | null>(null)

// 对话框控制
const jobDialogVisible = ref(false)
const showJobDialog = () => {
  jobDialogVisible.value = true
}

// 响应式对话框宽度
const dialogWidth = computed(() => {
  const screenWidth = window.innerWidth;
  return screenWidth > 1600 ? '80%' : screenWidth > 1200 ? '70%' : '90%';
});

const handleJobSelected = (row: any) => {
  if (!row) {
    selectedJob.value = null
    jobDialogVisible.value = false
    return
  }

  // 验证任务状态
  if (row.status !== 'completed') {
    ElMessage.warning('只能选择状态为"已完成"的任务')
    return
  }

  selectedJob.value = row
  jobDialogVisible.value = false
}

// 执行聚类分析
const runClusterAnalysis = async () => {
  if (!selectedJob.value) {
    ElMessage.warning('请先选择分析任务')
    return
  }

  try {
    loading.value = true
    hasClusterData.value = false

    const params = {
      dataset_id: selectedJob.value.dataset,
      job_id: selectedJob.value.id,
      ...clusterParams.value
    }

    const response = await axios.post(`${apiUrl}/visualization/clustering/`, params)
    
    // 存储聚类结果
    clusterResult.value = response.data.data
    drawClusterChart(clusterResult.value)
    
    // 更新统计信息
    updateClusterStats(clusterResult.value.labels)
    
    lastUpdated.value = new Date().toISOString()
    hasClusterData.value = true
    
    ElMessage.success('聚类分析完成')
  } catch (error) {
    console.error('聚类分析失败:', error)
    ElMessage.error('聚类分析失败，请检查参数设置')
  } finally {
    loading.value = false
  }
}

// 绘制聚类图表
const drawClusterChart = (clusterData: any) => {
  if (!clusterChart.value) return
  
  // 初始化或获取 ECharts 实例
  if (!chartInstance) {
    chartInstance = echarts.init(clusterChart.value)
  } else {
    chartInstance.clear()
  }

  const points = clusterData.points
  const centroids = clusterData.centroids
  const is3D = points.length > 0 && points[0].coords.length === 3

  // 按 cluster label 分组点
  const dataByCluster: Record<number, any[]> = {}
  points.forEach((pt: any) => {
    if (!dataByCluster[pt.label]) {
      dataByCluster[pt.label] = []
    }
    dataByCluster[pt.label].push({
      value: pt.coords,
      name: pt.batch,
      label: pt.label
    })
  })

  // 生成颜色列表
  const colors = getColorRange()
  
  // 为每个聚类创建系列
  const clusterSeries = Object.entries(dataByCluster).map(([label, clusterPoints], index) => ({
    name: `类 ${label}`,
    type: is3D ? 'scatter3D' : 'scatter',
    symbolSize: 12,
    data: clusterPoints,
    itemStyle: {
      color: colors[index % colors.length]
    },
    emphasis: {
      label: {
        show: clusterParams.value.show_batch,
        formatter: (p: any) => p.data.name,
        position: 'top'
      }
    }
  }))

  // 添加聚类中心
  let centroidSeries: any[] = []
  if (clusterParams.value.show_centroids) {
    centroidSeries = [{
      name: '中心点',
      type: is3D ? 'scatter3D' : 'scatter',
      data: centroids.map((c: any, i: number) => ({
        value: c,
        name: `中心点 ${i}`
      })),
      symbolSize: 18,
      itemStyle: {
        color: '#000',
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: (p: any) => p.data.name,
        position: 'bottom',
        color: '#000'
      }
    }]
  }

  // 基础选项
  const baseOption = {
    title: {
      text: `聚类分析结果（${clusterParams.value.use_pca ? 'PCA降维' : '原始特征'}）`,
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const point = params.data
        return `
          <div style="font-weight:bold">${params.seriesName}</div>
          <div>批次: ${point.name}</div>
          <div>坐标: [${point.value.map((n: number) => n.toFixed(2)).join(', ')}]</div>
        `
      }
    },
    legend: {
      top: 30,
      data: [...Object.keys(dataByCluster).map(label => `类 ${label}`), ...(clusterParams.value.show_centroids ? ['中心点'] : [])]
    },
    toolbox: {
      feature: {
        saveAsImage: {
          title: '保存图片',
          pixelRatio: 2
        },
        dataZoom: {
          title: {
            zoom: '区域缩放',
            back: '缩放还原'
          }
        },
        restore: {
          title: '还原'
        }
      }
    }
  }

  // 2D选项
  const option2D = {
    ...baseOption,
    xAxis: {
      name: clusterParams.value.use_pca ? 'PCA 1' : '特征1',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      name: clusterParams.value.use_pca ? 'PCA 2' : '特征2',
      nameLocation: 'middle',
      nameGap: 30
    },
    series: [...clusterSeries, ...centroidSeries]
  }

  // 3D选项
  const option3D = {
    ...baseOption,
    grid3D: {
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 10,
        distance: 120
      }
    },
    xAxis3D: {
      name: clusterParams.value.use_pca ? 'PCA 1' : '特征1',
      type: 'value'
    },
    yAxis3D: {
      name: clusterParams.value.use_pca ? 'PCA 2' : '特征2',
      type: 'value'
    },
    zAxis3D: {
      name: clusterParams.value.use_pca ? 'PCA 3' : '特征3',
      type: 'value'
    },
    series: [...clusterSeries, ...centroidSeries]
  }

  // 根据维度设置选项
  const finalOption = is3D ? option3D : option2D

  // 如果是3D，需要引入3D组件
  if (is3D) {
    import('echarts-gl').then(() => {
      chartInstance?.setOption(finalOption)
    })
  } else {
    chartInstance?.setOption(finalOption)
  }

  // 在设置完图表后，如果有高亮点，重新高亮它
  if (highlightedPoint.value) {
    nextTick(() => {
      highlightBatch()
    })
  }
}

// 更新聚类统计信息
const updateClusterStats = (labels: number[]) => {
  const total = labels.length
  const counts = new Array(clusterParams.value.num_clusters).fill(0)
  
  labels.forEach(label => {
    counts[label]++
  })
  
  clusterStats.value = counts.map(count => ({
    count,
    percentage: ((count / total) * 100).toFixed(1)
  }))
}

// 获取类别的颜色
const getClusterColor = (index: number) => {
  const colors = getColorRange()
  return colors[index % colors.length]
}

// 获取颜色范围
const getColorRange = () => {
  switch (clusterParams.value.color_scheme) {
    case 'viridis': return ['#440154', '#482475', '#414487', '#355f8d', '#2a788e', '#21908d', '#22a884', '#42be71', '#7ad151', '#bddf26']
    case 'plasma': return ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921']
    case 'inferno': return ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4']
    case 'magma': return ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#feca8d', '#fcfdbf']
    case 'red-yellow': return ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000']
    default: return ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027']
  }
}

// 导出图片
const exportImage = async () => {
  if (!chartInstance) {
    ElMessage.warning('请先生成聚类分析图')
    return
  }

  if (!selectedJob.value?.id) {
    ElMessage.error('请先选择关联的分析任务')
    return
  }

  const loading = ElMessage.info('正在处理图片...')

  try {
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
      excludeComponents: ['toolbox']
    })

    const blob = await fetch(url).then(res => res.blob())
    const fileName = `cluster_${selectedJob.value.id}_${Date.now()}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const formData = new FormData()
    formData.append('job_id', selectedJob.value.id)
    formData.append('cluster', file)

    // 同时执行下载和上传
    await Promise.all([
      // 本地下载
      new Promise<void>((resolve) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `聚类分析_${selectedJob.value.name || '未命名'}_${formatDateTime(new Date())}.png`
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
          resolve()
        }, 100)
      }),
      
      // 服务器上传
      axios.post(`${apiUrl}/visualization/upload/cluster/${selectedJob.value.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      })
    ])

    ElMessage.success({
      message: `聚类分析图保存成功！`,
      duration: 5000
    })
    
  } catch (error) {
    console.error('导出/上传失败:', error)
    
    let errorMessage = '操作失败'
    if (error.response) {
      errorMessage = `服务器错误: ${error.response.data.error || error.response.statusText}`
    } else if (error.request) {
      errorMessage = '网络连接异常，请检查网络'
    }

    ElMessage.error({
      message: errorMessage,
      duration: 5000
    })
    
  } finally {
    loading.close()
  }
}

const exportBatchLists = (format = 'csv') => {
  if (!clusterResult.value?.points) {
    ElMessage.warning('没有可导出的聚类结果')
    return
  }

  // 添加导出锁定防止重复点击
  const exportLock = ref(false)
  if (exportLock.value) return
  exportLock.value = true

  try {
    // 生成更规范的文件名
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-')
    const jobName = selectedJob.value?.job_name.replace(/[^\w]/g, '_') || '未命名任务'
    
    // 分组数据
    const batchesByCluster: Record<string, string[]> = {}
    clusterResult.value.points.forEach((point: any) => {
      const label = `类${point.label}`
      batchesByCluster[label] = batchesByCluster[label] || []
      batchesByCluster[label].push(point.batch)
    })

    let content: string
    let extension: string
    
    if (format === 'csv') {
      // 生成带标题的CSV
      content = Object.entries(batchesByCluster)
        .map(([label, batches]) => 
          batches.map(batch => `${label},${batch}`).join('\n')
        )
        .join('\n')
      content = '聚类标签,批次号\n' + content
      extension = 'csv'
    } else {
      // JSON格式
      content = JSON.stringify({
        meta: {
          export_time: now.toISOString(),
          job_name: jobName,
          total_clusters: Object.keys(batchesByCluster).length,
          total_batches: clusterResult.value.points.length
        },
        data: batchesByCluster
      }, null, 2)
      extension = 'json'
    }

    // 使用改进后的下载方法
    downloadFile(
      content,
      format === 'csv' ? 'text/csv' : 'application/json',
      `幕墙聚类_${jobName}_${timestamp}.${extension}`
    )

    ElMessage.success({
      message: `导出成功，请查看下载文件`,
      duration: 3000,
      showClose: true
    })

  } catch (error) {
    console.error('导出错误:', error)
    ElMessage.error({
      message: `导出失败: ${error instanceof Error ? error.message : String(error)}`,
      duration: 5000
    })
  } finally {
    exportLock.value = false
  }
}

const downloadFile = (content: string, mimeType: string, filename: string) => {
  // 添加UTF-8 BOM头（解决中文乱码）
  if (mimeType.includes('csv')) {
    content = '\uFEFF' + content
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  
  // 创建隐藏iframe方式（兼容更多浏览器）
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  
  // 同时保留a标签点击方式
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  
  // 延迟清理
  setTimeout(() => {
    document.body.removeChild(iframe)
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

// 响应式调整
const handleResize = () => {
  chartInstance?.resize()
}

// 批次搜索相关
const searchBatch = ref('')
const highlightedPoint = ref<any>(null)

// 高亮显示指定批次
const highlightBatch = () => {
  if (!searchBatch.value || !clusterResult.value?.points || !chartInstance) {
    return
  }

  // 查找匹配的批次
  const foundPoint = clusterResult.value.points.find(
    (p: any) => p.batch === searchBatch.value
  )

  if (!foundPoint) {
    ElMessage.warning(`未找到批次号: ${searchBatch.value}`)
    return
  }

  highlightedPoint.value = foundPoint

  // 获取当前选项
  const option = chartInstance.getOption()

  // 添加高亮点系列
  const highlightSeries = {
    name: '高亮点',
    type: option.series[0].type, // 保持与主系列相同的类型
    data: [{
      value: foundPoint.coords,
      name: foundPoint.batch
    }],
    symbolSize: 20,
    itemStyle: {
      color: '#FF0000',
      borderColor: '#FFFFFF',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}',
      position: 'top',
      color: '#FF0000',
      fontSize: 14,
      fontWeight: 'bold'
    },
    emphasis: {
      scale: 1.5
    }
  }

  // 移除之前的高亮点系列（如果有）
  const existingHighlightIndex = option.series.findIndex(
    (s: any) => s.name === '高亮点'
  )

  if (existingHighlightIndex >= 0) {
    option.series.splice(existingHighlightIndex, 1)
  }

  option.series.push(highlightSeries)
  chartInstance.setOption(option)

  // 如果是3D图表，调整视角到该点
  if (foundPoint.coords.length === 3) {
    chartInstance.dispatchAction({
      type: 'highlight',
      seriesIndex: option.series.length - 1,
      dataIndex: 0
    })
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

// 监听参数变化
watch(clusterParams, () => {
  if (hasClusterData.value) {
    runClusterAnalysis()
  }
}, { deep: true })
</script>

<style scoped lang="scss">
.cluster-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;

    h2 {
      font-size: 20px;
      color: #1d2129;
      margin: 0;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 12px;

      .export-btn {
        color: #409eff;
        border-color: #409eff;
        background-color: #ecf5ff;

        &:hover {
          background-color: #e6f2ff;
          color: #3a8ee6;
          border-color: #3a8ee6;
        }
      }

      .batch-export-btn {
        background-color: #f0f7ff;
        border-color: #c6e2ff;
        color: #409eff;

        &:hover {
          background-color: #ecf5ff;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }
  }

  .cluster-content {
    flex: 1;
    display: flex;
    gap: 20px;
    height: calc(100% - 70px);

    .control-panel {
      width: 360px;
      flex-shrink: 0;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      :deep(.el-card__body) {
        padding: 20px;
      }

      .panel-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 500;
        color: #1d2129;

        .el-icon {
          margin-right: 8px;
          color: #409eff;
        }
      }

      .analysis-form {
        .job-select-wrapper {
          width: 100%;
          position: relative;

          .job-tag {
            width: 100%;
            text-align: left;
            padding: 8px 12px;
            font-size: 14px;
            background-color: #f5f7fa;
            border-color: #e4e7ed;
            color: #4e5969;
          }

          .job-select-btn {
            width: 100%;
            justify-content: space-between;
          }
        }

        .radio-group {
          display: flex;
          width: 100%;

          :deep(.el-radio-button) {
            flex: 1;
            text-align: center;
          }
        }

        .color-scheme-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 4px 0;

          .scheme-label {
            flex: 1;
            color: #4e5969;
          }

          .scheme-preview {
            display: inline-block;
            width: 80px;
            height: 16px;
            border-radius: 3px;
          }
        }

        .search-btn {
          padding: 0 12px;
        }

        .el-form-item {
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .visualization-area {
      flex: 1;
      display: flex;
      flex-direction: column;

      .cluster-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        border: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

        :deep(.el-card__body) {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 20px;
        }

        .card-header {
          margin-bottom: 20px;

          .title {
            font-size: 18px;
            font-weight: 500;
            color: #1d2129;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
          }

          .cluster-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
          }

          .stat-tag {
            height: 28px;
            line-height: 28px;
            padding: 0 10px;
            border-radius: 14px;
            font-size: 13px;
          }
        }

        .cluster-wrapper {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;

          .cluster-chart {
            width: 100%;
            height: 100%;
            min-width: 600px;
            min-height: 400px;
            max-height: 600px;
          }
        }
      }
    }
  }
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .cluster-container {
    .cluster-content {
      flex-direction: column;

      .control-panel {
        width: 100%;
        margin-bottom: 20px;
      }

      .visualization-area {
        .cluster-card {
          .cluster-wrapper {
            .cluster-chart {
              min-width: 100%;
              height: 500px;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .cluster-container {
    padding: 12px;

    .cluster-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;
        flex-direction: column;

        .el-button {
          width: 100%;
        }
      }
    }

    .cluster-content {
      .visualization-area {
        .cluster-card {
          .card-header {
            .cluster-stats {
              flex-direction: column;
              gap: 8px;
            }
          }

          .cluster-wrapper {
            min-height: 300px;

            .cluster-chart {
              min-height: 300px;
            }
          }
        }
      }
    }
  }
}
</style>