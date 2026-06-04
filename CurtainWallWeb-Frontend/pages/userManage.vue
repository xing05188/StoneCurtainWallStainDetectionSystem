<template>
  <div class="page">
    <div class="search_container">
      <el-input
        v-model="searchInput"
        placeholder="请输入用户邮箱"
        clearable
        style="width: 300px; margin-right: 10px"
        @keyup.enter="getAllPermission"
      ></el-input>
      <el-button type="primary" @click="getAllPermission">搜索</el-button>
    </div>

    <!-- 权限表格 -->
    <div class="table_container">
      <el-table
        border
        :data="paginatedList"
        style="width: 100%"
        table-layout="auto"
      >
        <el-table-column prop="email" label="Email"></el-table-column>
        <el-table-column label="转让管理员">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_superuser"
              @change="() => handleSwitchChange(row, 'is_superuser','table')"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="幕墙韧性评估权限" prop="access_system_a">
          <template #default="{ row }">
            <el-switch
              v-model="row.access_system_a"
              @change="() => handleSwitchChange(row, 'access_system_a','table')"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="石材污渍权限" prop="access_system_b">
          <template #default="{ row }">
            <el-switch
              v-model="row.access_system_b"
              @change="() => handleSwitchChange(row, 'access_system_b','table')"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="石材裂缝权限" prop="access_system_c">
          <template #default="{ row }">
            <el-switch
              v-model="row.access_system_c"
              @change="() => handleSwitchChange(row, 'access_system_c','table')"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="震动数据检测权限" prop="access_system_v">
          <template #default="{ row }">
            <el-switch
              v-model="row.access_system_v"
              @change="() => handleSwitchChange(row, 'access_system_v','table')"
            ></el-switch>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <el-pagination
        background
        layout="prev, pager, next"
        :total="itemList.length"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="val => currentPage = val"
        style="margin: 1em auto; text-align: center;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import axios from "axios";

const searchInput = ref("");
const itemList = ref([]);
const currentPage = ref(1);
const pageSize = 10;

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return itemList.value.slice(start, end);
});

const handleSwitchChange = async (item, key, updatemethod) => {
  let currentUserEmail = localStorage.getItem("email");
  if (!currentUserEmail) {
    try {
      const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      currentUserEmail = storedUser?.email || storedUser?.username || '';
    } catch {
      currentUserEmail = '';
    }
  }


  // 管理员权限转让逻辑
  if (key === 'is_superuser' && item[key]) {
    const confirm = await ElMessageBox.confirm(
      `确定要将管理员权限转让给 ${item.email} 吗？此操作将撤销你自己的管理员权限。`,
      '确认转让管理员权限',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).catch(() => null);

    if (!confirm) {
      item[key] = false;
      return;
    }

    const dataToSend = {
      [item.email]: {
        is_superuser: true,
        method: updatemethod,
      },
      [currentUserEmail]: {
        is_superuser: false,
        method: updatemethod,
      },
    };

    console.log("准备发送的管理员转让数据:", dataToSend);

    try {
      const response = await $fetch("/api/account/super/updatePermission", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: dataToSend,
      });

      console.log("转让接口响应:", response);

      ElMessage.success("管理员权限转让成功");
      await getAllPermission(); // 重新获取数据
    } catch (error) {
      console.error("转让请求出错:", error);
      ElMessage.error("权限转让失败");
      item[key] = false;
    }
    return;
  }

  // 其他权限处理逻辑
  if (item.is_superuser && key !== 'is_superuser') {
    ElMessage.warning("管理员固定获得全部权限，不可修改");
    await nextTick();
    item[key] = !item[key];
    return;
  }

  const dataToSend = {
    [item.email]: {
      [key]: item[key],
      method: updatemethod,
    },
  };

  try {
    const response = await $fetch("/api/account/super/updatePermission", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: dataToSend,
    });
    ElMessage.success("权限修改成功");
    itemList.value = itemList.value.map(user =>
      user.email === item.email ? { ...user, [key]: item[key] } : user
    );
  } catch (error) {
    console.error(error);
    ElMessage.error("权限修改出错");
  }
};


const getAllPermission = async () => {
  try {
    const authToken = localStorage.getItem("authToken");
    const queryParam = searchInput.value ? `?username=${searchInput.value}` : "";
    const response = await axios.get(`/api/account/super/getUserPermissions${queryParam}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.status === 200) {
      const data = response.data?.data;
      if (data) {
        itemList.value = Object.entries(data).map(([email, permissions]) => ({
          email,
          ...permissions,
        }));
        currentPage.value = 1; // 搜索后重置页码
      } else {
        console.warn("后端返回数据为空或格式不正确:", response.data);
        itemList.value = [];
      }
    } else {
      ElMessage.error("获取权限失败");
    }
  } catch (error) {
    console.error("详细错误信息:", error);
    const msg = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : `未预料到的错误: ${error.message}`;
    ElMessage.error(msg);
  }
};

getAllPermission();
</script>

<style scoped>
.page {
  background-size: cover;
  height: 100%;
  width: 100%;
}

.table_container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 4em;
  padding: 1em;
  overflow: auto;
  height: 85vh;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.search_container {
  display: flex;
  justify-content: center;
  margin-top: 2em;
}
</style>