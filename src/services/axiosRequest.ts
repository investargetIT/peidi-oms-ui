import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
// 添加导入
import { stringify } from 'querystring';
import { clearAuthToken, getAuthToken } from '@/utils/auth';

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  // 可以扩展自定义配置
  showLoading?: boolean;
  retryCount?: number;
  // 新增配置：是否显示错误消息
  showErrorMessage?: boolean;
}

/**
 * 接口根地址：可以是字符串，也可以是「每次请求时求值」的函数。
 * 传函数时支持运行时切换（见 apiTarget.ts 的 getOmsBaseUrl）。
 */
export type BaseURLInput = string | (() => string);

// 响应数据格式接口
export interface ResponseData<T = any> {
  code: number;
  msg: string;
  data: T;
  success?: boolean;
  [key: string]: any;
}

// 从全局对象获取进度条管理函数
const getProgressFunctions = () => {
  if (typeof window !== 'undefined' && (window as any).__nprogress) {
    return {
      startLoading: (window as any).__nprogress.startLoading,
      stopLoading: (window as any).__nprogress.stopLoading,
    };
  }
  // 如果全局对象不存在，返回空函数
  return {
    startLoading: () => {},
    stopLoading: () => {},
  };
};

/**
 * 优雅的Axios请求封装类
 */
export class AxiosRequest {
  private instance: AxiosInstance;
  private baseURL: BaseURLInput;

  constructor(baseURL?: BaseURLInput, config?: RequestConfig) {
    this.baseURL = baseURL || '';
    this.instance = axios.create({
      baseURL: typeof baseURL === 'function' ? baseURL() : baseURL || '',
      timeout: 1000 * 60,
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
        // 运行时解析接口根地址（支持在控制台随时切换接口环境）
        if (typeof this.baseURL === 'function') {
          config.baseURL = this.baseURL();
        }

        // 请求开始前的处理
        // console.log(`🚀 请求开始: ${config.method?.toUpperCase()} ${config.url}`);

        // 添加认证token
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `${token}`;
        }

        // 根据配置决定是否显示进度条（默认显示）
        const requestConfig = config as RequestConfig;
        const showLoading = requestConfig?.showLoading !== false; // 默认显示

        if (showLoading) {
          const { startLoading } = getProgressFunctions();
          startLoading(); // 开始显示进度条
        }

        return config;
      },
      (error) => {
        console.error('❌ 请求拦截器错误:', error);

        // 请求出错时也要停止进度条
        const requestConfig = error.config as RequestConfig;
        const showLoading = requestConfig?.showLoading !== false;

        if (showLoading) {
          const { stopLoading } = getProgressFunctions();
          stopLoading(); // 停止显示进度条
        }

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

        // 根据配置决定是否停止进度条（默认显示）
        const showLoading = config?.showLoading !== false; // 默认显示

        if (showLoading) {
          const { stopLoading } = getProgressFunctions();
          stopLoading(); // 停止显示进度条
        }

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

            if (data.code === 100100012) {
              // token过期后自动退出到登录页
              this.handleTokenExpired();
              return Promise.reject(new Error('Token 过期'));
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

        // 根据配置决定是否停止进度条
        const showLoading = config?.showLoading !== false;

        if (showLoading) {
          const { stopLoading } = getProgressFunctions();
          stopLoading(); // 停止显示进度条
        }

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
   * 设置baseURL（支持传函数，每次请求时求值）
   */
  setBaseURL(baseURL: BaseURLInput): void {
    this.baseURL = baseURL;
    this.instance.defaults.baseURL = typeof baseURL === 'function' ? baseURL() : baseURL;
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

  /**
   * 处理token过期
   */
  private handleTokenExpired(): void {
    // 清除本地存储的token（会话级 + 持久化），登录页会用「记住我」凭据静默重登
    clearAuthToken();

    // 跳转到登录页
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const redirect = urlParams.get('redirect');

    if (window.location.pathname !== '/user/login' && !redirect) {
      // 使用replace避免浏览器历史记录问题
      window.location.replace(
        `/user/login?${stringify({
          redirect: pathname + search,
        })}`,
      );
    }
  }
}

// 创建默认实例（无baseURL）
export const axiosRequest = new AxiosRequest();

// 创建带baseURL的实例
export const createRequest = (baseURL: BaseURLInput, config?: RequestConfig) => {
  return new AxiosRequest(baseURL, config);
};

export default AxiosRequest;
