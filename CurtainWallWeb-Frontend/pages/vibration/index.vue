<template>
  <div style="position: fixed; right: 10px; top: 15px; z-index: 1000;">
    <el-button type="primary" @click="backToMain" style="position: absolute; right: 0; top: 0;">返回主页</el-button>
  </div>
  <UDashboardToolbar>
    <template #left>
      <el-select v-model="selectedCategory" placeholder="选择设备地点" class="min-w-[150px]" @change="fetchDevices">
        <el-option label="安楼外幕墙1" value="安楼外幕墙1"></el-option>
        <el-option label="安楼外幕墙2" value="安楼外幕墙2"></el-option>
        <el-option label="衷和楼" value="衷和楼"></el-option>
      </el-select>

      <el-select v-model="selectedDeviceType" placeholder="选择设备类型" class="ml-4 min-w-[150px]">
        <el-option label="加速度计" value="accelerometer"></el-option>
        <el-option label="应变计" value="strainGauge"></el-option>
      </el-select>

      <el-select v-model="selectedDevice" placeholder="选择设备" class="ml-4 min-w-[150px]">
        <el-option
          v-for="device in filteredDevices"
          :key="device.device_name"
          :label="device.device_name"
          :value="device.device_name"
        />
      </el-select>

      <el-select v-model="selectedDataSource" placeholder="选择数据级别" class="ml-4 min-w-[180px]" @change="fetchDataBySelection">
        <el-option label="秒级数据" value="second"></el-option>
        <el-option label="分钟级数据" value="minute"></el-option>
        <el-option label="小时级数据" value="hourly"></el-option>
        <el-option label="天级数据" value="daily"></el-option>
        <el-option label="周级数据" value="weekly"></el-option>
        <el-option label="月级数据" value="monthly"></el-option>
      </el-select>
      
      <el-button type="primary" @click="fetchDataBySelection" class="ml-4" :disabled="!selectedDevice">确定</el-button>
    </template>
  </UDashboardToolbar>

  <!-- 多图表卡片容器 -->
  <UDashboardCard class="overflow-y-auto">
    <div class="chart-tabs">
      <!-- 标签页导航 -->
      <div class="tab-nav">
        <!-- 加速度计标签页 -->
        <template v-if="selectedDeviceType === 'accelerometer'">
          <button 
            v-for="tab in accelerometerTabs" 
            :key="tab.key"
            :class="['tab-button', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </template>
        
        <!-- 应变计标签页 -->
        <template v-if="selectedDeviceType === 'strainGauge'">
          <button 
            v-for="tab in strainGaugeTabs" 
            :key="tab.key"
            :class="['tab-button', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </template>
      </div>
      
      <!-- 图表容器 -->
      <div class="tab-content">
        <!-- 加速度计图表 -->
        <template v-if="selectedDeviceType === 'accelerometer'">
          <div v-show="activeTab === 'x'" id="chart-x" class="chart-container"></div>
          <div v-show="activeTab === 'y'" id="chart-y" class="chart-container"></div>
          <div v-show="activeTab === 'z'" id="chart-z" class="chart-container"></div>
          <div v-show="activeTab === 'all'" id="chart-all" class="chart-container"></div>
        </template>
        
        <!-- 应变计图表 -->
        <template v-if="selectedDeviceType === 'strainGauge'">
          <div v-show="activeTab === 'ch1'" id="chart-ch1" class="chart-container"></div>
          <div v-show="activeTab === 'ch2'" id="chart-ch2" class="chart-container"></div>
          <div v-show="activeTab === 'all'" id="chart-strain-all" class="chart-container"></div>
        </template>
      </div>
    </div>
  </UDashboardCard>
</template>

<script setup lang="ts">
import {onMounted, ref, watch, computed, onBeforeUnmount, nextTick} from 'vue';
import * as echarts from 'echarts';
import {useRouter} from "vue-router";
import axios from 'axios';
import type { CascaderValue } from 'element-plus';
import { ElMessage } from 'element-plus';

