<template>
    <div ref="chartRef" style="width: 100%; height: 400px;"></div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import * as echarts from 'echarts'
  
  // 示例数据（实际可通过props传入）
  const batch = '20230039'
  const allData = [
    { batch: '20230039', eresult: 24.528 },
    { batch: '20230039', eresult: 20.224 },
    { batch: '20230039', eresult: 23.209 },
    { batch: '20230039', eresult: 24.873 },
    { batch: '20230039', eresult: 22.667 },
    { batch: '20230039', eresult: 19.973 }
  ]
  
  // 筛选指定批次的评分数据
  const batchData = allData
    .filter(d => d.batch === batch)
    .map((d, index) => ({
      name: `幕墙块${index + 1}`,
      value: d.eresult
    }))
  
  const chartRef = ref(null)
  let chartInstance = null
  
  const initChart = () => {
    chartInstance = echarts.init(chartRef.value)
  
    const option = {
      title: {
        text: `批次 ${batch} 韧性评分剖面图`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        name: '幕墙块编号',
        data: batchData.map(item => item.name)
      },
      yAxis: {
        type: 'value',
        name: '韧性评分'
      },
      series: [{
        name: '韧性评分',
        type: 'line',
        smooth: true,
        data: batchData.map(item => item.value),
        symbol: 'circle',
        lineStyle: {
          width: 2
        },
        areaStyle: {
          opacity: 0.2
        },
        itemStyle: {
          color: '#5470C6'
        }
      }]
    }
  
    chartInstance.setOption(option)
  }
  
  onMounted(() => {
    initChart()
  })
  </script>
  