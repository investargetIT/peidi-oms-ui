/**
 * 项目配置管理工具类
 * 用于统一管理localStorage中的项目配置
 */

// 项目配置键名前缀
const STORAGE_PREFIX = 'peidi_oms_';

// 配置键名枚举
export enum ConfigKeys {
  // 发票页面配置
  INVOICE_PAGINATION = 'invoice_pagination',
  // 可以添加其他页面的配置键名
  // USER_PREFERENCES = 'user_preferences',
  // TABLE_SETTINGS = 'table_settings',
}

// 默认配置值
const DEFAULT_CONFIGS = {
  [ConfigKeys.INVOICE_PAGINATION]: {
    pageSize: 15,
  },
};

/**
 * 配置管理类
 */
class LocalStorageConfig {
  private prefix: string;

  constructor(prefix: string = STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  /**
   * 获取完整的存储键名
   */
  private getFullKey(key: ConfigKeys): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 检查localStorage是否可用
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return false;
    }
  }

  /**
   * 获取配置值
   */
  get<T>(key: ConfigKeys): T | null {
    if (!this.isLocalStorageAvailable()) {
      return DEFAULT_CONFIGS[key] as T;
    }

    try {
      const fullKey = this.getFullKey(key);
      const storedValue = localStorage.getItem(fullKey);

      if (storedValue) {
        return JSON.parse(storedValue) as T;
      }

      // 如果没有存储的值，返回默认值
      return DEFAULT_CONFIGS[key] as T;
    } catch (error) {
      console.error(`Error reading config ${key}:`, error);
      return DEFAULT_CONFIGS[key] as T;
    }
  }

  /**
   * 设置配置值
   */
  set<T>(key: ConfigKeys, value: T): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(fullKey, serializedValue);
      return true;
    } catch (error) {
      console.error(`Error saving config ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除配置
   */
  remove(key: ConfigKeys): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`Error removing config ${key}:`, error);
      return false;
    }
  }

  /**
   * 清空所有项目配置
   */
  clear(): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      // 只删除项目相关的配置，不影响其他localStorage数据
      Object.values(ConfigKeys).forEach((key) => {
        const fullKey = this.getFullKey(key);
        localStorage.removeItem(fullKey);
      });
      return true;
    } catch (error) {
      console.error('Error clearing configs:', error);
      return false;
    }
  }

  /**
   * 获取所有配置的键名
   */
  getAllKeys(): string[] {
    return Object.values(ConfigKeys).map((key) => this.getFullKey(key));
  }
}

// 创建默认实例
const configManager = new LocalStorageConfig();

export default configManager;
