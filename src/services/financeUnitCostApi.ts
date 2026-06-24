import { createRequest, ResponseData } from './axiosRequest';

export interface PageResponse<T> {
  data: {
    records: T[];
    current: number;
    size: number;
    total: number;
    pages?: number;
    [key: string]: any;
  };
  code: number;
  msg: string;
  success?: boolean;
}

export interface FinanceUnitCostPageReq {
  brandName?: string;
  group?: string;
  isNewProduct?: string;
  merchantCode?: string;
  pageNum?: number;
  pageSize?: number;
  productNo?: string;
  u9No?: string;
  [property: string]: any;
}

export interface FinanceUnitCostUpdateReq {
  financeCost?: number;
  id?: number;
  internalPrice?: number;
  isNewProduct?: string;
  matchedCost?: number;
  remark?: string;
  [property: string]: any;
}

export interface FinanceUnitCostVo {
  brandName?: string;
  group?: string;
  createdAt?: string;
  financeCost?: number;
  goodsName?: string;
  id?: number;
  internalPrice?: number;
  isNewProduct?: string;
  matchedCost?: number;
  merchantCode?: string;
  productNo?: string;
  remark?: string;
  spu?: string;
  u9No?: string;
  updatedAt?: string;
  [property: string]: any;
}

// 创建成本核算的axios实例 - 调试地址
// const financeUnitCostRequest = createRequest(`http://12.18.1.36:8085/oms/finance-unit-cost`, {
//   timeout: 1000 * 60,
// });
// 生产环境使用
const financeUnitCostRequest = createRequest(`${process.env.BASE_URL}/finance-unit-cost`, {
  timeout: 1000 * 60,
});

// 成本核算API类
export class FinanceUnitCostApi {
  /**
   * 分页查询
   */
  static async getPage(
    params: FinanceUnitCostPageReq,
  ): Promise<PageResponse<FinanceUnitCostVo>> {
    return financeUnitCostRequest.post('/page', {
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 10,
      ...params,
    });
  }

  /**
   * 更新
   */
  static async update(
    params: FinanceUnitCostUpdateReq,
  ): Promise<ResponseData<any>> {
    return financeUnitCostRequest.post('/update', params);
  }

  /**
   * 导入Excel更新成本数据
   */
  static async import(data: {
    createDate: string;
    file: File;
  }): Promise<ResponseData<any>> {
    const formData = new FormData();
    formData.append('createDate', data.createDate);
    formData.append('file', data.file);
    return financeUnitCostRequest.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// 默认导出实例
export default FinanceUnitCostApi;

// 导出请求实例，方便其他地方使用
export { financeUnitCostRequest };
