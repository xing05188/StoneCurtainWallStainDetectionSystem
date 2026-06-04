<template>
  <div class="section-analysis-container">
    <!-- 标题和操作区 -->
    <div class="analysis-header">
      <h2>幕墙剖面分析</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="refreshAnalysis" :loading="loading">
          <el-icon><Refresh /></el-icon>
          <span>刷新分析</span>
        </el-button>
        <el-button @click="exportImage" class="export-btn">
          <el-icon><Document /></el-icon>
          <span>导出图片并上传为报告素材</span>
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="analysis-content">
      <!-- 控制面板 -->
      <el-card shadow="hover" class="control-panel">
        <div class="panel-header">
          <el-icon><Setting /></el-icon>
          <span>分析参数配置</span>
        </div>
        
        <el-form label-width="100px" label-position="left" class="analysis-form">
          <el-form-item label="选择分析任务" prop="job_id">
            <div class="job-select-wrapper">
              <el-button type="primary" @click="showJobDialog" class="job-select-btn">
                <el-icon v-if="selectedJob == null"><Plus /></el-icon>
                <span>{{ selectedJob == null ? '选择分析任务' : `【${selectedJob.job_name}】` }}</span>
              </el-button>
            </div>
            <el-dialog
              title="选择分析任务"
              v-model="jobDialogVisible"
              :width="dialogWidth"
            >
              <JobsView v-if="jobDialogVisible" @job-selected="handleJobSelected" key="job-selector"/>
            </el-dialog>
          </el-form-item>
          
          <el-form-item label="选择维度">
            <el-select 
              v-model="selectedDimension" 
              placeholder="请选择维度" 
              @change="onDimensionChange" 
              style="width: 100%"
              :loading="isLoadingOptions && !selectedDimension"
              :disabled="isLoadingOptions && !selectedDimension"
            >
              <el-option v-for="dim in dimensionOptions" :key="dim.value" :label="dim.label" :value="dim.value" />
            </el-select>
            <!-- 维度加载提示 -->
            <p v-if="isLoadingOptions && !selectedDimension" class="loading-tip">
              <el-icon size="14" class="rotating-icon"><Refresh /></el-icon>
              <span>正在获取维度，请稍候...</span>
            </p>
          </el-form-item>

          <el-form-item label="选择方法">
            <el-select 
              v-model="selectedMethod" 
              placeholder="请选择方法" 
              :disabled="!methodOptions.length || (isLoadingOptions && selectedDimension)"
              @change="onSelectionChange" 
              style="width: 100%"
              :loading="isLoadingOptions && selectedDimension"
            >
              <el-option v-for="method in methodOptions" :key="method" :label="method" :value="method" />
            </el-select>
            <!-- 方法加载提示 -->
            <p v-if="isLoadingOptions && selectedDimension" class="loading-tip">
              <el-icon size="14" class="rotating-icon"><Refresh /></el-icon>
              <span>正在获取方法，请稍候...</span>
            </p>
          </el-form-item>
          
          <el-form-item label="剖面位置" v-if="sectionDirection === 'horizontal'">
            <el-slider
              v-model="horizontalPosition"
              :min="0"
              :max="100"
              :step="1"
              show-input
              :format-tooltip="(val) => `${val}% 高度`"
            />
          </el-form-item>
          
          <el-form-item label="剖面位置" v-if="sectionDirection === 'vertical'">
            <el-slider
              v-model="verticalPosition"
              :min="0"
              :max="100"
              :step="1"
              show-input
              :format-tooltip="(val) => `${val}% 宽度`"
            />
          </el-form-item>
          
          <el-form-item label="线宽">
            <el-slider
              v-model="lineWidth"
              :min="1"
              :max="5"
              :step="1"
              show-input
            />
          </el-form-item>
          
          <el-form-item label="显示网格">
            <el-switch v-model="showGrid" />
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 可视化区域 -->
      <div class="visualization-area">
        <el-card shadow="hover" class="visualization-card">
          <div class="card-header">
            <div class="title">
              {{ sectionDirection === 'horizontal' ? '水平' : '垂直' }}剖面分析结果
              <span class="position-indicator">
                (位置: {{ sectionDirection === 'horizontal' ? `${horizontalPosition}% 高度` : `${verticalPosition}% 宽度` }})
              </span>
            </div>
            <div class="subtitle" v-if="selectedJob">
              任务: {{ selectedJob.job_name }} | 更新时间: {{ formatDateTime(new Date()) }}
            </div>
          </div>
          
          <div class="chart-container">
            <div ref="mainChart" class="main-chart"></div>
            <el-empty
              description="请先选择一个分析任务以查看剖面分析图结果"
              :image-size="120"
              v-if="selectedJob == null"
            />
          </div>
          
          <div class="stats-panel">
            <el-collapse v-model="activeStats">
              <el-collapse-item title="分析统计" name="stats">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="stat-card">
                      <div class="stat-title">最高值</div>
                      <div class="stat-value">{{ maxValue.toFixed(2) }}</div>
                    </div>
                  </el-col>
                  
                  <el-col :span="8">
                    <div class="stat-card">
                      <div class="stat-title">最低值</div>
                      <div class="stat-value">{{ minValue.toFixed(2) }}</div>
                    </div>
                  </el-col>
                  
                  <el-col :span="8">
                    <div class="stat-card">
                      <div class="stat-title">平均值</div>
                      <div class="stat-value">{{ avgValue.toFixed(2) }}</div>
                    </div>
                  </el-col>
                </el-row>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import JobsView from '../views/AnalysisJobView.vue'
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Document,
  Setting,
  Plus
} from '@element-plus/icons-vue'
import { formatDateTime } from '../utils/format'
import { apiUrl } from '../config'
import axios from 'axios'

