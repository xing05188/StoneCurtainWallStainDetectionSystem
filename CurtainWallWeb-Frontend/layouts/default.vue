<template>
  <UDashboardLayout>
    <UDashboardPanel :width="250" :resizable="{ min: 200, max: 300 }" collapsible>
      <UDashboardNavbar class="!border-transparent" :ui="{ left: 'flex-1' }">
        <template #left>
          <WebInfo />
        </template>
      </UDashboardNavbar>

      <UDashboardSidebar>
        <template #header>
          <UDashboardSearchButton />
        </template>

        <UDashboardSidebarLinks :links="links" />

        <UDivider />

        <div class="flex-1" />

        <UDashboardSidebarLinks :links="footerLinks" />

        <UDivider class="sticky bottom-0" />

        <template #footer>
          <UserDropdown />
        </template>
      </UDashboardSidebar>
    </UDashboardPanel>

    <slot />

    <HelpSlideover />

    <ClientOnly>
      <LazyUDashboardSearch :groups="groups" />
    </ClientOnly>
  </UDashboardLayout>
</template>

<script setup lang="ts">
import axios from "axios";
import { ElMessage } from "element-plus";

type DashboardLink = {
  id: string;
  label: string;
  icon?: string;
  to?: string;
  exact?: boolean;
  defaultOpen?: boolean;
  tooltip?: {
    text: string;
    shortcuts?: string[];
  };
  children?: any[];
};

const { isHelpSlideoverOpen } = useDashboard();

const links = reactive<DashboardLink[]>([
  {
    id: "home",
    label: "首页",
    icon: "i-heroicons-home",
    to: "/",
    tooltip: {
      text: "首页",
      shortcuts: ["G", "H"],
    },
  },
  {
    id: "wind",
    label: "幕墙振动监测",
    icon: "i-simple-icons-tailwindcss",
    to: "/vibration",
    defaultOpen: false,
    tooltip: {
      text: "振动数据监测",
    },
    children: [
      {
        id: "monitor",
        label: "监测中心",
        icon: "i-heroicons-chart-bar-square",
        to: "/vibration",
        defaultOpen: false,
        tooltip: {
          text: "监测中心",
          shortcuts: ["G", "M"],
        },
        children: [
          {
            label: "监测总览",
            to: "/vibration/dashboard",
          },
          {
            label: "实时监测",
            to: "/vibration",
            exact: true,
          },
          {
            label: "预警规则",
            to: "/vibration/parameter",
          },
          {
            label: "预警记录",
            to: "/vibration/abnormal",
          },
          {
            label: "服务器监控",
            to: "/vibration/server-monitor",
          },
          {
            label: "Agent 智能配置",
            to: "/vibration/agent-chat",
          },
        ],
      },
    ],
  },
  {
    id: "glassInspection",
    label: "玻璃智能检测",
    icon: "i-heroicons-viewfinder-circle",
    to: "/glass-inspection",
    defaultOpen: false,
    tooltip: {
      text: "玻璃检测",
    },
    children: [
      {
        id: "glassCrack",
        label: "玻璃自爆检测",
        to: "/glass-inspection/crack",
        exact: true,
      },
      {
        id: "glassFlatness",
        label: "玻璃平整度检测",
        to: "/glass-inspection/flatness",
      },
    ],
  },
  {
    id: "resilienceAssessment",
    label: "幕墙性能评估",
    icon: "i-simple-icons-testcafe",
    to: "/resilience",
    defaultOpen: false,
    tooltip: {
      text: "幕墙性能评估",
    },
    children: [
      {
        id: "dataset",
        label: "数据集管理",
        icon: "heroicons-solid:database",
        to: "/resilience/views/DataSetsView",
        defaultOpen: false,
        tooltip: {
          text: "数据集管理",
          shortcuts: ["G", "M"],
        },
      },
      {
        id: "analysisJob",
        label: "分析任务",
        icon: "heroicons-solid:calculator",
        to: "/resilience/views/DataSetsView",
        defaultOpen: false,
        tooltip: {
          text: "分析任务",
          shortcuts: ["G", "M"],
        },
        children: [
          {
            label: "模型列表",
            to: "/resilience/views/AnalysisModelsView",
          },
          {
            label: "任务管理",
            to: "/resilience/views/AnalysisJobView",
            exact: true,
          },
        ],
      },
      {
        id: "visualization",
        label: "可视化",
        icon: "heroicons-solid:computer-desktop",
        to: "/resilience/visualization",
        defaultOpen: false,
        tooltip: {
          text: "可视化",
          shortcuts: ["G", "M"],
        },
        children: [
          {
            label: "聚类分析",
            to: "/resilience/views/VisualizationClusterView",
          },
          {
            label: "雷达图",
            to: "/resilience/views/VisualizationRadarView",
          },
          {
            label: "热力图",
            to: "/resilience/views/VisualizationHeatMapView",
          },
          {
            label: "剖面分析",
            to: "/resilience/views/VisualizationSliceView",
          },
        ],
      },
      {
        id: "reports",
        label: "报告管理",
        icon: "heroicons-solid:document-report",
        to: "/resilience/reports",
        defaultOpen: false,
        tooltip: {
          text: "报告管理",
          shortcuts: ["G", "M"],
        },
        children: [
          {
            label: "报告生成",
            to: "/resilience/views/ReportsGenerateView",
          },
          {
            label: "历史报告",
            to: "/resilience/views/ReportsHistoryView",
            exact: true,
          },
        ],
      },
    ],
  },
  {
    id: "stoneDirty",
    label: "石材污损检测",
    to: "/stonedirty/mainpage",
    icon: "i-heroicons-fire",
    tooltip: {
      text: "石材污损检测",
    },
    defaultOpen: false,
    children: [
      {
        label: "上传图片",
        to: "/stonedirty/mainpage",
        exact: true,
      },
      {
        label: "历史图片",
        to: "/stonedirty/otherpage",
      },
      {
        label: "检测工作台",
        to: "/stonedirty/detection",
      },
      {
        label: "检测历史",
        to: "/stonedirty/history",
      },
    ],
  },
  {
    id: "corrosion",
    label: "金属幕墙锈蚀污损检测",
    to: "/corrosion",
    icon: "i-heroicons-fire",
    tooltip: {
      text: "金属幕墙锈蚀污损检测",
    },
    defaultOpen: false,
    children: [
      {
        label: "检测中心",
        to: "/corrosion",
        exact: true,
      },
      {
        label: "历史记录",
        to: "/corrosion/history",
      },
      {
        label: "日志中心",
        to: "/corrosion/logs",
      },
    ],
  },
  {
    id: "userManage",
    label: "用户管理",
    to: "/userManage",
    icon: "i-heroicons-book-open",
    tooltip: {
      text: "用户管理",
    },
  },
]);

