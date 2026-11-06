import { createRequest, ResponseData } from './axiosRequest';
import { getOmsBaseUrl } from './apiTarget';

// ==================== 本地/生产/本地2 环境切换 ====================
// 成本核算接口地址由 apiTarget.ts 统一管理，支持运行时切换：
// window.__api.set('local1' | 'local2' | 'prod')
const financeUnitCostRequest = createRequest(
  () => `${getOmsBaseUrl()}/finance-unit-cost`,
  {
    timeout: 1000 * 60,
  },
);
// ==================== 切换代码结束 ====================

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
  own?: string;
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
  own?: string;
  productNo?: string;
  remark?: string;
  spu?: string;
  u9No?: string;
  updatedAt?: string;
  [property: string]: any;
}

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
