/**
 * 登录态存储工具
 *
 * token 按「记住我」分两种作用域：
 * - persist：存 localStorage，关掉浏览器再打开仍是登录态（勾选「记住我」）
 * - session：存 sessionStorage，关掉页面即失效（未勾选「记住我」）
 *
 * 「记住我」凭据（账号密码）由统一登录门户回跳时落盘，退出登录时清除。
 */

//#region 常量
const AUTH_TOKEN_KEY = 'token';
const REMEMBER_CREDS_KEY = 'peidi-userInfo';

// 登录态作用域
export type LoginScope = 'persist' | 'session';

// 「记住我」凭据
export type RememberedCreds = {
  username: string;
  password: string;
};
//#endregion

//#region token 读写
/**
 * 读取 token：先读会话级，再读持久化
 */
export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';

  try {
    const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (sessionToken) return sessionToken;
  } catch (e) {
    console.warn('读取 sessionStorage token 失败:', e);
  }

  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch (e) {
    console.warn('读取 localStorage token 失败:', e);
    return '';
  }
}

/**
 * 写入 token，两种作用域互斥，写之前先清掉另一份，避免残留上一个登录态
 */
export function writeAuthToken(token: string, scope: LoginScope = 'persist'): void {
  if (typeof window === 'undefined') return;

  if (scope === 'session') {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    } catch (e) {
      // sessionStorage 不可用（隐私模式等）时退化为持久化
      console.warn('写入 sessionStorage token 失败，退化为 localStorage:', e);
    }
  }

  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.warn('清除 sessionStorage token 失败:', e);
  }

  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.warn('写入 localStorage token 失败:', e);
  }
}

/**
 * 清除 token（退出登录、token 失效时调用），不清理「记住我」凭据
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.warn('清除 sessionStorage token 失败:', e);
  }

  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.warn('清除 localStorage token 失败:', e);
  }
}
//#endregion

//#region 「记住我」凭据读写
/**
 * 读取「记住我」的账号密码，结构不合法时视为没有
 */
export function getRememberedCreds(): RememberedCreds | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(REMEMBER_CREDS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.username === 'string' &&
      typeof parsed.password === 'string' &&
      parsed.username &&
      parsed.password
    ) {
      return { username: parsed.username, password: parsed.password };
    }
  } catch (e) {
    console.warn('读取记住我凭据失败:', e);
  }

  return null;
}

/**
 * 保存「记住我」的账号密码（登录门户勾选「记住我」时由回跳参数落盘）
 */
export function saveRememberedCreds(creds: RememberedCreds): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(REMEMBER_CREDS_KEY, JSON.stringify(creds));
  } catch (e) {
    console.warn('保存记住我凭据失败:', e);
  }
}

/**
 * 清除「记住我」凭据（退出登录、未勾选记住我、凭据失效时调用）
 */
export function clearRememberedCreds(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REMEMBER_CREDS_KEY);
  } catch (e) {
    console.warn('清除记住我凭据失败:', e);
  }
}
//#endregion
