import { createRequest, ResponseData } from './axiosRequest';

// 创建财务上传的axios实例
const financeRequest = createRequest(`${process.env.BASE_URL}/finance`, {
  timeout: 1000 * 60,
});

export interface ShopInfo {
  id?: string;
  shopName: string;
  wdtName: string;
  channel: string;
  platform: string;
  org: string;
  salesman: string;
  needSummary: number | string;
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
}

// 默认导出实例
export default FinanceApi;

// 导出请求实例，方便其他地方使用
export { financeRequest };
