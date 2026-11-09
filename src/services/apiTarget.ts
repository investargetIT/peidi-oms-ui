/**
 * OMS 接口地址集中配置 / 运行时切换
 *
 * 用法：
 * 1. 默认地址：改下面 DEFAULT_API_TARGET（prod / local1 / local2）。
 * 2. 运行时切换（推荐，不用重启 dev server）：
 *      window.__api.set('local1')   // 切到本地接口1
 *      window.__api.set('local2')   // 切到本地接口2
 *      window.__api.set('prod')     // 切回生产
 *      window.__api.get()           // 查看当前目标
 *      window.__api.urls            // 查看所有地址
 *   切换后页面会自动刷新，选择会记在 localStorage（key: oms_api_target_v2）。
 * 3. 取消本地覆盖：
 *      window.__api.reset()         // 清除 localStorage，回到 DEFAULT_API_TARGET
 *
 * 注意：所有走 AxiosRequest 的实例（管报 / 各渠道月账单 / 渠道推广费用 / 成本核算 / 财务）
 * 都会跟随这里切换；提交代码时默认值保持 prod 即可，无需再改文件。
 */

export type ApiTarget = 'prod' | 'local1' | 'local2';

/** 默认接口目标（提交代码时保持 'prod'） */
const DEFAULT_API_TARGET: ApiTarget = 'prod';

/** 各环境接口地址：新增环境只需在这里加一行 */
export const API_BASE_URLS: Record<ApiTarget, string> = {
  // 生产
  prod: `${process.env.BASE_URL}`,
  // 本地接口1
  local1: 'http://12.18.1.36:8085/oms',
  // 本地接口2
  local2: 'http://10.162.250.167:9000/oms',
};

// v2：统一改回线上后更换 key，让此前保存的本地接口选择自动失效
export const API_TARGET_STORAGE_KEY = 'oms_api_target_v2';

const isApiTarget = (value: unknown): value is ApiTarget =>
  value === 'prod' || value === 'local1' || value === 'local2';

const readStoredTarget = (): ApiTarget | null => {
  // 生产构建强制使用 BASE_URL，忽略本地运行时的选择，避免误连本地地址
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return null;
  try {
    const stored = window.localStorage.getItem(API_TARGET_STORAGE_KEY);
    return isApiTarget(stored) ? stored : null;
  } catch (error) {
    return null;
  }
};

let currentTarget: ApiTarget = readStoredTarget() || DEFAULT_API_TARGET;

/** 当前接口目标 */
export const getApiTarget = (): ApiTarget => currentTarget;

/** 当前接口根地址（如 http://12.18.1.36:8085/oms） */
export const getOmsBaseUrl = (): string => API_BASE_URLS[currentTarget];

/**
 * 切换接口目标
 * @param target 目标环境
 * @param reload 是否刷新页面（默认刷新，保证已渲染的 href / action 等也生效）
 */
export const setApiTarget = (target: ApiTarget, reload = true) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[api] 生产构建不支持切换接口地址');
    return;
  }
  if (!isApiTarget(target)) {
    console.warn(`[api] 未知的接口目标：${target}，可选值：prod / local1 / local2`);
    return;
  }
  currentTarget = target;
  try {
    window.localStorage.setItem(API_TARGET_STORAGE_KEY, target);
  } catch (error) {
    // localStorage 不可用时只生效当前会话
  }
  console.log(`[api] 接口已切换 -> ${target}: ${API_BASE_URLS[target]}`);
  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
};

/** 清除运行时选择，回到 DEFAULT_API_TARGET */
export const resetApiTarget = (reload = true) => {
  try {
    window.localStorage.removeItem(API_TARGET_STORAGE_KEY);
  } catch (error) {
    // ignore
  }
  currentTarget = DEFAULT_API_TARGET;
  console.log(
    `[api] 已恢复默认接口 -> ${DEFAULT_API_TARGET}: ${API_BASE_URLS[DEFAULT_API_TARGET]}`,
  );
  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
};

// 非生产环境挂到 window，方便控制台随时切换
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__api = {
    set: setApiTarget,
    get: getApiTarget,
    reset: resetApiTarget,
    urls: API_BASE_URLS,
    current: () => getOmsBaseUrl(),
  };
  console.log(
    `[api] 当前接口：${currentTarget} -> ${API_BASE_URLS[currentTarget]}\n` +
      `[api] 切换：window.__api.set('local1' | 'local2' | 'prod')`,
  );
}