const API_BASE_URL = 'http://8.153.161.229:8009';
const dataSource = ref<'api_second' | 'api_minute' | 'api_hour' | 'api_day'| 'api_week' | 'api_month' | 'api_year'>('api_minute');
const selectedDataSource = ref('minute');

// 标签页相关
const activeTab = ref('all');

// 定义标签页配置
const accelerometerTabs = [
  { key: 'all', label: '全部(XYZ)' },
  { key: 'x', label: 'X轴' },
  { key: 'y', label: 'Y轴' },
  { key: 'z', label: 'Z轴' }
];

const strainGaugeTabs = [
  { key: 'all', label: '全部(Ch1+Ch2)' },
  { key: 'ch1', label: 'Channel 1' },
  { key: 'ch2', label: 'Channel 2' }
];

// 存储多个图表实例
const charts = ref<{ [key: string]: echarts.ECharts | null }>({});

// 存储预处理的图表配置
const chartOptions = ref<{ [key: string]: any }>({});

const devices = ref<{ device_name: string; category: string }[]>([]);
const selectedCategory = ref('');
const selectedDevice = ref('');
const selectedDeviceType = ref('accelerometer');

// 控制API请求轮询的变量
let secondDataInterval: NodeJS.Timeout | null = null;
let fetchInterval: NodeJS.Timeout | null = null;
let thresholdCheckInterval: NodeJS.Timeout | null = null;
const maxDataLength = 100;

const accumulatedData = ref({
  x: { times: [] as string[], values: [] as number[] },
  y: { times: [] as string[], values: [] as number[] },
  z: { times: [] as string[], values: [] as number[] },
  ch1: { times: [] as string[], values: [] as number[] },
  ch2: { times: [] as string[], values: [] as number[] }
});

// 初始化图表函数
const initializeCharts = () => {
  nextTick(() => {
    try {
      // 销毁现有图表
      Object.values(charts.value).forEach(chart => {
        if (chart) {
          chart.dispose();
        }
      });
      charts.value = {};

      // 加速度计图表
      const chartX = document.getElementById('chart-x');
      const chartY = document.getElementById('chart-y');
      const chartZ = document.getElementById('chart-z');
      const chartAll = document.getElementById('chart-all');
      
      if (chartX) charts.value['x'] = echarts.init(chartX);
      if (chartY) charts.value['y'] = echarts.init(chartY);
      if (chartZ) charts.value['z'] = echarts.init(chartZ);
      if (chartAll) charts.value['all'] = echarts.init(chartAll);
      
      // 应变计图表
      const chartCh1 = document.getElementById('chart-ch1');
      const chartCh2 = document.getElementById('chart-ch2');
      const chartStrainAll = document.getElementById('chart-strain-all');
      
      if (chartCh1) charts.value['ch1'] = echarts.init(chartCh1);
      if (chartCh2) charts.value['ch2'] = echarts.init(chartCh2);
      if (chartStrainAll) charts.value['strain-all'] = echarts.init(chartStrainAll);

      console.log('图表初始化完成:', Object.keys(charts.value));
    } catch (error) {
      console.error('初始化图表失败:', error);
    }
  });
};

// 优化的标签页切换函数
const switchTab = (tabKey: string) => {
  activeTab.value = tabKey;
  
  nextTick(() => {
    const chartKey = tabKey === 'all' && selectedDeviceType.value === 'strainGauge' ? 'strain-all' : tabKey;
    const chart = charts.value[chartKey];
    
    if (chart) {
      // 确保图表实例存在且已初始化
      try {
        chart.resize();
        
        // 检查是否有预处理的配置且数据完整
        const cachedOption = chartOptions.value[chartKey];
        if (cachedOption && isValidChartOption(cachedOption)) {
          console.log(`使用缓存配置: ${chartKey}`);
          chart.setOption(cachedOption, true); // 使用 notMerge: true 确保完全替换
        } else {
          console.log(`重新生成配置: ${chartKey}`);
          // 如果缓存无效或不存在，重新生成
          generateAndSetOption(chartKey, tabKey);
        }
      } catch (error) {
        console.error(`切换标签页失败 ${chartKey}:`, error);
        // 出错时重新生成
        generateAndSetOption(chartKey, tabKey);
      }
    }
  });
};

