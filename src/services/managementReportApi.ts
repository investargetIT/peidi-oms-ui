import { createRequest, ResponseData } from './axiosRequest';

/* ==================== 管报数据查询 ==================== */

/**
 * 管报数据查询请求
 */
export interface ManagementReportQueryReq {
  /**
   * 数据快照日期，格式：yyyy-MM-dd（用于 finance_unit_cost.created_at 过滤）
   */
  dataDate?: string;
  /**
   * 销售结束日期，格式：yyyy-MM-dd（线下/沃尔玛使用，对应 os.created <，开区间）
   */
  endDate?: string;
  /**
   * 销售结束月份，格式：yyyy-MM-dd HH:mm:ss（线上使用，对应 sales.end_month）
   */
  endMonth?: string;
  /**
   * 销售开始日期，格式：yyyy-MM-dd（线下/沃尔玛使用，对应 os.created >=）
   */
  startDate?: string;
  /**
   * 销售开始月份，格式：yyyy-MM-dd HH:mm:ss（线上使用，对应 sales.start_month）
   */
  startMonth?: string;
  /**
   * 数据类型：1-线上 2-线下 3-沃尔玛
   */
  type?: number;
  [property: string]: any;
}

/**
 * 销售出库明细成本核算返回对象（type=2 线下）
 */
export interface SalesOutDetailsCostVo {
  amountWithoutTax?: number;
  brandName?: string;
  created?: string;
  financeTotalCost?: number;
  financeUnitCost?: number;
  internalTransferTotalPrice?: number;
  internalTransferUnitPrice?: number;
  merchantCode?: string;
  orderCustomer?: string;
  own?: string;
  productName?: string;
  quantity?: number;
  shopName?: string;
  specNo?: string;
  taxRate?: string;
  totalWithTax?: number;
  u9?: string;
  unitPrice?: number;
  [property: string]: any;
}

/**
 * 货物销售汇总成本核算返回对象（type=1 线上）
 */
export interface FinanceGoodsSalesSummaryAllCostVo {
  amountWithoutTax?: number;
  brandName?: string;
  costMatchSource?: string;
  financeTotalCost?: number;
  financeUnitCost?: number;
  internalTransferTotalPrice?: number;
  internalTransferUnitPrice?: number;
  merchantCode?: string;
  orderCustomer?: string;
  own?: string;
  productName?: string;
  quantity?: number;
  refundAmount?: number;
  taxRate?: number;
  totalWithTax?: number;
  u9?: string;
  unitPrice?: number;
  [property: string]: any;
}

/**
 * 沃尔玛/山姆返利核算返回对象（type=3）
 */
export interface WalmartRebateQueryVo {
  amountWithoutTax?: number;
  brandName?: string;
  created?: string;
  financeTotalCost?: number;
  financeUnitCost?: number;
  internalTransferTotalPrice?: number;
  internalTransferUnitPrice?: number;
  merchantCode?: string;
  orderCustomer?: string;
  own?: string;
  productName?: string;
  quantity?: number;
  rebateAmountWithoutTax?: number;
  rebateAmountWithTax?: number;
  rebateRate?: string;
  shopBrand?: string;
  shopName?: string;
  specNo?: string;
  taxRate?: string;
  totalWithTax?: number;
  u9?: string;
  unitPrice?: number;
  [property: string]: any;
}

/**
 * 管报数据查询返回对象
 */
export interface ManagementReportQueryVo {
  offlineList?: SalesOutDetailsCostVo[];
  onlineList?: FinanceGoodsSalesSummaryAllCostVo[];
  walmartList?: WalmartRebateQueryVo[];
  [property: string]: any;
}

/* ==================== 各渠道月账单（分渠道补充） ==================== */

export interface OrderItem {
  asc?: boolean;
  column?: string;
  [property: string]: any;
}

// ----- 支付宝 -----
export interface FinanceZfbBillInfoPageReq {
  alipayMerchantNo?: string;
  billDate?: string;
  companyName?: string;
  financeZfbBillConfigId?: number;
  generateStatus?: number;
  merchantName?: string;
  pageNum?: number;
  pageSize?: number;
  shopName?: string;
  [property: string]: any;
}

export interface FinanceZfbBillInfoVo {
  alipayMerchantNo?: string;
  beginningBalance?: number;
  billDate?: string;
  companyName?: string;
  createdAt?: string;
  endingBalance?: number;
  fileUrl?: string;
  financeZfbBillConfigId?: number;
  generateStatus?: number;
  id?: number;
  merchantName?: string;
  shopName?: string;
  updatedAt?: string;
  [property: string]: any;
}

export interface IPageFinanceZfbBillInfoVo {
  asc?: string[];
  ascs?: string[];
  countId?: string;
  current?: number;
  desc?: string[];
  descs?: string[];
  hitCount?: boolean;
  isSearchCount?: boolean;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: OrderItem[];
  pages?: number;
  records?: FinanceZfbBillInfoVo[];
  searchCount?: boolean;
  size?: number;
  total?: number;
  [property: string]: any;
}

// ----- 拼多多（待补） -----
// ----- 抖音（待补） -----
// ----- 天猫（待补） -----
// ----- 小红书（待补） -----

/**
 * 生成支付宝月账单请求
 */
export interface FinanceZfbBillGenerateReq {
  /**
   * 账单日期，格式：yyyy-MM
   */
  billDate: string;
  [property: string]: any;
}

// 创建管报数据的request实例
// 测试环境使用
const managementReportRequest = createRequest(`http://12.18.1.36:8085/oms/management-report`, {
  timeout: 1000 * 60,
});
// 生产环境使用
// const managementReportRequest = createRequest(
//   `${process.env.BASE_URL}/management-report`,
//   {
//     timeout: 1000 * 60,
//   },
// );

// 创建各渠道月账单的request实例
// 测试环境使用
const channelBillRequest = createRequest(`http://12.18.1.36:8085/oms/finance`, {
  timeout: 1000 * 60,
});
// 生产环境使用
// const channelBillRequest = createRequest(
//   `${process.env.BASE_URL}/finance`,
//   {
//     timeout: 1000 * 60,
//   },
// );

/**
 * 报表 API（管报数据 + 各渠道月账单）
 */
export class ManagementReportApi {
  /* ---- 管报数据查询 ---- */
  static async query(
    params: ManagementReportQueryReq,
  ): Promise<ResponseData<ManagementReportQueryVo>> {
    return managementReportRequest.post('/query', params);
  }

  /* ---- 各渠道月账单 ---- */
  /** 支付宝 - 分页查询 */
  static async getZfbBillPage(
    params: FinanceZfbBillInfoPageReq,
  ): Promise<ResponseData<IPageFinanceZfbBillInfoVo>> {
    return channelBillRequest.post('/zfb-bill/page', params);
  }
  /** 支付宝 - 生成月账单 */
  static async generateZfbBill(params: FinanceZfbBillGenerateReq): Promise<ResponseData<any>> {
    return channelBillRequest.post('/zfb-bill/generate', params);
  }
  // 拼多多、抖音、天猫、小红书 待补
}

export default ManagementReportApi;
