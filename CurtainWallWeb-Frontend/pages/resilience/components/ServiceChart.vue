<template>
    <div class="service-chart-container" ref="chartRef"></div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  
  const props = defineProps({
    data: Array,
    color: {
      type: String,
      default: '#409EFF'
    },
    title: String
  })
  
  const chartRef = ref(null)
  let chartInstance = null
  
  const initChart = () => {
    if (!chartRef.value) return
    
    chartInstance = echarts.init(chartRef.value)
    
    const option = {
      grid: {
        top: '15%',
        left: '5%',
        right: '5%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c}%'
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#e0e0e0'
          }
        },
        axisLabel: {
          color: '#909399'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#909399',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      series: [
        {
          type: 'line',
          data: props.data,
          showSymbol: false,
          smooth: true,
          lineStyle: {
            width: 3,
            color: props.color
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: props.color + '80'
              },
              {
                offset: 1,
                color: props.color + '10'
              }
            ])
          }
        }
      ]
    }
    
    chartInstance.setOption(option)
  }
  
  onMounted(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
  })
  
  const resizeChart = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }
  
  watch(() => props.data, () => {
    if (chartInstance) {
      chartInstance.setOption({
        series: [{
          data: props.data
        }]
      })
    }
  }, { deep: true })
  
  watch(() => props.color, () => {
    if (chartInstance) {
      chartInstance.setOption({
        series: [{
          lineStyle: {
            color: props.color
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: props.color + '80'
              },
              {
                offset: 1,
                color: props.color + '10'
              }
            ])
          }
        }]
      })
    }
  })
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeChart)
    if (chartInstance) {
      chartInstance.dispose()
    }
  })
  </script>
  
  <style scoped lang="scss">
  .service-chart-container {
    width: 100%;
    height: 200px;
  }
  </style>