// 图表实例
let mainChartInstance: echarts.ECharts | null = null

// 数据相关
const loading = ref(false)
const isLoadingOptions = ref(false) // 维度/方法加载状态
const selectedJob = ref<{id: string, job_name: string} | null>(null)
const selectedJobID = ref('')
const jobDialogVisible = ref(false)

// 响应式对话框宽度
const dialogWidth = computed(() => {
  const screenWidth = window.innerWidth;
  return screenWidth > 1600 ? '80%' : screenWidth > 1200 ? '70%' : '90%';
});

// 分析参数
const sectionDirection = ref('horizontal')
const horizontalPosition = ref(50)
const verticalPosition = ref(50)
const selectedDimension = ref('')
const selectedMethod = ref('')
const dimensionOptions = ref<{ value: string; label: string; }[]>([])
const methodOptions = ref<string[]>([])
const riskDistribution = ref<Record<string, number>>({})

// 可视化参数
const colorScheme = ref('jet')
const lineWidth = ref(2)
const showGrid = ref(true)
const showAnnotation = ref(true)
const enableAnimation = ref(true)

// 统计结果
const activeStats = ref(['stats'])
const maxValue = ref(0)
const minValue = ref(0)
const avgValue = ref(0)
const fetchedData = ref<Record<string, any>[]>([])

// DOM 引用
const mainChart = ref<HTMLElement | null>(null)
const chartRef = ref<HTMLElement | null>(null)

// 颜色方案选项
const colorSchemes = ref([
  {
    label: 'Jet',
    value: 'jet',
    preview: 'linear-gradient(to right, #00008f, #0000ff, #0080ff, #00ffff, #80ff80, #ffff00, #ff8000, #ff0000, #800000)'
  },
  {
    label: 'Hot',
    value: 'hot',
    preview: 'linear-gradient(to right, #0b0000, #4b0000, #960000, #e60000, #ff3900, #ff8100, #ffc600, #ffff54)'
  },
  {
    label: 'Cool',
    value: 'cool',
    preview: 'linear-gradient(to right, #00ffff, #80ffff, #b4ffff, #e5ffff, #ffe5ff, #ffb4ff, #ff80ff, #ff00ff)'
  },
  {
    label: 'Rainbow',
    value: 'rainbow',
    preview: 'linear-gradient(to right, #ff0000, #ff8000, #ffff00, #80ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff)'
  },
  {
    label: 'Thermal',
    value: 'thermal',
    preview: 'linear-gradient(to right, #000000, #4b0082, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #ffffff)'
  }
])

