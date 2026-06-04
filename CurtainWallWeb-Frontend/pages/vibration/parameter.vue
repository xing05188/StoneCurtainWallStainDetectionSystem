<template>
  <div class="page-shell">
    <div class="top-action">
      <el-button type="primary" @click="backToMain">返回主页</el-button>
    </div>

    <UForm :state="formState" class="page-body">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">设备选择</p>
            <h1>人工阈值设置</h1>
          </div>
          <div class="status-chip">
            当前生效来源
            <strong>人工设置</strong>
          </div>
        </div>

        <div class="building-grid">
          <article v-for="building in buildingNames" :key="building" class="building-card">
            <h2>{{ building }}</h2>
            <div class="device-grid">
              <button
                v-for="device in devicesByBuilding(building)"
                :key="device.value"
                type="button"
                class="device-button"
                :class="{
                  active: selectedDevice.value === device.value,
                  strain: device.type === 'strainGauge',
                }"
                @click="selectDevice(device)"
              >
                <span>{{ device.label }}</span>
                <small>{{ device.type === 'accelerometer' ? '加速度计' : '应变计' }}</small>
              </button>
            </div>
          </article>
        </div>

        <div class="summary-card">
          <div>
            <p class="summary-label">当前设备</p>
            <h2>{{ selectedDevice.label }}</h2>
            <p class="summary-text">{{ currentStatusText }}</p>
          </div>
          <div class="summary-meta">
            <div>
              <span>设备类型</span>
              <strong>{{ selectedDevice.type === "accelerometer" ? "加速度计" : "应变计" }}</strong>
            </div>
            <div>
              <span>数据来源</span>
              <strong>{{ currentDataSource }}</strong>
            </div>
            <div>
              <span>最后同步</span>
              <strong>{{ lastSyncedAt }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">真实业务闭环</p>
            <h2>查询与保存人工上下限</h2>
          </div>
        </div>

        <div class="note-card">
          当前页面只填写业务上的上限和下限。保存时会自动换算到底层字段：
          offset = (上限 + 下限) / 2，limit = (上限 - 下限) / 2。
        </div>

        <div v-for="channel in visibleChannels" :key="channel.key" class="channel-card">
          <div class="channel-header">
            <div>
              <h3>{{ channel.label }}</h3>
              <p>{{ channel.description }}</p>
            </div>
            <span class="channel-tag">已按上下限展示</span>
          </div>

          <div class="limit-grid">
            <article class="limit-panel current-panel">
              <div class="panel-title">
                <h4>当前值</h4>
                <span>接口返回</span>
              </div>
              <div class="metric-row">
                <span>上限</span>
                <strong>{{ formatValue(currentLimits[channel.key].upper) }}</strong>
              </div>
              <div class="metric-row">
                <span>下限</span>
                <strong>{{ formatValue(currentLimits[channel.key].lower) }}</strong>
              </div>
              <div class="metric-row sub-row">
                <span>offset</span>
                <span>{{ formatValue(currentLimits[channel.key].offset) }}</span>
              </div>
              <div class="metric-row sub-row">
                <span>limit</span>
                <span>{{ formatValue(currentLimits[channel.key].threshold) }}</span>
              </div>
            </article>

            <article class="limit-panel edit-panel">
              <div class="panel-title">
                <h4>人工设置</h4>
                <span>保存到后端</span>
              </div>

              <label class="field-row">
                <span>上限</span>
                <UInput v-model="manualLimits[channel.key].upper" type="number" />
              </label>
              <label class="field-row">
                <span>下限</span>
                <UInput v-model="manualLimits[channel.key].lower" type="number" />
              </label>

              <div class="metric-row sub-row">
                <span>换算 offset</span>
                <span>{{ formatValue(getManualCalibrationPreview(channel.key)?.offset) }}</span>
              </div>
              <div class="metric-row sub-row">
                <span>换算 limit</span>
                <span>{{ formatValue(getManualCalibrationPreview(channel.key)?.threshold) }}</span>
              </div>
            </article>

          </div>
        </div>

        <div class="action-bar">
          <UButton color="gray" variant="soft" :loading="loadingFetch" @click="fetchThresholds">
            重新查询当前上下限
          </UButton>
          <UButton color="primary" :loading="loadingCalibration" @click="applyManualLimits">
            保存人工上下限
          </UButton>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">固定派生规则</p>
            <h2>三级预警规则</h2>
          </div>
        </div>

        <div class="note-card">
          预警等级按实际值偏离中心值的程度派生，中心值 = (上限 + 下限) / 2。
          一级预警 = limit 的 100%，二级预警 = 75%，三级预警 = 50%。邮件发送频率先由后端统一控制。
        </div>

        <div class="rule-grid">
          <article v-for="rule in levelRuleCards" :key="rule.level" class="rule-card">
            <div class="rule-head">
              <strong>{{ rule.label }}</strong>
              <span>{{ rule.ratioText }}</span>
            </div>
            <p>{{ rule.description }}</p>
            <div class="metric-row sub-row">
              <span>通知策略</span>
              <span>{{ rule.cooldownText }}</span>
            </div>
          </article>
        </div>

        <div class="derived-grid">
          <article v-for="channel in derivedThresholdCards" :key="channel.key" class="derived-card">
            <div class="panel-title">
              <h4>{{ channel.label }}</h4>
              <span>自动派生</span>
            </div>
            <div class="metric-row">
              <span>基准阈值</span>
              <strong>{{ formatValue(channel.baseThreshold) }}</strong>
            </div>
            <div class="metric-row sub-row">
              <span>一级预警（100%）</span>
              <span>{{ formatValue(channel.level1Threshold) }}</span>
            </div>
            <div class="metric-row sub-row">
              <span>二级预警（75%）</span>
              <span>{{ formatValue(channel.level2Threshold) }}</span>
            </div>
            <div class="metric-row sub-row">
              <span>三级预警（50%）</span>
              <span>{{ formatValue(channel.level3Threshold) }}</span>
            </div>
          </article>
        </div>
      </section>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import {
  defaultVibrationAlertConfig,
  deriveThresholdsFromBase,
} from "~/composables/useVibrationAlertConfig";

const API_BASE_URL = "http://8.153.161.229:8009";
const router = useRouter();
const formState = reactive({});

type DeviceType = "accelerometer" | "strainGauge";
type ChannelKey = "x" | "y" | "z" | "ch1" | "ch2";

interface DeviceOption {
  value: string;
  label: string;
  building: string;
  type: DeviceType;
}

interface ChannelDefinition {
  key: ChannelKey;
  label: string;
  description: string;
}

interface LimitState {
  upper: number;
  lower: number;
  offset: number;
  threshold: number;
}

interface ManualLimitState {
  upper: number | string;
  lower: number | string;
}

const deviceOptions: DeviceOption[] = [
  { value: "衷和楼#1G", label: "衷和楼#1G", building: "衷和楼", type: "accelerometer" },
  { value: "衷和楼#1H", label: "衷和楼#1H", building: "衷和楼", type: "accelerometer" },
  { value: "衷和楼#2I", label: "衷和楼#2I", building: "衷和楼", type: "accelerometer" },
  { value: "衷和楼#2J", label: "衷和楼#2J", building: "衷和楼", type: "accelerometer" },
  { value: "衷和楼测点7", label: "衷和楼测点7", building: "衷和楼", type: "accelerometer" },
  { value: "衷和楼#2Y", label: "衷和楼#2Y", building: "衷和楼", type: "strainGauge" },
  { value: "安楼外幕墙1A", label: "安楼外幕墙1A", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙1B", label: "安楼外幕墙1B", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙1C", label: "安楼外幕墙1C", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙2D", label: "安楼外幕墙2D", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙2E", label: "安楼外幕墙2E", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙2F", label: "安楼外幕墙2F", building: "安楼", type: "accelerometer" },
  { value: "安楼外幕墙2Y", label: "安楼外幕墙2Y", building: "安楼", type: "strainGauge" },
];

const channelDefinitions: Record<ChannelKey, ChannelDefinition> = {
  x: { key: "x", label: "X 轴", description: "加速度计 X 轴通道的当前上下限与人工设置。" },
  y: { key: "y", label: "Y 轴", description: "加速度计 Y 轴通道的当前上下限与人工设置。" },
  z: { key: "z", label: "Z 轴", description: "加速度计 Z 轴通道的当前上下限与人工设置。" },
  ch1: { key: "ch1", label: "Ch1", description: "应变计 Channel 1 的当前上下限与人工设置。" },
  ch2: { key: "ch2", label: "Ch2", description: "应变计 Channel 2 的当前上下限与人工设置。" },
};

const buildingNames = ["衷和楼", "安楼"];
const selectedDevice = ref<DeviceOption>(deviceOptions[0]);
const loadingFetch = ref(false);
const loadingCalibration = ref(false);

const currentDataSource = ref("/data/get_threshold_or_offset");
const lastSyncedAt = ref("尚未同步");
const currentStatusText = ref("请选择设备并查询当前上下限。");

const createLimitMap = () => ({
  x: { upper: 0, lower: 0, offset: 0, threshold: 0 },
  y: { upper: 0, lower: 0, offset: 0, threshold: 0 },
  z: { upper: 0, lower: 0, offset: 0, threshold: 0 },
  ch1: { upper: 0, lower: 0, offset: 0, threshold: 0 },
  ch2: { upper: 0, lower: 0, offset: 0, threshold: 0 },
});

const createManualLimitMap = () => ({
  x: { upper: 0, lower: 0 },
  y: { upper: 0, lower: 0 },
  z: { upper: 0, lower: 0 },
  ch1: { upper: 0, lower: 0 },
  ch2: { upper: 0, lower: 0 },
});

const currentLimits = reactive<Record<ChannelKey, LimitState>>(createLimitMap());
const manualLimits = reactive<Record<ChannelKey, ManualLimitState>>(createManualLimitMap());

const visibleChannels = computed(() =>
  selectedDevice.value.type === "accelerometer"
    ? [channelDefinitions.x, channelDefinitions.y, channelDefinitions.z]
    : [channelDefinitions.ch1, channelDefinitions.ch2]
);

const levelRuleCards = [
  {
    level: "level1",
    label: "一级预警",
    ratioText: "生效阈值的 100%",
    description: "达到当前人工生效阈值时触发，等级最高。",
    cooldownText: "邮件频率由后端统一硬编码控制",
  },
  {
    level: "level2",
    label: "二级预警",
    ratioText: "生效阈值的 75%",
    description: "在正式超过人工阈值前提前提醒，作为中等级别预警。",
    cooldownText: "邮件频率由后端统一硬编码控制",
  },
  {
    level: "level3",
    label: "三级预警",
    ratioText: "生效阈值的 50%",
    description: "用于最早期提醒，便于在趋势积累前发现风险。",
    cooldownText: "邮件频率由后端统一硬编码控制",
  },
];

const derivedThresholdCards = computed(() =>
  visibleChannels.value.map((channel) => ({
    key: channel.key,
    label: channel.label,
    ...deriveThresholdsFromBase(
      currentLimits[channel.key].threshold,
      defaultVibrationAlertConfig
    ),
  }))
);

const devicesByBuilding = (buildingName: string) =>
  deviceOptions.filter((device) => device.building === buildingName);

const roundValue = (value: number, digits = 6) => Number(value.toFixed(digits));

const formatValue = (value: number | string | null | undefined, digits = 6) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(digits);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : value;
  }

  return "--";
};

