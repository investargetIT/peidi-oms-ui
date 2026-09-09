import { createRequest, ResponseData } from './axiosRequest';

// ==================== 本地/生产环境切换 ====================
// 统一 OMS 服务 request 实例：本文件财务相关接口（/finance、/finance-unit-cost）
// 都挂在同一个 OMS 服务上，共用这一个实例，路由在各方法里写完整前缀。
// 切换本地 / 生产只需改这一处即可。
// 生产环境使用
const financeRequest = createRequest(`${process.env.BASE_URL}`, {
  timeout: 1000 * 60,
});
// 调试地址
// const financeRequest = createRequest(`http://12.18.1.36:8085/oms`, {
//   timeout: 1000 * 60,
// });
// ==================== 切换代码结束 ====================

export interface ShopInfo {
  id?: string;
  shopName: string;
  wdtName: string;
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