// 检查图表配置是否有效
const isValidChartOption = (option: any): boolean => {
  if (!option || !option.series || !Array.isArray(option.series)) {
    return false;
  }
  
  // 检查系列数据是否有效
  for (const series of option.series) {
    if (!series.data || !Array.isArray(series.data) || series.data.length === 0) {
      return false;
    }
  }
  
  // 检查x轴数据
  if (!option.xAxis || !option.xAxis.data || !Array.isArray(option.xAxis.data) || option.xAxis.data.length === 0) {
    return false;
  }
  
  return true;
};

// 生成并设置图表配置
const generateAndSetOption = (chartKey: string, tabKey: string) => {
  if (!accumulatedData.value) return;
  
  let option;
  if (selectedDeviceType.value === 'accelerometer') {
    option = generateAccelerometerOption(accumulatedData.value, tabKey, accumulatedData.value.x?.times || []);
  } else if (selectedDeviceType.value === 'strainGauge') {
    option = generateStrainGaugeOption(accumulatedData.value, tabKey, accumulatedData.value.ch1?.times || []);
  }
  
  if (option && charts.value[chartKey]) {
    // 缓存生成的配置
    chartOptions.value[chartKey] = option;
    charts.value[chartKey]?.setOption(option, true);
  }
};

// 预处理所有图表配置
const preprocessChartOptions = (data: any) => {
  if (!data) return;
  
  const deviceType = selectedDeviceType.value;
  
  // 验证数据完整性
  if (deviceType === 'accelerometer') {
    if (!data.x?.times || !data.x?.values || data.x.times.length === 0 || data.x.values.length === 0) {
      console.warn('加速度计数据不完整，跳过预处理');
      return;
    }
    
    const xAxisData = data.x.times;
    
    // 预处理各个轴的配置
    ['x', 'y', 'z', 'all'].forEach(chartType => {
      try {
        const option = generateAccelerometerOption(data, chartType, xAxisData);
        if (isValidChartOption(option)) {
          chartOptions.value[chartType] = option;
          console.log(`预处理完成: ${chartType}`);
        } else {
          console.warn(`预处理失败: ${chartType} - 配置无效`);
        }
      } catch (error) {
        console.error(`预处理失败: ${chartType}`, error);
      }
    });
  } else if (deviceType === 'strainGauge') {
    if (!data.ch1?.times || !data.ch1?.values || data.ch1.times.length === 0 || data.ch1.values.length === 0) {
      console.warn('应变计数据不完整，跳过预处理');
      return;
    }
    
    const xAxisData = data.ch1.times;
    
    // 预处理各个通道的配置
    ['ch1', 'ch2', 'all'].forEach(chartType => {
      try {
        const option = generateStrainGaugeOption(data, chartType, xAxisData);
        const key = chartType === 'all' ? 'strain-all' : chartType;
        if (isValidChartOption(option)) {
          chartOptions.value[key] = option;
          console.log(`预处理完成: ${key}`);
        } else {
          console.warn(`预处理失败: ${key} - 配置无效`);
        }
      } catch (error) {
        console.error(`预处理失败: ${chartType}`, error);
      }
    });
  }
};