const formatTimestamp = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

const backToMain = () => {
  router.push("/");
};

const setCurrentChannel = (key: ChannelKey, offset: number, threshold: number) => {
  const normalizedOffset = roundValue(Number(offset) || 0);
  const normalizedThreshold = roundValue(Math.abs(Number(threshold) || 0));

  currentLimits[key].offset = normalizedOffset;
  currentLimits[key].threshold = normalizedThreshold;
  currentLimits[key].upper = roundValue(normalizedOffset + normalizedThreshold);
  currentLimits[key].lower = roundValue(normalizedOffset - normalizedThreshold);
};

const syncManualChannelFromCurrent = (key: ChannelKey) => {
  manualLimits[key].upper = currentLimits[key].upper;
  manualLimits[key].lower = currentLimits[key].lower;
};

const resetAllChannels = () => {
  (Object.keys(currentLimits) as ChannelKey[]).forEach((key) => {
    setCurrentChannel(key, 0, 0);
    syncManualChannelFromCurrent(key);
  });
};

const parseManualCalibration = (key: ChannelKey) => {
  const upper = Number(manualLimits[key].upper);
  const lower = Number(manualLimits[key].lower);

  if (!Number.isFinite(upper) || !Number.isFinite(lower) || upper <= lower) {
    return null;
  }

  return {
    upper: roundValue(upper),
    lower: roundValue(lower),
    offset: roundValue((upper + lower) / 2),
    threshold: roundValue(Math.abs(upper - lower) / 2),
  };
};

