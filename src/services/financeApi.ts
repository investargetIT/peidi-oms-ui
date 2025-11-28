import { createRequest, ResponseData } from './axiosRequest';

// 创建财务上传的axios实例
const financeRequest = createRequest(`${process.env.BASE_URL}/finance`, {
  timeout: 1000 * 60,
});

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
}

// 默认导出实例
export default FinanceApi;

// 导出请求实例，方便其他地方使用
export { financeRequest };
