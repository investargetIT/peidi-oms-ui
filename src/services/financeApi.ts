import { createRequest, ResponseData } from './axiosRequest';
import { getOmsBaseUrl } from './apiTarget';

// ==================== 本地/生产/本地2 环境切换 ====================
// 财务接口地址由 apiTarget.ts 统一管理，支持运行时切换：
// window.__api.set('local1' | 'local2' | 'prod')
// 页面里拼接下载 / 上传地址请用 getFinanceBaseUrl()，保证切换后立即生效。
export const getFinanceBaseUrl = (): string => getOmsBaseUrl();

const financeRequest = createRequest(() => getFinanceBaseUrl(), {
  timeout: 1000 * 60,
});
// ==================== 切换代码结束 ====================

export interface ShopInfo {
  id?: string;
  shopName: string;
  wdtName: string;
  otherName?: string;
  channel: string;
  platform: string;
  org: string;
  salesman: string;
  needSummary: number | string;
  unitCostOrg?: string;
}

export class FinanceApi {
  /**
   * oba维护新店铺
   */
  static async postObaCustomerNew(data: {
    shopId: string;
    shopName: string;
  }): Promise<ResponseData<any>> {
    return financeRequest.post('/finance/oba/shop-new', data);
  }

  /**
   * 获取订单店铺
   */
  static async getShopPage(): Promise<ResponseData<any>> {
    return financeRequest.get('/finance/shop/page', {});
  }

  /**
   * 增加店铺信息
   */
  static async postShopNew(data: ShopInfo): Promise<ResponseData<any>> {
    return financeRequest.post('/finance/shop/new', data);
  }

  /**
   * 修改店铺信息
   */
  static async postShopUpdate(data: ShopInfo): Promise<ResponseData<any>> {
    return financeRequest.post('/finance/shop/update', data);
  }

  /**
   * 获取成本取值组织列表（枚举）
   * GET /oms/finance-unit-cost/group/list
   * 返回 data: string[]
   */
  static async getUnitCostOrgList(): Promise<ResponseData<string[]>> {
    return financeRequest.get('/finance-unit-cost/group/list', {});
  }
}

// 默认导出实例
export default FinanceApi;

// 导出请求实例，方便其他地方使用
export { financeRequest };
