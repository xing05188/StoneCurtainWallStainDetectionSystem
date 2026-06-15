<template>
    <div class="mini-chart-container" ref="chartRef"></div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
  import * as echarts from 'echarts'
  
  const props = defineProps({
    data: Array,
    color: {
      type: String,
      default: '#409EFF'
    }
  })
  
  const chartRef = ref(null)
  let chartInstance = null
  
  const initChart = () => {
    if (!chartRef.value) return
    
    chartInstance = echarts.init(chartRef.value)
    
    const option = {
      grid: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 'dataMin',
        max: 'dataMax'
      },
      series: [
        {
          type: 'line',
          data: props.data,
          showSymbol: false,
          smooth: true,
          lineStyle: {
            width: 2,
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
  .mini-chart-container {
    width: 100%;
    height: 100%;
  }
  </style>