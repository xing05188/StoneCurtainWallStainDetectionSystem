import type { RouteRecordRaw } from "vue-router"
import { createRouter } from "vue-router"
import { routerConfig } from "@/router/config"
import { registerNavigationGuard } from "@/router/guard"
import { flatMultiLevelRoutes } from "./helper"

const Layouts = () => import("@/layouts/index.vue")

/**
 * @name 常驻路由
 * @description 除了 redirect/403/404/login 等隐藏页面，其他页面建议设置唯一的 Name 属性
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layouts,
    meta: {
      hidden: true
    },
    children: [
      {
        path: ":path(.*)",
        component: () => import("@/pages/redirect/index.vue")
      }
    ]
  },
  {
    path: "/403",
    component: () => import("@/pages/error/403.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/404",
    component: () => import("@/pages/error/404.vue"),
    meta: {
      hidden: true
    },
    alias: "/:pathMatch(.*)*"
  },
  {
    path: "/login",
    component: () => import("@/pages/login/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/auth/callback",
    component: () => import("@/pages/auth-callback/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/reset-password",
    component: () => import("@/pages/reset-password/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/",
    component: Layouts,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/pages/dashboard/index.vue"),
        name: "Dashboard",
        meta: {
          title: "工作台",
          svgIcon: "dashboard",
          affix: true
        }
      }
    ]
  },
  {
    path: "/profile",
    component: Layouts,
    meta: {
      hidden: true
    },
    children: [
      {
        path: "",
        component: () => import("@/pages/profile/index.vue"),
        name: "Profile",
        meta: {
          title: "个人主页"
        }
      }
    ]
  },
  {
    path: "/detection",
    component: Layouts,
    meta: {
      title: "污渍检测",
      elIcon: "Picture",
      alwaysShow: true
    },
    children: [
      {
        path: "",
        component: () => import("@/pages/detection/index.vue"),
        name: "DetectionWorkbench",
        meta: {
          title: "检测工作台"
        }
      },
      {
        path: "history",
        component: () => import("@/pages/detection/history.vue"),
        name: "DetectionHistory",
        meta: {
          title: "检测历史"
        }
      }
    ]
  }
]

/**
 * @name 动态路由
 * @description 用来放置有权限 (Roles 属性) 的路由
 * @description 必须带有唯一的 Name 属性
 */
export const dynamicRoutes: RouteRecordRaw[] = []

/** 路由实例 */
export const router = createRouter({
  history: routerConfig.history,
  routes: routerConfig.thirdLevelRouteCache ? flatMultiLevelRoutes(constantRoutes) : constantRoutes
})

/** 重置路由 */
export function resetRouter() {
  try {
    // 注意：所有动态路由路由必须带有 Name 属性，否则可能会不能完全重置干净
    router.getRoutes().forEach((route) => {
      const { name, meta } = route
      if (name && meta.roles?.length) {
        router.hasRoute(name) && router.removeRoute(name)
      }
    })
  } catch {
    // 强制刷新浏览器也行，只是交互体验不是很好
    location.reload()
  }
}

// 注册路由导航守卫
registerNavigationGuard(router)
