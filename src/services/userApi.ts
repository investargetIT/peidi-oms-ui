import { createRequest, ResponseData } from './axiosRequest';

// 创建用户服务的axios实例
const userRequest = createRequest(`${process.env.USER_AUTH_BASE_URL}`, {
  timeout: 15000,
});

export class UserApi {
  // 根据code拿到个人信息
  static async getUserInfo(params: { code: string }): Promise<ResponseData<any>> {
    return userRequest.get('/ding/userInfo', {
      params: {
        code: params.code,
      },
    });
  }

  // 注册
  static async register(data: any): Promise<ResponseData<any>> {
    return userRequest.post('/user/email-register', data);
  }

  // 调用手机注册接口 -新版
  static async registerMobile(data: any): Promise<ResponseData<any>> {
    return userRequest.post('/user/sms-register', data);
  }
}

// 默认导出实例
export default UserApi;

// 导出请求实例，方便其他地方使用
export { userRequest };