// 初始化图表
const initChart = () => {
  if (!mainChart.value) return
  
  mainChartInstance = echarts.init(mainChart.value)
  window.addEventListener('resize', handleResize)
  chartRef.value = mainChart.value
}

const handleResize = () => {
  mainChartInstance?.resize()
}

const showJobDialog = () => {
  jobDialogVisible.value = true
}

const handleJobSelected = (row: { id: string; job_name: string } | null) => {
  selectedJob.value = row
  if (row) {
    selectedJobID.value = row.id
    // 选择任务后加载维度
    isLoadingOptions.value = true
    fetchSliceData().finally(() => {
      isLoadingOptions.value = false
    })
  } else {
    // 清空任务时重置选项
    dimensionOptions.value = []
    methodOptions.value = []
    selectedDimension.value = ''
    selectedMethod.value = ''
  }
  jobDialogVisible.value = false
}

const onDimensionChange = () => {
  selectedMethod.value = ''
  methodOptions.value = []
  // 维度变化时加载方法
  isLoadingOptions.value = true
  
  nextTick(() => {
    try {
      const dimObj = fetchedData.value.find(item => Object.keys(item)[0] === selectedDimension.value)
      if (dimObj) {
        const methodObj = dimObj[selectedDimension.value]
        methodOptions.value = Object.keys(methodObj)
      }
    } catch (error) {
      ElMessage.error('获取方法列表失败')
    } finally {
      isLoadingOptions.value = false
    }
  })
}

const onSelectionChange = () => {
  updateChart()
}

const fetchSliceData = async () => {
  try {
    const response = await axios.get(`${apiUrl}/analysis/jobs/${selectedJobID.value}/`)
    fetchedData.value = response.data.data.result
    dimensionOptions.value = fetchedData.value.map(item => {
      const dimension = Object.keys(item)[0]
      return { value: dimension, label: dimension }
    })
    // 重置选择状态
    selectedDimension.value = ''
    selectedMethod.value = ''
    methodOptions.value = []
  } catch (error) {
    ElMessage.error('分析结果获取失败')
    dimensionOptions.value = []
    methodOptions.value = []
  }
}

// 风险等级颜色映射
const getRiskColor = (level: string) => {
  const colors = {
    '危险': '#f56c6c',
    '警告': '#e6a23c',
    '安全': '#67c23a',
    '未知': '#909399'
  };
  return colors[level] || '#909399';
};

