// 管理用户数据
// import Request from "@/server/request.ts"; 
// import Request from "@/server/accountRequest.js"; 
// import Message from "@/server/Message.js"  // 在每个 api 文件里都要引入这两个文件

const userService = {
/**
 * 接口名称：用户登录接口。
 * 接口定义：此接口用于用户登录。
 * 输入：
 *   - body：
 *      - username
 *      - password
 * 输出：
 *   - 在获取成功的情况下：
 *      - 用户的认证信息 authentication。
 *   - 在获取失败的情况下：
 *      - 无输出。有错误信息显示。
 */
    async login(email, password) {
        try {
            console.log("login")
            const response = await Request.post('/account/login', { "username": email, "password": password });
            if (response.status === 200) {
                // 存储Token和email到localStorage
                localStorage.setItem('authToken', response.data.token);
                console.log(localStorage.getItem('authToken'));
                localStorage.setItem('email', email);
                // userInfo.value = response.data;
                return response.data.authentication;
            } else {
                console.error(response);
            }
        } catch (error) {
            Message.error(error.message)
        }
    },
/**
 * 接口名称：发送验证码接口。
 * 接口定义：此接口用于给指定邮箱发送验证码。
 * 输入：
 *   - body：
 *      - email
 * 输出：
 *   - 在获取成功的情况下：
 *      - true 值。同时会有成功信息显示。
 *   - 在获取失败的情况下：
 *      - false 值。同时会有错误信息显示。
 */
    async sendVerificationCode(email) {
        try {
            const response = await Request.post('/api/account/sendCode', { "email": email });
            if (response.status === 200) {
                Message.success(response.data.message);
                return true;
            } else {
                console.error(response);
                return false;
            }
        } catch (error) {
            Message.error(error.message);
            return false;
        }
    },
/**
 * 接口名称：用户注册接口。
 * 接口定义：此接口用于用户注册。
 * 输入：
 *   - body：
 *      - email
 *      - code 验证码
 *      - password
 * 输出：
 *   - 在获取成功的情况下：
 *      - true 值。同时会有成功信息显示。
 *   - 在获取失败的情况下：
 *      - false 值。同时会有错误信息显示。
 */
    async register(email, code, password) {
        try {
            const response = await Request.post('/api/account/validate', { "email": email, "code": code, "password": password });
            if (response.status === 200) {
                Message.success(response.data.message);
                return true;
            } else {
                console.error(response);
                return false;
            }
        } catch (error) {
            Message.error(error.message);
            return false;
        }
    },
/**
 * 接口名称：用户信息接口。
 * 接口定义：此接口用于获取用户信息。
 * 输入：
 *   - headers：
 *      - Authorization 认证信息
 * 输出：
 *   - 在获取成功的情况下：
 *      - true 值。同时会有成功信息显示。
 *   - 在获取失败的情况下：
 *      - false 值。同时会有错误信息显示。
 */
    async getCurrentInfo(user) {
        try {
            const headers = { 'Authorization': `Token ${user}` };
            const response = await Request.get('/get-info', { headers });
            if (response.status === 200) {
                // Message.success(response.data.message);
                return response.data.data;
            } else {
                console.error(response);
                return response.data;
            }
        } catch (error) {
            Message.error(error.message);
            return response.data;
        }
    },
}

export default userService;
// 退出时清除用户信息
//     const clearUserInfo = () => {
//         userInfo.value = {};
//         store.dispatch('doLogout');
//     };

//     return {
//         userInfo,
//         sendVerificationCode,
//         login,
//         register,
//         clearUserInfo,
//         getCurrentInfo
//     };
// }, {
//     persist: true,
// });
