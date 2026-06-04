import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  options?: string[]
}

export function useAgentChat() {
  // 方案二：使用 LocalStorage 永久保存聊天记录，跨页面页签和刷新都不会消失
  const messages = useLocalStorage<ChatMessage[]>('agent_chat_history', [])
  const isLoading = ref(false)

  // 增加一个清空历史的方法，让用户可以重置对话
  const clearChat = () => {
    messages.value = []
  }

  const sendChat = async (text: string) => {
    messages.value.push({ role: 'user', content: text })
    isLoading.value = true

    try {
      // TODO: Swap to dynamic base url via runtime config or specific API prefix
      const response = await fetch('http://8.153.161.229:8009/http-client/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.value
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      
      messages.value.push({
        role: 'assistant',
        content: data.reply,
        options: data.options || []
      })
    } catch (error) {
      console.error('Chat error:', error)
      messages.value.push({
        role: 'assistant',
        content: '哎呀，通信出现了一点问题，没有连接上 Agent 后端服务。请检查后端状态。'
      })
    } finally {
      isLoading.value = false
    }
  }

  return {
    messages,
    isLoading,
    sendChat,
    clearChat
  }
}