// 生成加速度计图表配置
const generateAccelerometerOption = (data: any, chartType: string, xAxisData: string[]) => {
  let series: any[] = [];
  let title = '';
  
  // 验证输入数据
  if (!data || !xAxisData || xAxisData.length === 0) {
    console.warn(`生成加速度计配置失败: 数据无效 ${chartType}`);
    return null;
  }
  
  switch (chartType) {
    case 'x':
      if (!data.x?.values || data.x.values.length === 0) {
        console.warn('X轴数据为空');
        return null;
      }
      title = 'X轴加速度曲线';
      series = [{
        name: 'X轴',
        type: 'line',
        data: data.x.values,
        smooth: false,
        symbol: 'none',
        color: '#ff6b6b',
        markLine: {
          symbol: ['none', 'none'],
          data: []
        }
      }];
      break;
      
    case 'y':
      if (!data.y?.values || data.y.values.length === 0) {
        console.warn('Y轴数据为空');
        return null;
      }
      title = 'Y轴加速度曲线';
      series = [{
        name: 'Y轴',
        type: 'line',
        data: data.y.values,
        smooth: false,
        symbol: 'none',
        color: '#4ecdc4',
        markLine: {
          symbol: ['none', 'none'],
          data: []
        }
      }];
      break;
      
    case 'z':
      if (!data.z?.values || data.z.values.length === 0) {
        console.warn('Z轴数据为空');
        return null;
      }
      title = 'Z轴加速度曲线';
      series = [{
        name: 'Z轴',
        type: 'line',
        data: data.z.values,
        smooth: false,
        symbol: 'none',
        color: 'orange',
        markLine: {
          symbol: ['none', 'none'],
          data: []
        }
      }];
      break;
      
    case 'all':
      // 验证所有轴的数据
      if (!data.x?.values || !data.y?.values || !data.z?.values || 
          data.x.values.length === 0 || data.y.values.length === 0 || data.z.values.length === 0) {
        console.warn('XYZ轴数据不完整');
        return null;
      }
      title = 'XYZ轴加速度曲线';
      series = [
        {
          name: 'x',
          type: 'line',
          data: data.x.values,
          smooth: false,
          symbol: 'none',
          color: '#ff6b6b',
          markLine: {
            symbol: ['none', 'none'],
            data: []
          }
        },
        {
          name: 'y',
          type: 'line',
          data: data.y.values,
          smooth: false,
          symbol: 'none',
          color: '#4ecdc4',
          markLine: {
            symbol: ['none', 'none'],
            data: []
          }
        },
        {
          name: 'z',
          type: 'line',
          data: data.z.values,
          smooth: false,
          symbol: 'none',
          color: 'orange',
          markLine: {
            symbol: ['none', 'none'],
            data: []
          }
        }
      ];
      break;
      
    default:
      console.warn(`未知的图表类型: ${chartType}`);
      return null;
  }
  
  return {
    title: {
      text: `${title}(${selectedDataSource.value}): 监测机位(${selectedDevice.value})`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 40
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      },
      right: 20,
      top: 40
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: function(value: number) {
          return (value).toFixed(6) + ' gal';
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0
      },
      {
        type: 'slider',
        xAxisIndex: 0
      },
      {
        type: 'inside',
        yAxisIndex: 0
      },
      {
        type: 'slider',
        yAxisIndex: 0
      }
    ],
    series
  };
};

// 生成应变计图表配置
const generateStrainGaugeOption = (data: any, chartType: string, xAxisData: string[]) => {
  let series: any[] = [];
  let title = '';
  
  // 验证输入数据
  if (!data || !xAxisData || xAxisData.length === 0) {
    console.warn(`生成应变计配置失败: 数据无效 ${chartType}`);
    return null;
  }
  
  switch (chartType) {
    case 'ch1':
      if (!data.ch1?.values || data.ch1.values.length === 0) {
        console.warn('Ch1数据为空');
        return null;
      }
      title = 'Channel 1 应变曲线';
      series = [{
        name: 'Ch1',
        type: 'line',
        data: data.ch1.values,
        smooth: false,
        symbol: 'none',
        color: '#ff6b6b',
        markLine: {
          symbol: ['none', 'none'],
          data: []
        }
      }];
      break;
      
    case 'ch2':
      if (!data.ch2?.values || data.ch2.values.length === 0) {
        console.warn('Ch2数据为空');
        return null;
      }
      title = 'Channel 2 应变曲线';
      series = [{
        name: 'Ch2',
        type: 'line',
        data: data.ch2.values,
        smooth: false,
        symbol: 'none',
        color: '#4ecdc4',
        markLine: {
          symbol: ['none', 'none'],
          data: []
        }
      }];
      break;
      
    case 'all':
      // 验证所有通道的数据
      if (!data.ch1?.values || !data.ch2?.values || 
          data.ch1.values.length === 0 || data.ch2.values.length === 0) {
        console.warn('Ch1+Ch2数据不完整');
        return null;
      }
      title = 'Channel 1+2 应变曲线';
      series = [
        {
          name: 'Ch1',
          type: 'line',
          data: data.ch1.values,
          smooth: false,
          symbol: 'none',
          color: '#ff6b6b',
          markLine: {
            symbol: ['none', 'none'],
            data: []
          }
        },
        {
          name: 'Ch2',
          type: 'line',
          data: data.ch2.values,
          smooth: false,
          symbol: 'none',
          color: '#4ecdc4',
          markLine: {
            symbol: ['none', 'none'],
            data: []
          }
        }
      ];
      break;
      
    default:
      console.warn(`未知的图表类型: ${chartType}`);
      return null;
  }
  
  return {
    title: {
      text: `${title}(${selectedDataSource.value}): 监测机位(${selectedDevice.value})`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 40
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      },
      right: 20,
      top: 40
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: function(value: number) {
          return (value).toFixed(6) + ' με';
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0
      },
      {
        type: 'slider',
        xAxisIndex: 0
      },
      {
        type: 'inside',
        yAxisIndex: 0
      },
      {
        type: 'slider',
        yAxisIndex: 0
      }
    ],
    series
  };
};

