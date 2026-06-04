<template>
  <div class="h-[calc(100vh-100px)] flex flex-col p-4 space-y-4">
    <div class="flex-1 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg min-h-0 overflow-hidden shadow-sm">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div class="flex items-center space-x-2">
          <UIcon name="i-heroicons-sparkles" class="text-primary-500 text-xl" />
          <h2 class="text-lg font-semibold">幕墙监测智能 Agent</h2>
        </div>
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-trash"
          @click="clearChat"
          v-if="messages.length > 0"
        >
          清空对话
        </UButton>
      </div>
      
      <!-- Messages List -->
      <div 
        ref="messagesContainer"
        class="flex-1 overflow-y-auto space-y-4 p-4"
      >
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="text-4xl mb-2 opacity-50" />
          <p>您好！我是幕墙监测智能助手。我可以帮您分析天气情况并动态调整振动预警阈值。</p>
        </div>

        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
        >
          <div 
            :class="[
              'max-w-[80%] rounded-lg p-3 flex flex-col overflow-hidden break-words',
              msg.role === 'user' 
                ? 'bg-primary-500 text-white rounded-br-none' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
            ]"
          >
            <!-- Action message formatting -->
            <div v-if="msg.content.startsWith('confirm_action:')" class="text-sm opacity-90 flex items-center">
              <UIcon name="i-heroicons-cog-8-tooth" class="mr-1 inline-block animate-spin-slow" /> 已发送配置指令，正在更新阈值...
            </div>
            
            <!-- Markdown Rendering -->
            <div v-else
              class="prose dark:prose-invert max-w-full overflow-x-auto prose-sm prose-p:my-1 prose-ul:my-1 prose-table:w-full prose-table:border-collapse prose-th:border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:px-2 prose-td:py-1 break-words overflow-wrap-anywhere whitespace-normal" 
              v-html="renderMarkdown(msg.content)"
            ></div>

            <!-- Quick Confirmation Options -->
            <div v-if="msg.options && msg.options.length" class="mt-3 flex flex-wrap gap-2">
              <UButton 
                v-for="opt in msg.options" 
                :key="opt"
                size="xs" 
                color="primary" 
                variant="soft"
                @click="sendQuickOption(opt)"
                :disabled="isLoading"
              >
                {{ formatOptionLabel(opt) }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="flex justify-start">
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 rounded-bl-none flex space-x-2 items-center text-sm text-gray-500">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
            <span>Agent 思考中...</span>
          </div>
        </div>
      </div>

      <!-- Quick Prompts Area -->
      <div class="px-4 pb-2 shrink-0 flex flex-wrap gap-2">
        <UButton
          size="2xs"
          color="white"
          variant="solid"
          icon="i-heroicons-bolt"
          @click="sendQuickOption('根据当前天气一键修改所有设备预警阈值')"
          :disabled="isLoading"
          class="shadow-sm text-gray-600 dark:text-gray-300"
        >
          根据当前天气一键修改所有设备预警阈值
        </UButton>
      </div>

      <!-- Input Area -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-900 flex space-x-2">
        <UInput 
          v-model="userInput" 
          class="flex-1"
          placeholder="例如：今天天气有大暴风，请帮我调整振动上限。" 
          @keyup.enter="sendMessage"
          :disabled="isLoading"
        />
        <UButton 
          icon="i-heroicons-paper-airplane" 
          color="primary" 
          @click="sendMessage"
          :loading="isLoading"
          :disabled="!userInput.trim()"
        >
          发送
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { marked } from 'marked'
import { useAgentChat } from '@/composables/useAgentChat'

const { messages, isLoading, sendChat, clearChat } = useAgentChat()

const userInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const formatOptionLabel = (opt: string) => {
  if (opt.startsWith('confirm_action:')) {
    return '确认执行上述调整指令'
  }
  return opt
}

const renderMarkdown = (text: string) => {
  if (!text) return ''
  // Use marked to parse the markdown string into HTML
  // We can also ensure newlines are converted to <br> if needed, but marked handles paragraphs
  // Adding breaks: true parses `\n` to `<br>`
  marked.setOptions({ breaks: true })
  return marked.parse(text)
}

const sendQuickOption = async (option: string) => {
  if (isLoading.value) return
  await sendChat(option)
}

// Auto-scroll to bottom
watch(() => messages.value.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

const sendMessage = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return
  
  userInput.value = ''
  await sendChat(text)
}
</script>