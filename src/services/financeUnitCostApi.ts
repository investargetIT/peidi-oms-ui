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
  /**
   * 成本类型筛选：1 = 只看临时成本，0 = 只看正式成本
   * ⚠️ 后端目前未实现该查询条件（传了不生效），前端只能拿到当前页后自己做过滤
   */
  isTemp?: number;
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
  /**
   * 成本类型：1 = 临时成本（手工录入），0 = 正式成本
   * 老版本后端不返回该字段（undefined），视为正式成本
   * ⚠️ 判断临时成本要用这个字段，不要用备注文本匹配（备注用户可以改）
   */
  isTemp?: number | null;
  [property: string]: any;
}

/**
 * 临时成本录入请求（单条，按月）
 * 正式成本表还没上传 / 新品没建价时，用它先补一个成本，避免周报按成本 0 算导致毛利虚高
 */
export interface FinanceUnitCostTempReq {
  /** 商家编码（成本匹配键），必填 */
  merchantCode: string;
  /** 成本所属月份 yyyy-MM（落库为该月 1 号），必填 */
  month: string;
  /** 匹配成本单价，必填 */
  matchedCost: number;
  /** 财务成本；不传则同 matchedCost */
  financeCost?: number;
  /** 内结价；不传则 0 */
  internalPrice?: number;
  /** 货品编码 */
  productNo?: string;
  /** u9 料号 */
  u9?: string;
  /** 品牌名称；传了会按「品牌名 + 该月」查找，不存在则新建品牌档案 */
  brandName?: string;
  /** 备注；不传后端默认「临时成本(手工录入)」 */
  remark?: string;
  /** 自有/外采 */
  own?: string;
  /** 组织，默认智创；报表按智创取数，一般不要传 */
  group?: string;
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
   * 临时成本录入（单条，按月）
   * POST /finance-unit-cost/temp
   *
   * - 按「商家编码 + 月份 + 组织」upsert：首次新增（isTemp=1），重复录入更新同一条，不会产生重复行
   * - 录入后报表缓存自动失效，重新生成周报即可用上该成本
   * - 财务正式成本表导入该月后，该月全部临时成本会被物理删除（正式值优先）
   * - 参数不合法（如 month 不是 yyyy-MM、缺 merchantCode）后端统一返回 500 Internal server error，
   *   所以提交前前端必须自己校验
   */
  static async createTemp(
    params: FinanceUnitCostTempReq,
  ): Promise<ResponseData<FinanceUnitCostVo>> {
    return financeUnitCostRequest.post('/temp', params);
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
