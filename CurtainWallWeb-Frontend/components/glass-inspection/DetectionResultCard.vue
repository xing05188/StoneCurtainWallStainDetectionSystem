<template>
  <div :class="['gi-result-card', `gi-result-card--${statusConfig.key}`]">
    <div class="gi-status-header">
      <div class="gi-status-icon">
        <UIcon :name="statusConfig.icon" />
      </div>

      <div>
        <div class="gi-status-row">
          <h3>{{ result.title }}</h3>
          <span class="gi-status-badge">{{ statusConfig.label }}</span>
        </div>
        <p>{{ result.description }}</p>
      </div>
    </div>

    <div v-if="result.pointcloud" class="gi-result-media">
      <h4>3D 点云交互视图</h4>
      <PointCloudViewer :data="result.pointcloud" />
    </div>

    <div v-if="resolvedResultImage" class="gi-result-media">
      <h4>平整度可视化结果</h4>
      <div class="gi-result-frame">
        <img :src="resolvedResultImage" alt="检测结果图">
      </div>
    </div>

    <div v-if="normalizedDetails.length" class="gi-details">
      <h4>详细指标</h4>

      <div v-for="(detail, index) in normalizedDetails" :key="`${detail.label}-${index}`" class="gi-detail-row">
        <div class="gi-detail-label">
          <span>{{ detail.label }}</span>

          <UPopover v-if="detail.description" mode="hover">
            <button type="button" class="gi-detail-help">
              <UIcon name="i-heroicons-question-mark-circle" />
            </button>

            <template #panel>
              <div class="gi-popover">
                <h5>{{ detail.label }}</h5>
                <p>{{ detail.description }}</p>
              </div>
            </template>
          </UPopover>
        </div>

        <span class="gi-detail-value">{{ detail.value }}</span>

        <div v-if="detail.image" class="gi-detail-image">
          <img :src="resolveInspectionMediaSrc(detail.image)" :alt="detail.label">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PointCloudViewer from './PointCloudViewer.client.vue'
import type { DetectionResultData } from '~/types/glassInspection'
import { resolveInspectionMediaSrc } from '~/utils/glassInspection'

const props = defineProps<{
  result: DetectionResultData
}>()

const statusMap = {
  success: {
    key: 'success',
    icon: 'i-heroicons-check-circle',
    label: '正常'
  },
  warning: {
    key: 'warning',
    icon: 'i-heroicons-information-circle',
    label: '警告'
  },
  error: {
    key: 'error',
    icon: 'i-heroicons-exclamation-triangle',
    label: '异常'
  }
} as const

const statusConfig = computed(() => statusMap[props.result.status] || statusMap.error)
const normalizedDetails = computed(() => (props.result.details || []).filter(Boolean))
const resolvedResultImage = computed(() => resolveInspectionMediaSrc(props.result.image))
</script>