const getManualCalibrationPreview = (key: ChannelKey) => parseManualCalibration(key);

const fetchThresholds = async () => {
  loadingFetch.value = true;
  currentStatusText.value = `正在查询 ${selectedDevice.value.label} 的当前上下限...`;

  try {
    const response = await axios.get(`${API_BASE_URL}/data/get_threshold_or_offset`, {
      params: {
        device_name: selectedDevice.value.value,
        device_type: selectedDevice.value.type,
      },
    });

    if (response.data.status !== "success") {
      currentStatusText.value = "接口已响应，但没有返回有效的上下限信息。";
      ElMessage.error("获取上下限失败");
      return;
    }

    const data = response.data.data ?? {};
    resetAllChannels();

    if (selectedDevice.value.type === "accelerometer") {
      setCurrentChannel("x", Number(data.x_offset ?? 0), Number(data.x_limit ?? 0));
      setCurrentChannel("y", Number(data.y_offset ?? 0), Number(data.y_limit ?? 0));
      setCurrentChannel("z", Number(data.z_offset ?? 0), Number(data.z_limit ?? 0));
      syncManualChannelFromCurrent("x");
      syncManualChannelFromCurrent("y");
      syncManualChannelFromCurrent("z");
    } else {
      setCurrentChannel("ch1", Number(data.ch1_offset ?? 0), Number(data.ch1_limit ?? 0));
      setCurrentChannel("ch2", Number(data.ch2_offset ?? 0), Number(data.ch2_limit ?? 0));
      syncManualChannelFromCurrent("ch1");
      syncManualChannelFromCurrent("ch2");
    }

    currentDataSource.value = "/data/get_threshold_or_offset";
    lastSyncedAt.value = formatTimestamp(new Date());
    currentStatusText.value = `${selectedDevice.value.label} 的当前上下限已同步，可以继续人工调整，并按固定比例查看三级预警。`;
  } catch (error) {
    console.error("获取上下限失败:", error);
    currentDataSource.value = "接口获取失败";
    lastSyncedAt.value = formatTimestamp(new Date());
    currentStatusText.value = "当前上下限获取失败，页面保留本地编辑值。";
    ElMessage.error("获取上下限失败");
  } finally {
    loadingFetch.value = false;
  }
};

