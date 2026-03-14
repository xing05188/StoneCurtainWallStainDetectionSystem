import type * as Users from "./type"
import { supabase } from "@@/apis/supabase/client"

/** 获取当前登录用户详情 */
export async function getCurrentUserApi(): Promise<Users.CurrentUserResponseData> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error(error?.message || "获取当前用户失败")
  }

  const email = data.user.email || ""
  const username =
    (data.user.user_metadata?.user_name as string | undefined)
    || (data.user.user_metadata?.preferred_username as string | undefined)
    || (data.user.user_metadata?.full_name as string | undefined)
    || (email.includes("@") ? email.split("@")[0] : "user")
  const avatar = (data.user.user_metadata?.avatar_url as string | undefined) || ""
  const roles = (data.user.app_metadata?.roles as string[] | undefined) || ["admin"]

  return {
    code: 0,
    data: {
      username,
      roles,
      avatar
    },
    message: "获取用户信息成功"
  }
}
