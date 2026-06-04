<template>
    <div ref="chartRef" style="width: 100%; height: 100%"></div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  
  const props = defineProps({
    data: {
      type: Object,
      required: true,
      default: () => ({
        numeric: 0,
        categorical: 0,
        text: 0,
        datetime: 0
      })
    }
  })
  
  const chartRef = ref(null)
  let chartInstance = null
  
  const initChart = () => {
    if (!chartRef.value) return
    
    chartInstance = echarts.init(chartRef.value)
    updateChart()
  }
  
  const updateChart = () => {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: ['数值型', '类别型', '文本型', '日期型']
      },
      series: [
        {
          name: '特征类型',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: props.data.numeric, name: '数值型', itemStyle: { color: '#5470c6' } },
            { value: props.data.categorical, name: '类别型', itemStyle: { color: '#91cc75' } },
            { value: props.data.text, name: '文本型', itemStyle: { color: '#fac858' } },
            { value: props.data.datetime, name: '日期型', itemStyle: { color: '#ee6666' } }
          ]
        }
      ]
    }
    
    chartInstance.setOption(option)
  }
  
  onMounted(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
  
  const handleResize = () => {
    chartInstance?.resize()
  }
  
  watch(() => props.data, () => {
    updateChart()
  }, { deep: true })
  </script>