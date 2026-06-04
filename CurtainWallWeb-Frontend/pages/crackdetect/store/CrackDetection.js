// stores/crackDetection.js
import { defineStore } from 'pinia'

export const useCrackDetectionStore = defineStore('crackDetection', {
    state: () => ({
        projectId: null,  // 项目数据
        pickedImage:null,
        currentStep: 0              // 当前步骤
    }),
    actions: {
        setProjectId(id) {
            this.projectId = id
        },
        nextStep() {
            if (this.currentStep < 3) {
                this.currentStep++;
            }
        },
        preStep() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.pickedImage = null;
            }
        },
        setStep(step) {
            this.currentStep = step
        }
    },
    persist: {
        key: 'crack-detection-store',  // 自定义存储键名
        paths: ['projectId', 'currentStep'],  // 只持久化项目和当前步骤
        storage: localStorage,  // 使用 localStorage (默认值)

        // 可选钩子函数
        beforeRestore: (context) => {
            console.log('即将恢复状态', context.store.$id)
        },
        afterRestore: (context) => {
            console.log('状态已恢复', context.store.$id)
        }
    }
})