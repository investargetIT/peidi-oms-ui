import { createRequest, ResponseData } from './axiosRequest';

// 创建财务上传的axios实例 - 调试地址
const financeRequest = createRequest(`http://12.18.1.36:8085/oms/finance`, {
  timeout: 1000 * 60,
});
// 生产环境使用
// const financeRequest = createRequest(`${process.env.BASE_URL}/finance`, {
//   timeout: 1000 * 60,
// });

// 成本取值组织枚举走的是 finance-unit-cost 服务，需要单独的axios实例
// 调试地址
const financeUnitCostRequest = createRequest(
  `http://12.18.1.36:8085/oms/finance-unit-cost`,
  { timeout: 1000 * 60 },
);
// 生产环境使用
// const financeUnitCostRequest = createRequest(
//   `${process.env.BASE_URL}/finance-unit-cost`,
//   { timeout: 1000 * 60 },
// );


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
    return financeRequest.post('/oba/shop-new', data);
  }

  /**
   * 获取订单店铺
   */
  static async getShopPage(): Promise<ResponseData<any>> {
    return financeRequest.get('/shop/page', {});
  }

  /**
   * 增加店铺信息
   */
  static async postShopNew(data: ShopInfo): Promise<ResponseData<any>> {
    return financeRequest.post('/shop/new', data);
  }

  /**
   * 修改店铺信息
   */
  static async postShopUpdate(data: ShopInfo): Promise<ResponseData<any>> {
    return financeRequest.post('/shop/update', data);
  }

  /**
   * 获取成本取值组织列表（枚举）
   * GET /oms/finance-unit-cost/group/list
   * 返回 data: string[]
   */
  static async getUnitCostOrgList(): Promise<ResponseData<string[]>> {
    return financeUnitCostRequest.get('/group/list', {});
  }
}

// 默认导出实例
export default FinanceApi;

// 导出请求实例，方便其他地方使用
export { financeRequest };
