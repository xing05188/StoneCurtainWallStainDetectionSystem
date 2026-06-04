<template>
    <div class="feature-analysis">
      <el-tabs v-model="activeTab" class="analysis-tabs">
        <el-tab-pane label="特征统计" name="statistics">
          <div class="statistics-table">
            <el-table
              :data="featureStats"
              border
              style="width: 100%"
              height="500"
              v-loading="loading"
            >
              <el-table-column prop="name" label="特征名称" width="180" fixed />
              <el-table-column prop="type" label="类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getTypeTagType(row.type)">
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="missing" label="缺失值" width="120" />
              <el-table-column prop="unique" label="唯一值" width="120" />
              <el-table-column prop="mean" label="平均值" width="120" v-if="hasNumeric" />
              <el-table-column prop="std" label="标准差" width="120" v-if="hasNumeric" />
              <el-table-column prop="min" label="最小值" width="120" v-if="hasNumeric" />
              <el-table-column prop="max" label="最大值" width="120" v-if="hasNumeric" />
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="数值分布" name="distribution" v-if="hasNumeric">
          <div class="distribution-chart" ref="distChartRef" style="height: 400px;"></div>
          <div class="chart-selector">
            <el-select v-model="selectedFeature" placeholder="请选择特征">
              <el-option
                v-for="feature in numericFeatures"
                :key="feature"
                :label="feature"
                :value="feature"
              />
            </el-select>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="相关性分析" name="correlation" v-if="hasNumeric && numericFeatures.length > 1">
          <div class="correlation-chart" ref="corrChartRef" style="height: 500px;"></div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  import { useRoute } from 'vue-router'
  
  const props = defineProps({
    datasetId: {
      type: [String, Number],
      required: true
    }
  })
  
  const route = useRoute()
  const activeTab = ref('statistics')
  const loading = ref(false)
  const featureStats = ref([])
  const selectedFeature = ref('')
  const distChartRef = ref(null)
  const corrChartRef = ref(null)
  let distChart = null
  let corrChart = null
  
  // 计算属性
  const numericFeatures = computed(() => {
    return featureStats.value
      .filter(item => item.type === 'numeric')
      .map(item => item.name)
  })
  
  const hasNumeric = computed(() => {
    return numericFeatures.value.length > 0
  })
  
  // 方法
  const getTypeTagType = (type) => {
    const map = {
      numeric: '',
      categorical: 'success',
      text: 'warning',
      datetime: 'danger'
    }
    return map[type] || 'info'
  }
  
  const fetchFeatureStats = async () => {
    loading.value = true
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800))
      featureStats.value = Array.from({ length: 15 }, (_, i) => ({
        name: `feature_${i + 1}`,
        type: ['numeric', 'categorical', 'text', 'datetime'][Math.floor(Math.random() * 4)],
        missing: Math.floor(Math.random() * 100),
        unique: Math.floor(Math.random() * 500),
        mean: Math.floor(Math.random() * 1000),
        std: Math.floor(Math.random() * 100),
        min: Math.floor(Math.random() * 500),
        max: Math.floor(Math.random() * 1500) + 500
      }))
      
      if (numericFeatures.value.length) {
        selectedFeature.value = numericFeatures.value[0]
      }
    } catch (error) {
      console.error('获取特征统计失败', error)
    } finally {
      loading.value = false
    }
  }
  
  const initDistChart = () => {
    if (!distChartRef.value) return
    
    distChart = echarts.init(distChartRef.value)
    updateDistChart()
  }
  
  const updateDistChart = () => {
    if (!distChart || !selectedFeature.value) return
    
    // 模拟数据
    const data = Array.from({ length: 20 }, (_, i) =>
      Math.floor(Math.random() * 100) + i * 5
    )
    
    const option = {
      title: {
        text: `${selectedFeature.value} 值分布`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: data.map((_, i) => `区间${i + 1}`)
      },
      yAxis: {
        type: 'value',
        name: '频数'
      },
      series: [
        {
          name: '频数',
          type: 'bar',
          data: data,
          itemStyle: {
            color: '#409EFF'
          },
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(180, 180, 180, 0.2)'
          }
        }
      ]
    }
    
    distChart.setOption(option)
  }
  
  const initCorrChart = () => {
    if (!corrChartRef.value) return
    
    corrChart = echarts.init(corrChartRef.value)
    updateCorrChart()
  }
  
  const updateCorrChart = () => {
    if (!corrChart || !hasNumeric.value) return
    
    // 模拟相关矩阵数据
    const features = numericFeatures.value
    const data = features.map((f1, i) =>
      features.map((f2, j) => 
        i === j ? 1 : Math.random() * 2 - 1
      )
    )
    
    const option = {
      title: {
        text: '特征相关性矩阵',
        left: 'center'
      },
      tooltip: {
        position: 'top'
      },
      grid: {
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: features,
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: features,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      series: [
        {
          name: '相关性',
          type: 'heatmap',
          data: data.flatMap((row, i) =>
            row.map((value, j) => [i, j, value])
          ),
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    
    corrChart.setOption(option)
  }
  
  // 生命周期和监听
  onMounted(() => {
    fetchFeatureStats()
    
    if (hasNumeric.value) {
      initDistChart()
      initCorrChart()
    }
  })
  
  watch(selectedFeature, () => {
    updateDistChart()
  })
  
  watch(() => featureStats.value, () => {
    if (hasNumeric.value) {
      nextTick(() => {
        initDistChart()
        initCorrChart()
      })
    }
  })
  
  // 响应式调整
  const handleResize = () => {
    distChart?.resize()
    corrChart?.resize()
  }
  
  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    distChart?.dispose()
    corrChart?.dispose()
  })
  </script>
  
  <style scoped lang="scss">
  .feature-analysis {
    .analysis-tabs {
      :deep(.el-tabs__header) {
        margin: 0;
      }
      
      .statistics-table {
        margin-top: 20px;
      }
      
      .distribution-chart {
        margin-top: 20px;
      }
      
      .chart-selector {
        margin-top: 20px;
        display: flex;
        justify-content: center;
      }
      
      .correlation-chart {
        margin-top: 20px;
      }
    }
  }
  </style>