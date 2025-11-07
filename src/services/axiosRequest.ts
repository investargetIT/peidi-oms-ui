import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  // 可以扩展自定义配置
  showLoading?: boolean;
  retryCount?: number;
  // 新增配置：是否显示错误消息
  showErrorMessage?: boolean;
}

// 响应数据格式接口
export interface ResponseData<T = any> {
  code: number;
  msg: string;
  data: T;
  success?: boolean;
  [key: string]: any;
}

/**
 * 优雅的Axios请求封装类
 */
export class AxiosRequest {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string, config?: RequestConfig) {
    this.baseURL = baseURL || '';
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 请求开始前的处理
        // console.log(`🚀 请求开始: ${config.method?.toUpperCase()} ${config.url}`);

        // 添加认证token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `${token}`;
        }

        return config;
      },
      (error) => {
        console.error('❌ 请求拦截器错误:', error);
        return Promise.reject(error);
      },
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // console.log(`✅ 请求成功: ${response.config.method?.toUpperCase()} ${response.config.url}`);

        // 统一处理响应数据格式
        const { data } = response;
        const config = response.config as RequestConfig;

        // 如果后端返回的数据格式是 { code, msg, data } 或 { success, msg, data }
        if (data && typeof data === 'object') {
          // 处理 success 为 false 的情况（如：{ success: false, msg: "Internal server error", data: null }）
          if (data.success === false) {
            console.warn(`业务警告: ${data.msg} (success: ${data.success})`);

            // 根据配置决定是否显示错误消息
            const showError = config?.showErrorMessage !== false; // 默认显示
            if (showError) {
              message.warning(data.msg || '操作失败');
            }

            // 返回数据，不抛出错误，让应用继续运行
            return data;
          }

          // 处理 code 不为 200 的情况
          if ('code' in data && data.code !== 200) {
            console.warn(`业务警告: ${data.msg} (code: ${data.code})`);

            // 根据配置决定是否显示错误消息
            const showError = config?.showErrorMessage !== false; // 默认显示
            if (showError) {
              message.warning(data.msg || '操作失败');
            }

            // 返回数据，不抛出错误，让应用继续运行
            return data;
          }
        }

        return data;
      },
      (error) => {
        console.error('❌ 请求失败:', error);
        const config = error.config as RequestConfig;

        // 统一错误处理
        if (error.response) {
          // 服务器返回错误状态码
          const { status, data } = error.response;

          // 根据配置决定是否显示错误消息
          const showError = config?.showErrorMessage !== false; // 默认显示

          switch (status) {
            case 401:
              console.error('认证失败，请重新登录');
              if (showError) {
                message.error('认证失败，请重新登录');
              }
              // 可以跳转到登录页
              break;
            case 403:
              console.error('权限不足');
              if (showError) {
                message.error('权限不足');
              }
              break;
            case 404:
              console.error('请求的资源不存在');
              if (showError) {
                message.error('请求的资源不存在');
              }
              break;
            case 500:
              console.error('服务器内部错误');
              if (showError) {
                message.error('服务器内部错误，请稍后重试');
              }
              // 对于500错误，返回一个友好的响应对象而不是抛出错误
              return Promise.resolve({
                success: false,
                code: 500,
                msg: data?.msg || '服务器内部错误，请稍后重试',
                data: null,
              });
            default:
              console.error(`服务器错误: ${status}`);
              if (showError) {
                message.error(`服务器错误: ${status}`);
              }
          }

          // 对于非500错误，仍然返回错误，但提供友好的错误信息
          return Promise.reject(new Error(data?.msg || `HTTP错误: ${status}`));
        } else if (error.request) {
          // 请求已发出但没有收到响应 - 网络错误
          console.error('网络错误，请检查网络连接');
          const showError = config?.showErrorMessage !== false;
          if (showError) {
            message.error('网络错误，请检查网络连接');
          }
          // 返回一个友好的响应对象而不是抛出错误，让应用继续运行
          return Promise.resolve({
            success: false,
            code: -1, // 使用-1表示网络错误
            msg: '网络错误，请检查网络连接',
            data: null,
          });
        } else {
          // 请求配置错误
          console.error('请求配置错误:', error.message);
          const showError = config?.showErrorMessage !== false;
          if (showError) {
            message.error('请求配置错误');
          }
          // 返回一个友好的响应对象而不是抛出错误
          return Promise.resolve({
            success: false,
            code: -2, // 使用-2表示配置错误
            msg: '请求配置错误',
            data: null,
          });
        }
      },
    );
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  /**
   * 获取axios实例（用于特殊需求）
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 设置baseURL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }

  /**
   * 设置请求头
   */
  setHeader(key: string, value: string): void {
    this.instance.defaults.headers.common[key] = value;
  }

  /**
   * 移除请求头
   */
  removeHeader(key: string): void {
    delete this.instance.defaults.headers.common[key];
  }
}

// 创建默认实例（无baseURL）
export const axiosRequest = new AxiosRequest();

// 创建带baseURL的实例
export const createRequest = (baseURL: string, config?: RequestConfig) => {
  return new AxiosRequest(baseURL, config);
};

export default AxiosRequest;