const userAuth = ref({
  is_superuser: false,
  access_system_a: false,
  access_system_b: false,
  access_system_c: false,
  access_system_d: false,
  access_system_v: false,
  access_system_f: false,
  access_system_g: false,
  access_system_h: false,
  access_system_z: false,
});

function removeLinkById(linkId: string) {
  const index = links.findIndex((link) => link.id === linkId);
  if (index !== -1) {
    links.splice(index, 1);
  }
}

function removeChildLink(parentId: string, childId: string) {
  const parentLink = links.find((link) => link.id === parentId);
  if (!parentLink || !Array.isArray(parentLink.children)) {
    return;
  }

  parentLink.children = parentLink.children.filter((child: any) => child.id !== childId);
  if (parentLink.children.length === 0) {
    removeLinkById(parentId);
  }
}

const getUserAuth = async () => {
  try {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      return;
    }

    const response = await axios.get("/api/account/custom/getPermissions", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    userAuth.value = response.data.data;
    if (userAuth.value.is_superuser) {
      return;
    }

    if (!userAuth.value.access_system_a) {
      removeLinkById("resilienceAssessment");
    }
    if (!userAuth.value.access_system_b) {
      removeLinkById("stoneDirty");
    }
    if (!userAuth.value.access_system_c) {
      removeChildLink("glassInspection", "glassCrack");
    }
    if (!userAuth.value.access_system_v) {
      removeLinkById("wind");
    }
    if (!userAuth.value.access_system_g) {
      removeChildLink("glassInspection", "glassFlatness");
    }
    if (!userAuth.value.access_system_z) {
      removeLinkById("corrosion");
    }
    if (!userAuth.value.is_superuser) {
      removeLinkById("userManage");
    }
  } catch (error) {
    console.error("Failed to fetch permissions", error);
    ElMessage.error("获取用户权限失败");
  }
};

onMounted(() => {
  getUserAuth();
});

const footerLinks = [
  {
    label: "帮助与支持",
    icon: "i-heroicons-question-mark-circle",
    click: () => (isHelpSlideoverOpen.value = true),
  },
];

const groups = computed(() => [
  {
    key: "links",
    label: "Go to",
    commands: links.map((link) => ({
      ...link,
      shortcuts: link.tooltip?.shortcuts,
    })),
  },
  {
    key: "code",
    label: "Code",
    commands: [
      {
        id: "source",
        label: "GitHub",
        icon: "i-simple-icons-github",
        click: () => {
          window.open("https://github.com/CurtainWallMonitoringPlatform", "_blank");
        },
      },
    ],
  },
]);
</script>

<style>
.back-to-main-btn {
  margin: 5px;
  align-self: flex-end;
}
</style>