// 绘制特定图表
const drawSpecificChart = (chartType: string) => {
  if (!accumulatedData.value) return;
  
  if (selectedDeviceType.value === 'accelerometer') {
    drawAccelerometerChart(chartType);
  } else if (selectedDeviceType.value === 'strainGauge') {
    drawStrainGaugeChart(chartType);
  }
};

// 绘制加速度计图表（保留原逻辑，但仅作为备用）
const drawAccelerometerChart = (chartType: string) => {
  const chart = charts.value[chartType];
  if (!chart || !accumulatedData.value) return;
  
  const option = generateAccelerometerOption(accumulatedData.value, chartType, accumulatedData.value.x?.times || []);
  chart.setOption(option);
};

// 绘制应变计图表（保留原逻辑，但仅作为备用）
const drawStrainGaugeChart = (chartType: string) => {
  const chartKey = chartType === 'all' ? 'strain-all' : chartType;
  const chart = charts.value[chartKey];
  if (!chart || !accumulatedData.value) return;
  
  const option = generateStrainGaugeOption(accumulatedData.value, chartType, accumulatedData.value.ch1?.times || []);
  chart.setOption(option);
};

// 优化的绘制所有图表函数
const drawAllCharts = () => {
  // 先验证数据完整性
  console.log('当前累积数据:', accumulatedData.value);
  
  if (!accumulatedData.value) {
    console.warn('累积数据为空');
    return;
  }
  
  const deviceType = selectedDeviceType.value;
  console.log('设备类型:', deviceType);
  
  if (deviceType === 'accelerometer') {
    console.log('X轴数据:', accumulatedData.value.x);
    console.log('Y轴数据:', accumulatedData.value.y);
    console.log('Z轴数据:', accumulatedData.value.z);
  } else if (deviceType === 'strainGauge') {
    console.log('Ch1数据:', accumulatedData.value.ch1);
    console.log('Ch2数据:', accumulatedData.value.ch2);
  }
  
  // 预处理所有图表配置
  preprocessChartOptions(accumulatedData.value);
  
  // 确保当前激活的标签页为 'all'
  if (activeTab.value !== 'all') {
    activeTab.value = 'all';
  }
  
  // 等待DOM更新后再绘制图表
  nextTick(() => {
    const activeChartKey = activeTab.value === 'all' && selectedDeviceType.value === 'strainGauge' ? 'strain-all' : activeTab.value;
    
    console.log(`尝试绘制图表: ${activeChartKey}`);
    console.log('图表实例存在:', !!charts.value[activeChartKey]);
    console.log('配置存在:', !!chartOptions.value[activeChartKey]);
    
    if (charts.value[activeChartKey] && chartOptions.value[activeChartKey]) {
      console.log(`绘制图表: ${activeChartKey}`);
      charts.value[activeChartKey]?.setOption(chartOptions.value[activeChartKey], true);
      // 确保图表正确调整大小
      charts.value[activeChartKey]?.resize();
    } else {
      console.warn(`图表或配置不存在: ${activeChartKey}`);
      // 如果预处理的配置不存在，直接生成并绘制
      generateAndSetOption(activeChartKey, activeTab.value);
    }
  });
};

