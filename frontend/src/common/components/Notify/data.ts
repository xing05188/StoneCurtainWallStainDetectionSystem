import type { NotifyItem } from "./type"

export const notifyData: NotifyItem[] = [
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.-S1PRFEC3zeHg0LoPotBGQHaGh?w=213&h=187&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 A",
    datetime: "今天 10:30",
    description: "示例任务处理完成，核心指标较上周有明显提升，建议在下个迭代继续观察稳定性。"
  },
  {
    avatar: "https://tse3-mm.cn.bing.net/th/id/OIP-C.-I8OnVyl2-OakV7GhKFkYgHaHa?w=170&h=180&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 B",
    datetime: "昨天 15:45",
    description: "文档与注释已同步更新，团队成员可按新流程进行功能接入与调试。"
  },
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.Me4Qoqo96Sk_itQ50tMwzQHaJu?w=148&h=194&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 C",
    datetime: "前天 09:20",
    description: "已完成性能优化方案验证，页面交互与数据渲染耗时均有下降。"
  },
  {
    avatar: "https://tse4-mm.cn.bing.net/th/id/OIP-C.HeWDC0Spp9mdC9Q87OG7qAHaGl?w=198&h=180&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 D",
    datetime: "3天前",
    description: "新的 UI 方案已合并，视觉层级更清晰，适合作为通用模板默认样式。"
  },
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.Me4Qoqo96Sk_itQ50tMwzQHaJu?w=148&h=194&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 E",
    datetime: "5天前",
    description: "数据结构与接口字段已统一，后续接入新模块时可直接复用当前规范。"
  }
]

export const messageData: NotifyItem[] = [
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.Me4Qoqo96Sk_itQ50tMwzQHaJu?w=148&h=194&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 C",
    description: "示例消息：本周排期已确认，请按任务看板推进开发并在每日例会同步进度。",
    datetime: "2小时前"
  },
  {
    avatar: "https://tse4-mm.cn.bing.net/th/id/OIP-C.HeWDC0Spp9mdC9Q87OG7qAHaGl?w=198&h=180&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 D",
    description: "示例消息：功能联调通过，待补充边界场景测试后即可进入发布流程。",
    datetime: "5小时前"
  },
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.-S1PRFEC3zeHg0LoPotBGQHaGh?w=213&h=187&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 A",
    description: "示例消息：感谢大家的协作，本次迭代按期完成，周会将统一回顾经验。",
    datetime: "1天前"
  },
  {
    avatar: "https://tse3-mm.cn.bing.net/th/id/OIP-C.-I8OnVyl2-OakV7GhKFkYgHaHa?w=170&h=180&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 B",
    description: "示例消息：代码规范检查已开启，请在提交前执行 lint 和测试命令。",
    datetime: "2天前"
  },
  {
    avatar: "https://tse4-mm.cn.bing.net/th/id/OIP-C.HeWDC0Spp9mdC9Q87OG7qAHaGl?w=198&h=180&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 D",
    description: "示例消息：组件重构已完成，复用率提升，后续可以继续拆分复合逻辑。",
    datetime: "3天前"
  },
  {
    avatar: "https://tse1-mm.cn.bing.net/th/id/OIP-C.Me4Qoqo96Sk_itQ50tMwzQHaJu?w=148&h=194&c=7&r=0&o=5&cb=ucfimg2&dpr=1.5&pid=1.7&ucfimg=1",
    title: "示例成员 C",
    description: "示例消息：已补充模板使用说明，新成员可以按文档快速完成本地启动。",
    datetime: "4天前"
  }
]

export const todoData: NotifyItem[] = [
  {
    title: "整理模板初始化清单",
    description: "输出通用项目初始化步骤，包含目录规范、环境变量和开发流程说明。",
    extra: "今晚7点",
    status: "warning"
  },
  {
    title: "完善示例接口说明",
    description: "补充接口请求与返回结构，便于后续替换成真实后端服务。",
    extra: "进行中",
    status: "primary"
  },
  {
    title: "检查基础组件复用性",
    description: "验证通用组件在不同页面中的复用表现，记录可抽离的公共能力。",
    extra: "已完成",
    status: "success"
  },
  {
    title: "规划模板扩展模块",
    description: "梳理可选功能模块清单，作为后续业务项目接入时的扩展参考。",
    extra: "待确认",
    status: "info"
  },
  {
    title: "统一代码风格与提交规范",
    description: "完善 ESLint 与提交前检查流程，保证模板在多人协作下保持一致性。",
    extra: "下周讨论",
    status: "primary"
  },
  {
    title: "技术分享会",
    description: "围绕模板最佳实践进行内部分享，每位成员准备 20 分钟案例讲解。",
    extra: "本月末",
    status: "warning"
  }
]
