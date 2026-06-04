<template>
    <div id="app">
      <header class="header">
        <nav class="navbar navbar-expand-lg px-4 py-2 bg-white shadow">
          <a href="#" class="sidebar-toggler text-gray-500 mr-4 mr-lg-5 lead">
            <i class="fat">图标</i>
          </a>
          <a href="#" class="navbar-brand font-weight-bold text-uppercase" style="font-size: 25px;">导航栏</a>
          <ul class="ml-auto d-flex align-items-center list-unstyled mb-0">
            <li class="nav-item" v-for="action in navActions" :key="action.title">
              <a :href="action.link" :title="action.title" class="sidebar-link text-muted height50 r" @click="action.handler">
                <i :class="action.iconClass" aria-hidden="true"></i>
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <div id="mainBody">
        <!-- 主要内容 -->
        <div id="addDevice" class="height50">
          <!-- 设备选择区域 -->
          <div v-for="device in devices" :key="device.id" class="deviceSelShow" @click="selectDevice(device)">
            {{ device.name }}
          </div>
        </div>
        <div id="deviceControl" v-show="showDeviceControl">
          <!-- 设备控制区域 -->
          <button @click="sendOrder">发送命令</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import * as echarts from 'echarts';
  
  // 假设 realTimeSocket.js, realTimeJsNew.js, deviceControl.js 的内容已经合并在一起
  import L_REALTIME from './realTimeSocket';
  import { getDeviceDetails, sendControlCommand } from './realTimeJsNew';
  
  export default {
    name: 'DeviceControlApp',
    data() {
      return {
        devices: [
          { id: 1, name: '设备 1' },
          { id: 2, name: '设备 2' },
        ],
        showDeviceControl: false,
        navActions: [
          {
            link: 'javascript:void(0);',
            title: '清除浏览器缓存',
            iconClass: 'fa fa-recycle iClass',
            handler: () => this.clearBrowser(),
          },
          // 其他操作
        ],
      };
    },
    methods: {
      selectDevice(device) {
        console.log('选择的设备:', device);
        this.getDeviceDetails(device);
      },
      sendOrder() {
        console.log('发送命令');
        this.sendControlCommand();
      },
      clearBrowser() {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
              registration.unregister();
            }
            alert('内存清除成功！');
          });
        }
      },
      initializeCharts() {
        this.chartCalendar = echarts.init(document.getElementById('calendarChart'));
        this.chartSpectrum = echarts.init(document.getElementById('spectrumChart'));
        this.initializeSocketConnection();
      },
      resizeCharts() {
        if (this.chartCalendar) this.chartCalendar.resize();
        if (this.chartSpectrum) this.chartSpectrum.resize();
      },
      openDeviceControl() {
        this.showDeviceControl = !this.showDeviceControl;
      },
      initializeSocketConnection() {
        // 使用 realTimeSocket.js 中的 socket 连接逻辑
        console.log('初始化 Socket 连接');
        if (typeof L_REALTIME !== 'undefined') {
          const client = L_REALTIME.getRabbitConnect();
          window.client = client;
          L_REALTIME.initRabbitMQConnect(client);
          client.debug = null; // 禁止打印日志信息
        } else {
          console.error('L_REALTIME 未定义，无法初始化 Socket 连接');
        }
      },
      getDeviceDetails(device) {
        // 使用 realTimeJsNew.js 中的获取设备信息的逻辑
        getDeviceDetails(device);
      },
      sendControlCommand() {
        // 使用 deviceControl.js 中的发送控制命令逻辑
        sendControlCommand();
      },
    },
    mounted() {
      this.initializeCharts();
      window.addEventListener('resize', this.resizeCharts);
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.resizeCharts);
    },
  };
  </script>
  
  <style scoped>
  .height50 {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .deviceSelShow {
    width: 120px;
    height: 50px;
    margin: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    float: left;
    background-color: #e2e3e3;
    font-size: 18px;
    border-radius: 5px;
  }
  .deviceSelShow:hover {
    color: red;
  }
  </style>
  