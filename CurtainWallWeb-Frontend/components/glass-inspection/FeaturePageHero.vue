<template>
  <div class="gi-hero">
    <div :class="['gi-hero__icon', `gi-hero__icon--${tone}`]">
      <UIcon :name="icon" />
    </div>

    <div>
      <div class="gi-eyebrow">{{ eyebrow }}</div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    title: string
    description: string
    tone?: 'cyan' | 'blue'
    eyebrow?: string
  }>(),
  {
    tone: 'cyan',
    eyebrow: 'INSPECTION TASK'
  }
)
</script>
