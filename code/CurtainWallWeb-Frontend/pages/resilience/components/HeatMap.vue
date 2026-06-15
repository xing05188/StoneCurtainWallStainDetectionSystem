<template>
  <div ref="heatmapChart" style="width: 100%; height: 600px;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const heatmapChart = ref(null)

function generateLargeHeatmapData(xCount, yCount) {
  const data = []
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      const value = Math.round(Math.random() * 100)
      data.push([x, y, value])
    }
  }
  return data
}

onMounted(() => {
  const chart = echarts.init(heatmapChart.value)

  const xCount = 100
  const yCount = 100
  const data = generateLargeHeatmapData(xCount, yCount)

  chart.setOption({
    title: {
      text: '大规模幕墙块韧性评分热力图',
      left: 'center'
    },
    tooltip: {
      position: 'top',
      formatter: function (params) {
        const [x, y, value] = params.value
        return `位置：(${x}, ${y})<br/>评分：${value}`
      }
    },
    grid: {
      height: '80%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: xCount }, (_, i) => `批${i + 1}`),
      splitArea: {
        show: false
      },
      axisLabel: {
        interval: 9,
        rotate: 45
      }
    },
    yAxis: {
      type: 'category',
      data: Array.from({ length: yCount }, (_, i) => `块${i + 1}`),
      splitArea: {
        show: false
      },
      axisLabel: {
        interval: 9
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%'
    },
    series: [
      {
        name: '韧性评分',
        type: 'heatmap',
        data: data,
        label: {
          show: false
        },
        emphasis: {
          itemStyle: {
            borderColor: '#333',
            borderWidth: 1
          }
        },
        progressive: 10000, // 处理大数据的关键参数
        animation: false // 关闭动画提升性能
      }
    ]
  })
})
</script>