// 替换原来的drawTimeChart1函数
const drawTimeChart1 = (chartData: any) => {
  console.log('收到图表数据:', chartData);
  
  // 确保数据结构正确
  if (!chartData) {
    console.error('图表数据为空');
    return;
  }
  
  // 检查数据完整性
  if (selectedDeviceType.value === 'accelerometer') {
    console.log('验证加速度计数据:');
    console.log('X:', chartData.x);
    console.log('Y:', chartData.y); 
    console.log('Z:', chartData.z);
    
    if (!chartData.x || !chartData.y || !chartData.z) {
      console.error('加速度计数据不完整');
      return;
    }
  } else if (selectedDeviceType.value === 'strainGauge') {
    console.log('验证应变计数据:');
    console.log('Ch1:', chartData.ch1);
    console.log('Ch2:', chartData.ch2);
    
    if (!chartData.ch1 || !chartData.ch2) {
      console.error('应变计数据不完整');
      return;
    }
  }
  
  accumulatedData.value = chartData;
  drawAllCharts();
};

// 保留所有原有的API调用函数
const fetchSecondData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/data/get_second_data`, {
      params: {
        device: selectedDevice.value,
        channel: '0',
        num: 60 * 60 * 24*24
      }
    });

    if (response.data.status === 'success' && response.data.data) {
      const { x, y, z } = response.data.data;

      accumulatedData.value.x.times = x.map((item: [string, number]) => item[0]);
      accumulatedData.value.x.values = x.map((item: [string, number]) => item[1]);

      accumulatedData.value.y.times = y.map((item: [string, number]) => item[0]);
      accumulatedData.value.y.values = y.map((item: [string, number]) => item[1]);

      accumulatedData.value.z.times = z.map((item: [string, number]) => item[0]);
      accumulatedData.value.z.values = z.map((item: [string, number]) => item[1]);

      drawTimeChart1(accumulatedData.value);
    } else {
      console.warn("API返回空数据或无效数据");
    }
  } catch (error) {
    console.error("获取秒级数据失败:", error);
  }
};

const stopSecondDataPolling = () => {
  console.log("停止秒级数据轮询");
  if (secondDataInterval) {
    clearInterval(secondDataInterval);
    secondDataInterval = null;
  }
};

const stopAllPolling = () => {
  console.log("停止所有数据轮询");
  stopSecondDataPolling();
  
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
  }
  
  if (thresholdCheckInterval) {
    clearInterval(thresholdCheckInterval);
    thresholdCheckInterval = null;
  }
};

const loadData = async (type: 'second' | 'minute' | 'hourly' | 'daily' | 'monthly' | 'yearly', numPoints: number) => {
  try {
    let endpoint;
    switch (type) {
      case 'second':
        endpoint = 'get_second_data';
        break;
      case 'minute':
        endpoint = 'get_minute_data';
        break;
      case 'hourly':
        endpoint = 'get_hourly_data';
        break;
      case 'daily':
        endpoint = 'get_daily_data';
        break;
      case 'monthly':
        endpoint = 'get_monthly_data';
        break;
      case 'yearly':
        endpoint = 'get_yearly_data';
        break;
    }

    const response = await axios.get(`${API_BASE_URL}/data/${endpoint}`, {
      params: {
        device: selectedDevice.value,
        channel: '0',
        num: numPoints
      }
    });

    if (response.data.status === 'success' && response.data.data) {
      const { x, y, z } = response.data.data;

      accumulatedData.value.x.times = x.map((item: [string, number]) => item[0]);
      accumulatedData.value.x.values = x.map((item: [string, number]) => item[1]);

      accumulatedData.value.y.times = y.map((item: [string, number]) => item[0]);
      accumulatedData.value.y.values = y.map((item: [string, number]) => item[1]);

      accumulatedData.value.z.times = z.map((item: [string, number]) => item[0]);
      accumulatedData.value.z.values = z.map((item: [string, number]) => item[1]);

      drawTimeChart1(accumulatedData.value);
      return true;
    } else {
      console.warn("API返回空数据或无效数据");
      return false;
    }
  } catch (error) {
    console.error(`获取${type}数据失败:`, error);
    return false;
  }
};

const switchDataSourceMode = async (sourceType: 'api_minute' | 'api_hour' | 'api_day' | 'api_month' | 'api_year', showMessage = true) => {
  stopAllPolling();
  
  secondDataInterval = null;
  fetchInterval = null;
  
  switch (sourceType) {
    case 'api_minute':
      console.log("切换到分钟级数据");
      await loadData('minute', 6000);
      startFetchingLatestData();
      break;
    case 'api_hour':
      console.log("切换到小时级数据");
      await loadData('hourly', 1000);
      break;
    case 'api_day':
      console.log("切换到天级数据");
      await loadData('daily', 78);
      break;
    case 'api_month':
      console.log("切换到月级数据");
      await loadData('monthly', 12);
      break;
    case 'api_year':
      console.log("切换到年级数据");
      await loadData('yearly', 5);
      break;
  }
  
  if (showMessage) {
    ElMessage({
      message: `已切换到设备 ${selectedDevice.value} 的${dataSourceName()}数据`,
      type: 'success',
      duration: 2000
    });
  }
};

const startFetchingLatestData = () => {
  fetchInterval = setInterval(() => {
    loadData('minute', 6000);
  }, 60000);
};

const router = useRouter();
const backToMain = () => {
  router.push("/");
};

const fetchDevices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/data/get_new_device`);
    if (response.data.status === 'success') {
      devices.value = response.data.data.map((device: { device_name: string }) => ({
        device_name: device.device_name,
        category: selectedCategory.value
      }));
    } else {
      ElMessage.error('获取设备列表失败');
    }
  } catch (error) {
    console.error('获取设备列表时出错:', error);
    ElMessage.error('获取设备列表失败');
  }
};

