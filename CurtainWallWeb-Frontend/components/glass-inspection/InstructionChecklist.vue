<template>
  <ul class="gi-instruction-list">
    <li v-for="(item, index) in items" :key="`${index}-${item}`">
      <span :class="['gi-instruction-list__mark', `gi-instruction-list__mark--${tone}`]">
        {{ index + 1 }}
      </span>
      <span>{{ item }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    items: string[]
    tone?: 'cyan' | 'blue'
  }>(),
  {
    tone: 'cyan'
  }
)
</script>