const updateChart = async () => {
  if (!mainChartInstance || !selectedDimension.value || !selectedMethod.value || !selectedJob.value?.id) {
    return
  }

  try {
    // 从后端获取剖面分析数据
    const response = await axios.get(`${apiUrl}/visualization/slice/${selectedJob.value.id}/`, {
      params: {
        dimension: selectedDimension.value,
        method: selectedMethod.value
      }
    })

    const responseData = response.data.data
    if (!responseData) {
      throw new Error('未获取到有效数据')
    }

    // 处理数据格式
    const profileData = responseData.scores.map(item => ({
      batch: item.batch,
      score: item.composite_score,
      riskLevel: item.risk_level
    })).sort((a, b) => a.batch.localeCompare(b.batch))

    // 更新统计信息
    const stats = responseData.metadata?.score_stats || responseData.score_stats
    maxValue.value = stats?.max || Math.max(...profileData.map(item => item.score))
    minValue.value = stats?.min || Math.min(...profileData.map(item => item.score))
    avgValue.value = stats?.mean || profileData.reduce((sum, item) => sum + item.score, 0) / profileData.length

    // 配置图表选项
    const labelInterval = Math.max(1, Math.floor(profileData.length / 10));
    const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(150,150,150,0.1)'
        },
        label: {
          show: true,
          backgroundColor: '#666',
          formatter: ({ value }: { value: string }) => 
            `批次: ${value}`
        }
      },
      formatter: (params: any) => {
        const data = profileData[params[0].dataIndex];
        return `
          <div style="font-weight:bold;margin-bottom:5px">${data.batch}</div>
          <div style="display:flex;align-items:center;margin:3px 0">
            <span style="display:inline-block;width:10px;height:10px;background:${params[0].color};border-radius:50%;margin-right:8px"></span>
            评分: <span style="font-weight:bold;margin-left:5px">${data.score.toFixed(4)}</span>
          </div>
          <div style="display:flex;align-items:center;margin:3px 0">
            <span style="display:inline-block;width:10px;height:10px;background:${getRiskColor(data.riskLevel)};border-radius:50%;margin-right:8px"></span>
            风险: <span style="color:${getRiskColor(data.riskLevel)};margin-left:5px">${data.riskLevel}</span>
          </div>
        `;
      }
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '15%',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'filter',
        height: 20,
        bottom: 30,
        start: 0,
        end: 100,
        handleStyle: {
          color: '#409EFF'
        },
        brushSelect: false,
        zoomLock: true
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'filter'
      }
    ],
    xAxis: {
      type: 'category',
      name: '批次分组',
      nameLocation: 'middle',
      nameGap: 30,
      data: profileData.map(d => d.batch),
      axisLabel: {
        interval: labelInterval,
        rotate: 45,
        formatter: (value: string, index: number) => 
          index % labelInterval === 0 ? value : ''
      },
      axisTick: {
        alignWithLabel: true,
        interval: labelInterval
      },
      axisLine: {
        lineStyle: {
          color: '#DCDFE6'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '韧性评分',
      min: 0,
      max: 1,
      interval: 0.2,
      axisLine: {
        lineStyle: {
          color: '#DCDFE6'
        }
      },
      splitLine: {
        show: showGrid.value,
        lineStyle: {
          type: 'dashed',
          color: '#EBEEF5'
        }
      }
    },
    series: [
      {
        name: '韧性评分',
        type: 'line',
        symbol: 'circle',
        symbolSize: (val: number) => val * 8 + 4,
        smooth: true,
        data: profileData.map(d => d.score),
        lineStyle: {
          width: lineWidth.value,
          color: getColorByRiskLevel(selectedDimension.value)
        },
        itemStyle: {
          color: (params: any) => 
            getRiskColor(profileData[params.dataIndex].riskLevel)
        },
        markPoint: {
          data: [
            { 
              type: 'max', 
              name: '最大值',
              symbol: 'pin',
              symbolSize: 40,
              label: {
                formatter: (params: any) => `MAX: ${params.value.toFixed(2)}`,
                color: 'black'
              },
              itemStyle: { color: '#7234d4' }
            },
            {
              type: 'min',
              name: '最小值',
              symbol: 'pin',
              symbolSize: 40,
              label: {
                formatter: (params: any) => `MIN: ${params.value.toFixed(2)}`,
                color: '#black'
              },
              itemStyle: { color: '#e6a23c' }
            }
          ]
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 0.5,
              name: '警戒线',
              lineStyle: {
                type: 'dashed',
                color: '#f56c6c',
                width: 2
              },
              label: {
                position: 'end',
                formatter: '警戒线',
                color: '#f56c6c'
              }
            },
            {
              type: 'average',
              name: '平均值',
              lineStyle: {
                color: '#67c23a',
                width: 2
              },
              label: {
                position: 'end',
                formatter: '均值: {c}',
                color: '#67c23a'
              }
            }
          ]
        }
      }
    ],
    animation: enableAnimation.value,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

    // 更新图表
    mainChartInstance.setOption(option, true)

    // 更新风险分布信息
    riskDistribution.value = responseData.metadata?.risk_distribution || responseData.risk_distribution

  } catch (error) {
    console.error('更新图表失败:', error)
    let errorMessage = "上传失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  }
}

const getColorByRiskLevel = (dimension: string) => {
  const colors = {
    structural: '#409EFF',
    overall: '#7234d4',
    geometric: '#e6a23c',
    visual: '#f56c6c',
    damage: '#909399'
  }
  return colors[dimension] || '#409EFF'
}

