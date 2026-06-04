export default defineNuxtRouteMiddleware((to, from) => {
    const whitelist = ['/login', '/auth/login', '/auth/register'];

    const readCookie = (name) => {
      if (typeof document === 'undefined') return '';
      const match = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
      if (!match) return '';
      return decodeURIComponent(match.slice(name.length + 1));
    };

    const permissionMap = {
        '/3DModel': 'access_system_a',
        '/stonedirty': 'access_system_b',
        '/crackdetect': 'access_system_c',
        '/spallingDetection': 'access_system_d',
        '/vibration': 'access_system_v',
        '/monitor': 'access_system_v',
        '/segment': 'access_system_f',
        '/smoothnessDetection': 'access_system_g',
        '/resilienceAssessment': 'access_system_h',
        '/corrosion': 'access_system_z',
        '/userManage': 'is_superuser', // 管理页面仅限管理员
      };
  
    if (process.client) {
        const token = localStorage.getItem('authToken') || readCookie('auth_token');
      const userAuth = JSON.parse(localStorage.getItem('userAuth') || '{}');

        if (!token && whitelist.includes(to.path)) {
          return;
        }
  
      // 未登录时，只允许访问白名单页面
      if (!token && !whitelist.includes(to.path)) {
          return navigateTo('/login');
      }
      // 管理员可以访问所有页面
      if (userAuth.is_superuser) return;
      // 通用权限检查逻辑
      for (const path in permissionMap) {
        if (to.path.startsWith(path)) {
          const requiredKey = permissionMap[path];
          const hasPermission = userAuth[requiredKey];
  
          if (!hasPermission) {
            return navigateTo('/');
          }
        }
      }

    }
  });