const filteredDevices = computed(() => {
  return devices.value.filter(device => 
    device.category === selectedCategory.value && 
    device.device_name.includes(selectedCategory.value) && 
    (selectedDeviceType.value === 'strainGauge' ? device.device_name.includes('Y') : !device.device_name.includes('Y'))
  );
});

const fetchDataBySelection = async () => {
  if (!selectedDevice.value) {
    ElMessage.error('请先选择设备');
    return;
  }

  const deviceName = selectedDevice.value;
  let endpoint = '';
  let numPoints = 1000;

  switch (selectedDataSource.value) {
    case 'second':
      endpoint = 'get_second_data';
      numPoints = 20000;
      break;
    case 'minute':
      endpoint = 'get_minute_data';
      numPoints = 10000;
      break;
    case 'hourly':
      endpoint = 'get_hourly_data';
      numPoints = 1000;
      break;
    case 'daily':
      endpoint = 'get_daily_data';
      numPoints = 100;
      break;
    case 'weekly':
      endpoint = 'get_weekly_data';
      numPoints = 60;
      break;
    case 'monthly':
      endpoint = 'get_monthly_data';
      numPoints = 30;
      break;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/data/${endpoint}`, {
      params: {
        device_name: deviceName,
        num: numPoints
      }
    });

    if (response.data.status === 'success') {
      const data = response.data.data;
  
      let chartData = {
          x: { times: [], values: [] },
          y: { times: [], values: [] },
          z: { times: [], values: [] },
          ch1: { times: [], values: [] },
          ch2: { times: [], values: [] }
      };

      if (selectedDeviceType.value === 'accelerometer') {
        if (data.x) {
            chartData.x.times = data.x.map((item: [string, number]) => item[0]);
            chartData.x.values = data.x.map((item: [string, number]) => item[1]);
        }
        // 添加y轴数据处理
        if (data.y) {
            chartData.y.times = data.y.map((item: [string, number]) => item[0]);
            chartData.y.values = data.y.map((item: [string, number]) => item[1]);
        }
        if (data.z) {
            chartData.z.times = data.z.map((item: [string, number]) => item[0]);
            chartData.z.values = data.z.map((item: [string, number]) => item[1]);
        }
      } else if (selectedDeviceType.value === 'strainGauge') {
        if (data.ch1) {
            chartData.ch1.times = data.ch1.map((item: [string, number]) => item[0]);
            chartData.ch1.values = data.ch1.map((item: [string, number]) => item[1]);
        }
        if (data.ch2) {
            chartData.ch2.times = data.ch2.map((item: [string, number]) => item[0]);
            chartData.ch2.values = data.ch2.map((item: [string, number]) => item[1]);
        }
      }
      
      console.log("合并后的图表数据:", chartData);
      
      // 确保在绘制前切换到all标签页
      activeTab.value = 'all';
      
      // 等待DOM更新后再绘制
      await nextTick();
      drawTimeChart1(chartData);
      
    } else {
      ElMessage.error('数据请求失败');
    }
  } catch (error) {
    console.error("获取数据失败:", error);
  }
};

const dataSourceName = (): string => {
  switch(dataSource.value) {
    case 'api_minute': return '分钟级';
    case 'api_hour': return '小时级';
    case 'api_day': return '天级';
    case 'api_month': return '月级';
    case 'api_year': return '年级';
    case 'api_second': return '秒级';
    case 'api_week': return '周级';
    default: return '';
  }
};

const getTimeRangeForThresholdCheck = () => {
  const now = new Date();
  const twentySecondsAgo = new Date(now.getTime() - 20 * 1000);
  
  const formatDate = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  
  return {
    startTime: formatDate(twentySecondsAgo),
    endTime: formatDate(now)
  };
};

const handleResize = () => {
  Object.values(charts.value).forEach(chart => {
    if (chart) {
      chart.resize();
    }
  });
};

// 监听设备类型变化，重置标签页
watch(selectedDeviceType, (newType) => {
  activeTab.value = 'all';
  chartOptions.value = {}; // 清空预处理配置
  
  nextTick(() => {
    initializeCharts();
    if (accumulatedData.value) {
      drawAllCharts();
    }
  });
});

onMounted(() => {
  initializeCharts();
  dataSource.value = selectedDataSource.value as 'api_second' | 'api_minute' | 'api_hour' | 'api_day' | 'api_week' | 'api_month' | 'api_year';
  window.addEventListener('resize', handleResize);
  fetchDevices();
});

onBeforeUnmount(() => {
  stopAllPolling();
  window.removeEventListener('resize', handleResize);
  
  Object.values(charts.value).forEach(chart => {
    if (chart) {
      chart.dispose();
    }
  });
});

watch([selectedDevice, dataSource], async ([newDevice, newDataSource], [oldDevice, oldDataSource]) => {
  console.log(`watch检测到变化: 
    数据源: ${oldDataSource} -> ${newDataSource}
    设备: ${oldDevice} -> ${newDevice}`
  );

  if (newDevice) {
    chartOptions.value = {}; // 清空预处理配置
    // 确保激活all标签页
    activeTab.value = 'all';
  }
  
  await switchDataSourceMode(newDataSource as 'api_minute' | 'api_hour' | 'api_day' | 'api_month' | 'api_year', false);
});

watch(selectedDevice, (newDevice) => {
  if (newDevice) {
    selectedDeviceType.value = newDevice.includes('Y') ? 'strainGauge' : 'accelerometer';
    // 设备变化时确保显示all标签页
    activeTab.value = 'all';
  }
});
</script>

<style scoped>
.chart-tabs {
  width: 100%;
  height: 100%;
}

.tab-nav {
  display: flex;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 20px;
  background-color: #f8fafc;
  border-radius: 8px 8px 0 0;
  padding: 4px;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background-color: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  border-radius: 6px;
  margin-right: 4px;
  position: relative;
}

.tab-button:hover {
  background-color: #e2e8f0;
  color: #374151;
}

.tab-button.active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.tab-content {
  position: relative;
  height: 600px;
}

.chart-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

#main {
  margin: 20px;
  width: 90%;
  padding: 30px;
}

.back-to-main-btn {
  margin: 0px;
  align-self: flex-start;
}

:deep(.el-cascader) {
  width: 100%;
}
</style>