const refreshAnalysis = () => {
  if (selectedJobID.value) {
    isLoadingOptions.value = true
    fetchSliceData().finally(() => {
      isLoadingOptions.value = false
    })
  }
}

const applyAnalysis = () => {
  updateChart()
}

const exportImage = async () => {
  if (!mainChartInstance) {
    ElMessage.warning('请先生成剖面图')
    return
  }

  if (!selectedJob.value?.id) {
    ElMessage.error('请先选择关联的分析任务')
    return
  }

  const loading = ElMessage.info('正在处理图片...')

  try {
    const url = mainChartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })

    const blob = await fetch(url).then(res => res.blob())
    const fileName = `section_${selectedJob.value.id}_${Date.now()}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const formData = new FormData()
    formData.append('job_id', selectedJob.value.id)
    formData.append('slice', file)
    formData.append('dimension', selectedDimension.value)
    formData.append('method', selectedMethod.value)

    await Promise.all([
      new Promise<void>((resolve) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `剖面图_${selectedJob.value.job_name || '未命名'}_${formatDateTime(new Date())}.png`
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
          resolve()
        }, 100)
      }),
      
      axios.post(`${apiUrl}/visualization/upload/slice/${selectedJob.value.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      })
    ])

    ElMessage.success('剖面图保存成功！')
  } catch (error) {
    let errorMessage = "上传失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  } finally {
    loading.close()
  }
}

// 监听参数变化
watch([lineWidth, showGrid, showAnnotation, enableAnimation, colorScheme], () => {
  updateChart()
})

watch(selectedJob, (newJob) => {
  if (newJob) {
    isLoadingOptions.value = true
    fetchSliceData().finally(() => {
      isLoadingOptions.value = false
    })
  }
})

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  mainChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.section-analysis-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .analysis-header {
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
    }
  }

  .analysis-content {
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
        .job-select-btn {
          width: 100%;
          justify-content: space-between;
        }

        .el-form-item {
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        .el-slider {
          width: 100%;
        }
      }
    }

    .visualization-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      .visualization-card {
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
            display: flex;
            flex-wrap: wrap;
            align-items: center;

            .position-indicator {
              font-size: 14px;
              color: #666;
              margin-left: 10px;
              font-weight: normal;
              white-space: nowrap;
            }
          }

          .subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
        }

        .chart-container {
          flex: 1;
          min-height: 400px;
          position: relative;
          width: 100%;

          .main-chart {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        }

        .stats-panel {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #f0f0f0;

          :deep(.el-collapse) {
            border: none;

            :deep(.el-collapse-item) {
              border-bottom: none;

              :deep(.el-collapse-item__header) {
                font-weight: 500;
                color: #4e5969;
                border-bottom: 1px solid #f0f0f0;
                padding: 8px 0;
                height: auto;
                line-height: normal;
              }

              :deep(.el-collapse-item__content) {
                padding: 15px 0 0 0;
              }
            }
          }

          .stat-card {
            background: #f7f8fa;
            border-radius: 6px;
            padding: 12px;
            text-align: center;

            .stat-title {
              font-size: 13px;
              color: #666;
              margin-bottom: 5px;
            }

            .stat-value {
              font-size: 18px;
              font-weight: 500;
              color: #1d2129;
            }
          }
        }
      }
    }
  }
}

/* 加载提示样式 */
.loading-tip {
  margin: 5px 0 0 0;
  padding: 0;
  color: #666;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 旋转动画效果 */
.rotating-icon {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .section-analysis-container {
    .analysis-content {
      flex-direction: column;

      .control-panel {
        width: 100%;
        margin-bottom: 20px;
      }

      .visualization-area {
        .visualization-card {
          .chart-container {
            min-height: 400px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .section-analysis-container {
    padding: 12px;

    .analysis-header {
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

    .analysis-content {
      .visualization-area {
        .visualization-card {
          .stats-panel {
            :deep(.el-row) {
              flex-direction: column;
            }

            :deep(.el-col) {
              width: 100%;
              margin-bottom: 15px;
            }
          }
        }
      }
    }
  }
}
</style>