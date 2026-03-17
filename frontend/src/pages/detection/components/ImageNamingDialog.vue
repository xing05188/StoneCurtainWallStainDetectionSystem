<script setup lang="ts">
import type * as Detection from "@/common/apis/detection/type"

interface Props {
  modelValue: boolean
  file: File | null
  imagePreview?: string
}

interface ConfirmData {
  customName: string
  formData: Detection.CreateDetectionPayload
}

const props = defineProps<Props>()
const emits = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "confirm", data: ConfirmData): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set(value) {
    emits("update:modelValue", value)
  }
})

const customName = ref("")
const form = reactive({
  buildingName: "",
  locationFloor: undefined as number | undefined,
  locationSection: "",
  description: ""
})

const loading = ref(false)

// 从文件名自动提取建筑名称
function autoFillFromFilename() {
  if (!props.file) return
  const filename = props.file.name.split(".")[0]
  // 移除日期时间戳并提取有意义的部分
  const cleaned = filename.replace(/[\d\-_\s]+/g, " ").trim()
  if (cleaned && !form.buildingName) {
    form.buildingName = cleaned.substring(0, 50) // 限制长度
  }
  if (!customName.value) {
    customName.value = props.file.name.split(".")[0]
  }
}

async function handleConfirm() {
  if (!customName.value.trim()) {
    ElMessage.warning("请输入图像名称")
    return
  }
  if (!form.buildingName.trim()) {
    ElMessage.warning("请填写建筑名称")
    return
  }

  loading.value = true
  try {
    const confirmData = {
      customName: customName.value.trim(),
      formData: {
        buildingName: form.buildingName.trim(),
        locationFloor: form.locationFloor,
        locationSection: form.locationSection || undefined,
        description: form.description || undefined
      }
    }
    emits("confirm", confirmData)
    visible.value = false
    // 重置表单
    customName.value = ""
    form.buildingName = ""
    form.locationFloor = undefined
    form.locationSection = ""
    form.description = ""
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  visible.value = false
  customName.value = ""
  form.buildingName = ""
  form.locationFloor = undefined
  form.locationSection = ""
  form.description = ""
}

watch(() => props.file, () => {
  if (props.file && visible.value) {
    autoFillFromFilename()
  }
})

watch(() => visible.value, (newVal) => {
  if (newVal && props.file) {
    autoFillFromFilename()
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="图像命名与信息填写"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="dialog-content">
      <!-- 图像预览 -->
      <div v-if="imagePreview" class="image-preview">
        <img
          :src="imagePreview"
          alt="preview"
          class="preview-img"
        >
      </div>

      <el-form label-width="100px" size="small">
        <!-- 图像名称 -->
        <el-form-item label="图像名称" required>
          <el-input
            v-model.trim="customName"
            placeholder="输入有意义的图像名称，如：A座南立面-001"
            maxlength="100"
            show-word-limit
            clearable
          />
          <small class="form-hint">用于识别和管理图像，不影响检测结果</small>
        </el-form-item>

        <!-- 建筑信息 -->
        <el-form-item label="建筑名称" required>
          <el-input
            v-model.trim="form.buildingName"
            placeholder="如：A座南立面"
            maxlength="50"
            show-word-limit
            clearable
          />
        </el-form-item>

        <el-form-item label="楼层">
          <el-input-number
            v-model="form.locationFloor"
            :min="1"
            :max="500"
            placeholder="可选"
            clearable
          />
        </el-form-item>

        <el-form-item label="分区">
          <el-input
            v-model.trim="form.locationSection"
            placeholder="如：A-03"
            maxlength="20"
            clearable
          />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input
            v-model.trim="form.description"
            type="textarea"
            :rows="3"
            placeholder="可选，补充采集场景、特殊条件等"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          取消
        </el-button>
        <el-button type="primary" :loading="loading" @click="handleConfirm">
          添加到队列
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-content {
  padding: 10px 0;
}

.image-preview {
  margin-bottom: 16px;
  text-align: center;
  border: 1px dashed var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
}

.preview-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
