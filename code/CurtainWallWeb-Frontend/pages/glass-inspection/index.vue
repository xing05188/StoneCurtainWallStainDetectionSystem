<script setup lang="ts">
const defaultTarget = process.client
  ? (() => {
      try {
        const auth = JSON.parse(localStorage.getItem('userAuth') || '{}')
        if (auth?.is_superuser || auth?.access_system_c) {
          return '/glass-inspection/crack'
        }
        if (auth?.access_system_g) {
          return '/glass-inspection/flatness'
        }
      } catch {
        return '/glass-inspection/crack'
      }
      return '/glass-inspection/crack'
    })()
  : '/glass-inspection/crack'

await navigateTo(defaultTarget, { replace: true })
</script>
