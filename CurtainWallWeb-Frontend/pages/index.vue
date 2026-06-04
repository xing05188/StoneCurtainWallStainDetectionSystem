<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="首页"></UDashboardNavbar>
      <div class="main-page">
        <UPageGrid class="custom-margin">
          <UPageCard v-for="(module, index) in modulesLine1" :key="index" v-bind="module"
                     @click="checkPermissionAndRedirect(module)" class="hover-effect bg-blue-100 dark:bg-slate-800"   >
            <template #icon>
              <UIcon :name="module.icon" class="text-[48px] text-primary" />
            </template>

            <template #title>
              <span class="text-[24px] font-bold">{{ module.title }}</span>
            </template>

            <template #description>
              <span class="line-clamp-2">{{ module.description }}</span>
            </template>
          </UPageCard>

          <UPageCard v-for="(module, index) in modulesLine2" :key="index" v-bind="module"
                     @click="checkPermissionAndRedirect(module)" class="hover-effect bg-blue-100 dark:bg-slate-800" >
            <template #icon>
              <UIcon :name="module.icon" class="text-[48px] text-primary" />
            </template>

            <template #title>
              <span class="text-[24px] font-bold">{{ module.title }}</span>
            </template>

            <template #description>
              <span class="line-clamp-2">{{ module.description }}</span>
            </template>
          </UPageCard>
          <UPageCard v-for="(module, index) in modulesLine3" :key="index" v-bind="module"
                     @click="checkPermissionAndRedirect(module)" class="hover-effect bg-blue-100 dark:bg-slate-800" >
            <template #icon>
              <UIcon :name="module.icon" class="text-[48px] text-primary" />
            </template>

            <template #title>
              <span class="text-[24px] font-bold">{{ module.title }}</span>
            </template>

            <template #description>
              <span class="line-clamp-2">{{ module.description }}</span>
            </template>
          </UPageCard>
          <UPageCard v-for="(module, index) in modulesLine4" :key="index" v-bind="module"
                     @click="checkPermissionAndRedirect(module)" class="hover-effect bg-blue-100 dark:bg-slate-800" >
            <template #description>
              <span class="line-clamp-2">{{ module.description }}</span>
            </template>
          </UPageCard>
        </UPageGrid>
      </div>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup>
import axios from "axios";
import {ref, reactive} from "vue";
import {ElMessage} from "element-plus";
import {useRouter} from "vue-router";

const router = useRouter();
const userAuth = ref({});

//definePageMeta({
//  middleware: "auth",
//});

const modulesLine1 = reactive([

  {
    title: "幕墙振动监测",
    description: "用于检测和展示幕墙的振动数据",
    target_address: "/vibration/dashboard",
    permissionKey: "access_system_v",
    icon: "i-simple-icons-tailwindcss",
  },
  {
    title: "石材裂缝检测",
    description: "用于识别建筑石材幕墙表面裂缝",
    target_address: "/crackdetect",
    permissionKey: "access_system_c",
    icon: "i-simple-icons-affinitypublisher",
  },
]);

const modulesLine2 = reactive([
  {
    title: "幕墙性能评估",
    description: "用于幕墙韧性多维数据分析评估和预警",
    target_address: "/resilience/views/DataSetsView",
    permissionKey: "access_system_a",
    icon: "i-simple-icons-testcafe",
  },
  {
    title: "石材污渍检测",
    description: "用于识别建筑石材幕墙表面污渍",
    target_address: "/stonedirty/mainpage",
    icon: "i-heroicons-fire",
    permissionKey: "access_system_b",
  },

]);

const modulesLine3 = reactive([
  {
    title: "玻璃自爆检测",
    description: "用于上传玻璃现场图像并完成疑似自爆特征、爆裂形态与破损区域识别。",
    target_address: "/glass-inspection/crack",
    permissionKey: "access_system_c",
    icon: "i-material-symbols-sound-detection-glass-break-rounded",
  },
  {
    title: "玻璃平整度检测",
    description: "用于上传四组图像并生成平整度结果图与 3D 粒子点云复核视图。",
    target_address: "/glass-inspection/flatness",
    permissionKey: "access_system_g",
    icon: "i-material-symbols-straighten-rounded",
  },
])

const modulesLine4 = reactive([
  {
    title: "金属幕墙锈蚀污损检测",
    description: "用于识别和分析金属幕墙锈蚀污损图像",
    target_address: "/corrosion",
    permissionKey: "access_system_z",
    icon: "i-heroicons-fire",
  },
  {
    title: "用户管理",
    description: "管理用户权限",
    target_address: "/userManage",
    permissionKey: "manage",
    icon: "i-heroicons-book-open",
    disabled: true,
  },
]);
const loadingAuth = ref(true); // 新增loading状态

onMounted(async () => {
  await getUserAuth();
  loadingAuth.value = false; // 权限加载完成
});

const getUserAuth = async () => {
  try {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      console.warn("authToken不存在");
      userAuth.value = {};
      return;
    }
    const response = await axios.get("/api/account/custom/getPermissions", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    userAuth.value = response.data.data || {};
    console.log("userAuth:", userAuth.value);
  } catch (error) {
    console.error("获取权限失败:", error);
    userAuth.value = {};
  }
};

const checkPermissionAndRedirect = (module) => {
  if (loadingAuth.value) {
    ElMessage.warning("权限信息加载中，请稍后...");
    return; // 权限没加载完，阻止操作
  }
  if (module.permissionKey == "") {
    router.push({ path: module.target_address });
    return;
  }
  if (module.permissionKey == "manage" && userAuth.value.is_superuser) {
    router.push({ path: module.target_address });
    return;
  }
  if (userAuth.value.is_superuser || userAuth.value[module.permissionKey]) {
    router.push({ path: module.target_address });
  } else {
    router.push({ path: module.target_address });
    // ElMessage.error("您没有权限访问此模块");
  }
};
</script>

<style scoped>

/* 放大图标大小 */
::v-deep(.u-page-card .text-3xl) {
  font-size: 36px !important; /* 默认约为24px，这里放大到36px */
}

/* 放大标题字体 */
::v-deep(.u-page-card .text-primary) {
  font-size: 20px !important;
  font-weight: 700 !important;
}


.main-page {
  overflow: auto
}

.custom-margin {
  margin: 50px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); /* 这里280px是每列的最小宽度 */
  gap: 50px; /* 卡片间距 */
}

.hover-effect:hover {
  background-color: #f0f0f0;
  cursor: pointer;
  box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
}

.back-to-main-btn {
  margin: 5px;
  align-self: flex-end;
  /* 对齐到容器的左侧 */
}
</style>
