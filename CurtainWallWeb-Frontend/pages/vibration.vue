<template>
  <UDashboardPage>
    <!-- 让长页面（预警规则、服务器监控等）在振动中心内部滚动，避免内容被截断。 -->
    <UDashboardPanel grow class="!flex !min-h-0 !flex-col">
      <UDashboardNavbar title="振动监测中心" />

      <UDashboardToolbar class="shrink-0 overflow-x-auto">
        <UHorizontalNavigation :links="links"/>
      </UDashboardToolbar>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <NuxtPage/>
      </div>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup lang="ts">
const links = [[
{
  id: 'dashboard',
  label: '监测总览',
  icon: 'i-heroicons-chart-bar',
  to: '/vibration/dashboard'
},
{
  id: 'realtime',
  label: '实时监测',
  icon: 'i-heroicons-signal',
  to: '/vibration',
  exact: true
},
{
  id: 'parameter',
  label: '预警规则',
  icon: 'i-heroicons-adjustments-horizontal',
  to: '/vibration/parameter'
},
{
  id: 'abnormal',
  label: '预警记录',
  icon: 'i-heroicons-exclamation-triangle',
  to: '/vibration/abnormal'
},
{
  id: 'server-monitor',
  label: '服务器监控',
  icon: 'i-heroicons-server-stack',
  to: '/vibration/server-monitor'
},
{
  id: 'agent',
  label: 'Agent 智能配置',
  icon: 'i-heroicons-sparkles',
  to: '/vibration/agent-chat'
}
]]
</script>