const updateSingle = async (item: {
  device_name: string;
  type: string;
  value: number | string;
}) => {
  const response = await fetch(
    `${API_BASE_URL}/data/update_threshold_or_offset?device_name=${encodeURIComponent(
      item.device_name
    )}&type=${encodeURIComponent(item.type)}&value=${encodeURIComponent(item.value)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  return response.ok;
};

const applyManualLimits = async () => {
  loadingCalibration.value = true;

  try {
    const channelCalibrations = visibleChannels.value.map((channel) => {
      const parsed = parseManualCalibration(channel.key);
      if (!parsed) {
        throw new Error(`${channel.label} 的上下限输入无效，请确认上限必须大于下限。`);
      }

      return {
        key: channel.key,
        ...parsed,
      };
    });

    const updates = channelCalibrations.flatMap((item) => [
      { device_name: selectedDevice.value.value, type: `${item.key}_offset`, value: item.offset },
      { device_name: selectedDevice.value.value, type: `${item.key}_limit`, value: item.threshold },
    ]);

    const results = await Promise.all(updates.map(updateSingle));

    if (!results.every(Boolean)) {
      ElMessage.warning("部分上下限更新失败，请检查网络连接。");
      return;
    }

    channelCalibrations.forEach((item) => {
      setCurrentChannel(item.key, item.offset, item.threshold);
      syncManualChannelFromCurrent(item.key);
    });

    currentDataSource.value = "人工设置已提交到现有接口";
    lastSyncedAt.value = formatTimestamp(new Date());
    currentStatusText.value = `${selectedDevice.value.label} 的人工上下限已保存。`;
    ElMessage.success(`${selectedDevice.value.label} 的人工上下限已保存`);
  } catch (error) {
    console.error("保存人工上下限失败:", error);
    ElMessage.error(error instanceof Error ? error.message : "保存人工上下限失败");
  } finally {
    loadingCalibration.value = false;
  }
};

const selectDevice = async (device: DeviceOption) => {
  selectedDevice.value = device;
  resetAllChannels();
  currentDataSource.value = "/data/get_threshold_or_offset";
  lastSyncedAt.value = "查询中";
  currentStatusText.value = `已切换到 ${device.label}，正在查询当前上下限。`;
  ElMessage.info(`已选择 ${device.label}`);
  await fetchThresholds();
};

onMounted(async () => {
  await fetchThresholds();
});
</script>

<style scoped>
.page-shell {
  /* 在振动中心布局内由父级 overflow-y-auto 承载滚动，此处不锁死 100vh，便于滚轮滑完整页 */
  min-height: min-content;
  background:
    radial-gradient(circle at top right, rgba(22, 163, 74, 0.1), transparent 26%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  padding: 56px 16px 32px;
}

.top-action {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.page-body {
  max-width: 1160px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.panel-heading h1,
.panel-heading h2 {
  margin: 4px 0 0;
  font-size: 24px;
  color: #0f172a;
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #16a34a;
  text-transform: uppercase;
}

.status-chip {
  min-width: 180px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 12px 14px;
  color: #166534;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-chip strong {
  font-size: 18px;
}

.building-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.building-card {
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.building-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #0f172a;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.device-button {
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: 0.2s ease;
}

.device-button span {
  font-weight: 700;
  color: #0f172a;
}

.device-button small {
  color: #64748b;
}

.device-button.active {
  border-color: #16a34a;
  box-shadow: 0 10px 20px rgba(22, 163, 74, 0.14);
  transform: translateY(-1px);
}

.device-button.strain.active {
  border-color: #d97706;
  box-shadow: 0 10px 20px rgba(217, 119, 6, 0.16);
}

.summary-card {
  margin-top: 18px;
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #f8fafc;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 18px;
}

.summary-card h2 {
  margin: 6px 0 8px;
  font-size: 28px;
}

.summary-label {
  margin: 0;
  color: #94a3b8;
}

.summary-text {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.summary-meta {
  display: grid;
  gap: 12px;
}

.summary-meta div {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 14px;
}

.summary-meta span {
  display: block;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-meta strong {
  color: #f8fafc;
}

.note-card {
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #dbeafe;
  padding: 14px 16px;
  color: #334155;
  line-height: 1.7;
  margin-bottom: 18px;
}

.channel-card + .channel-card {
  margin-top: 18px;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.channel-header h3 {
  margin: 0 0 6px;
  color: #0f172a;
}

.channel-header p {
  margin: 0;
  color: #64748b;
}

.channel-tag {
  background: #dcfce7;
  color: #166534;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
}

.limit-grid,
.rule-grid,
.derived-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.limit-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.limit-panel,
.rule-card,
.derived-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
}

.current-panel {
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.edit-panel {
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
}

.panel-title,
.rule-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-title h4,
.rule-head strong {
  margin: 0;
  color: #0f172a;
}

.panel-title span,
.rule-head span {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.metric-row,
.field-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.metric-row + .metric-row,
.field-row + .field-row {
  margin-top: 12px;
}

.metric-row strong {
  color: #0f172a;
}

.sub-row {
  color: #64748b;
  font-size: 14px;
}

.field-row span {
  min-width: 48px;
  color: #334155;
}

.action-bar {
  margin-top: 18px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .building-grid,
  .summary-card,
  .limit-grid,
  .rule-grid,
  .derived-grid {
    grid-template-columns: 1fr;
  }

  .panel-heading,
  .channel-header {
    flex-direction: column;
  }
}
</style>
