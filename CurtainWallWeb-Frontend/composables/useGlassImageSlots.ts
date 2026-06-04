export function useGlassImageSlots(maxCount: number) {
  const createEmpty = () => Array.from({ length: maxCount }, () => null) as (File | null)[]
  const createEmptyUrls = () => Array.from({ length: maxCount }, () => null) as (string | null)[]

  const files = ref<(File | null)[]>(createEmpty())
  const previewUrls = ref<(string | null)[]>(createEmptyUrls())
  const currentIndex = ref(0)
  const objectUrls = ref<(string | null)[]>(createEmptyUrls())

  const revokeUrlAt = (index: number) => {
    const currentUrl = objectUrls.value[index]
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl)
      objectUrls.value[index] = null
    }
  }

  const reset = () => {
    objectUrls.value.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    })
    objectUrls.value = createEmptyUrls()
    files.value = createEmpty()
    previewUrls.value = createEmptyUrls()
    currentIndex.value = 0
  }

  const setCurrent = (index: number) => {
    if (maxCount <= 0) {
      currentIndex.value = 0
      return
    }
    const normalized = ((index % maxCount) + maxCount) % maxCount
    currentIndex.value = normalized
  }

  const setFileAt = (index: number, file: File | null) => {
    if (index < 0 || index >= maxCount) {
      return
    }

    revokeUrlAt(index)
    files.value[index] = file
    const nextUrl = file ? URL.createObjectURL(file) : null
    objectUrls.value[index] = nextUrl
    previewUrls.value[index] = nextUrl
  }

  const removeAt = (index: number) => {
    setFileAt(index, null)
  }

  const goPrev = () => {
    setCurrent(currentIndex.value - 1)
  }

  const goNext = () => {
    setCurrent(currentIndex.value + 1)
  }

  const filledCount = computed(() => files.value.filter(Boolean).length)
  const isComplete = computed(() => filledCount.value === maxCount)

  watch(
    () => maxCount,
    () => {
      reset()
    }
  )

  onBeforeUnmount(() => {
    objectUrls.value.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    })
  })

  return {
    files,
    previewUrls,
    currentIndex,
    filledCount,
    isComplete,
    setCurrentIndex: setCurrent,
    setFileAt,
    removeAt,
    goPrev,
    goNext,
    reset
  }
}
