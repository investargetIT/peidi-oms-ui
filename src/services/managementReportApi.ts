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
  /**
   * 平台，传中文：拼多多 / 抖音 / 天猫 / 小红书 / 支付宝
   */
  platform?: string;
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
  /**
   * 账单文件 URL 列表（与 fileNames 一一对应）
   */
  fileUrls?: string[] | null;
  /**
   * 账单文件名称列表（与 fileUrls 一一对应）
   */
  fileNames?: string[] | null;
  fileObjectKey?: string | null;
  financeZfbBillConfigId?: number;
  generateStatus?: number;
  id?: number;
  merchantName?: string;
  shopName?: string;
  shopId?: number | null;
  financeBillConfigId?: number;
  platform?: string;
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

/**
 * 账单配置列表（不分页）
 * /oms/finance/bill-config/list 返回
 */
export interface FinanceZfbBillConfig {
  accessToken?: string;
  alipayMerchantNo?: string;
  appId?: string;
  companyName?: string;
  createdAt?: string;
  id?: number;
  isDel?: number;
  merchantName?: string;
  platform?: string;
  shopName?: string;
  updatedAt?: string;
  [property: string]: any;
}

/**
 * 上传账单导入结果
 * /oms/finance/tm-bill/upload 等上传类接口返回
 */
export interface FinanceChannelExtendCostImportVo {
  /**
   * 错误信息列表
   */
  errorMessages?: string[];
  /**
   * 失败数
   */
  failCount?: number;
  /**
   * 处理日志
   */
  logs?: string[];
  /**
   * 是否成功
   */
  success?: boolean;
  /**
   * 成功导入数
   */
  successCount?: number;
  /**
   * 总记录数
   */
  totalCount?: number;
  [property: string]: any;
}

/**
 * 上传天猫账单请求
 */
export interface FinanceTmBillUploadReq {
  /**
   * 渠道（tm）
   */
  channel: string;
  /**
   * 账单日期，格式：yyyy-MM
   */
  date: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 账单文件（Excel/CSV）
   */
  file: File;
  [property: string]: any;
}

/**
 * 上传抖音账单请求
 */
export interface FinanceDyBillUploadReq {
  /**
   * 渠道（dy）
   */
  channel: string;
  /**
   * 账单日期，格式：yyyy-MM
   */
  date: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 账单文件（Excel/CSV）
   */
  file: File;
  [property: string]: any;
}

/**
 * 上传京东账单请求
 * 京东特殊：一次需要上传 2 个文件 —— 账单明细（file1）+ 财务汇总表（file2）
 */
export interface FinanceJdBillUploadReq {
  /**
   * 渠道（jd）
   */
  channel: string;
  /**
   * 账单日期，格式：yyyy-MM
   */
  date: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 账单明细文件（Excel/CSV）
   */
  file1: File;
  /**
   * 财务汇总表文件（Excel/CSV）
   */
  file2: File;
  [property: string]: any;
}

/**
 * 上传天猫缺货赔付账单请求
 * /oms/finance/tm-stockout-bill/upload
 * billDate / financeBillConfigId 走 query string，file 走 multipart body
 */
export interface FinanceStockoutBillUploadReq {
  /**
   * 账单日期，格式：yyyy-MM
   */
  billDate: string;
  /**
   * 关联账单配置ID（需已生成当月天猫账单）
   */
  financeBillConfigId: number;
  /**
   * 账单文件（zip/csv/excel，zip 会递归解压）
   */
  file: File;
  [property: string]: any;
}

/**
 * 上传小红书账单请求
 * /oms/finance/xhs-bill/upload
 * billDate / financeBillConfigId 走 query string，file1 / file2 走 multipart body
 */
export interface FinanceXhsBillUploadReq {
  /**
   * 账单日期，格式：yyyy-MM
   */
  billDate: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 贷款明细文件（csv/excel，A1为"创建时间"）
   */
  file1: File;
  /**
   * 订单结算明细文件（csv/excel，A1为"订单号"）
   */
  file2: File;
  [property: string]: any;
}

// 创建管报数据的request实例
// 测试环境使用
// const managementReportRequest = createRequest(`http://12.18.1.36:8085/oms/management-report`, {
//   timeout: 1000 * 60,
// });
// 生产环境使用
const managementReportRequest = createRequest(
  `${process.env.BASE_URL}/management-report`,
  {
    timeout: 1000 * 60,
  },
);

// 创建各渠道月账单的request实例
// 测试环境使用
// const channelBillRequest = createRequest(`http://12.18.1.36:8085/oms/finance`, {
//   timeout: 1000 * 60,
// });
// 生产环境使用
const channelBillRequest = createRequest(
  `${process.env.BASE_URL}/finance`,
  {
    timeout: 1000 * 60,
  },
);

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
  /**
   * 各渠道月账单 - 分页查询
   * 统一调用 /zfb-bill/page 接口，通过 platform 参数区分渠道（拼多多/抖音/天猫/小红书/支付宝）
   */
  static async getZfbBillPage(
    params: FinanceZfbBillInfoPageReq,
  ): Promise<ResponseData<IPageFinanceZfbBillInfoVo>> {
    return channelBillRequest.post('/zfb-bill/page', params);
  }
  /**
   * 各渠道月账单 - 生成
   * 统一调用 /zfb-bill/generate 接口，通过 platform 参数区分渠道
   */
  static async generateZfbBill(params: FinanceZfbBillGenerateReq): Promise<ResponseData<any>> {
    return channelBillRequest.post('/zfb-bill/generate', params);
  }
  /**
   * 各渠道月账单 - 批量下载（后端代理打包为 ZIP 返回，避免 OSS CORS 限制）
   * 后端实现思路：接收 ids 列表，服务端到 OSS 拉取文件，打包成 zip 流式返回（Content-Type: application/zip）
   */
  static async batchDownloadZfbBill(params: {
    ids: number[];
    platform?: string;
  }): Promise<Blob> {
    const resp = await channelBillRequest.post('/zfb-bill/batch-download', params, {
      responseType: 'blob',
    });
    return resp as unknown as Blob;
  }
  /**
   * 账单配置列表（不分页）
   * GET /oms/finance/bill-config/list
   */
  static async getBillConfigList(params?: {
    platform?: string;
    shopName?: string;
  }): Promise<ResponseData<FinanceZfbBillConfig[]>> {
    return channelBillRequest.get('/bill-config/list', { params });
  }
  /**
   * 上传天猫账单
   * POST /oms/finance/tm-bill/upload（multipart/form-data）
   * 后端解析账单比较耗时（10+ 分钟），单独把超时拉到 1 小时
   */
  static async uploadTmallBill(
    data: FinanceTmBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('channel', data.channel);
    formData.append('date', data.date);
    formData.append('financeBillConfigId', String(data.financeBillConfigId));
    formData.append('file', data.file);
    return channelBillRequest.post('/tm-bill/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 单接口覆盖：1 小时超时（默认实例只有 1 分钟）
      timeout: 1000 * 60 * 60,
      // 关闭 axios 进度条 UI（任务卡自己有 spinner）
      showLoading: false,
    });
  }
  /**
   * 上传抖音账单
   * POST /oms/finance/dy-bill/upload（multipart/form-data）
   * 后端解析账单比较耗时（10+ 分钟），单独把超时拉到 1 小时
   */
  static async uploadDouyinBill(
    data: FinanceDyBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('channel', data.channel);
    formData.append('date', data.date);
    formData.append('financeBillConfigId', String(data.financeBillConfigId));
    formData.append('file', data.file);
    return channelBillRequest.post('/dy-bill/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 单接口覆盖：1 小时超时（默认实例只有 1 分钟）
      timeout: 1000 * 60 * 60,
      // 关闭 axios 进度条 UI（任务卡自己有 spinner）
      showLoading: false,
    });
  }
  /**
   * 上传京东账单
   * POST /oms/finance/jd-bill/upload（multipart/form-data）
   * 京东一次需要上传 2 个文件：账单明细 file1 + 财务汇总 file2
   * 后端解析账单比较耗时（10+ 分钟），单独把超时拉到 1 小时
   */
  static async uploadJdBill(
    data: FinanceJdBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('channel', data.channel);
    formData.append('date', data.date);
    formData.append('financeBillConfigId', String(data.financeBillConfigId));
    formData.append('file1', data.file1);
    formData.append('file2', data.file2);
    return channelBillRequest.post('/jd-bill/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 单接口覆盖：1 小时超时（默认实例只有 1 分钟）
      timeout: 1000 * 60 * 60,
      // 关闭 axios 进度条 UI（任务卡自己有 spinner）
      showLoading: false,
    });
  }
  /**
   * 上传天猫缺货赔付账单
   * POST /oms/finance/tm-stockout-bill/upload
   * billDate / financeBillConfigId 走 query string，file 走 multipart body
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadStockoutBill(
    data: FinanceStockoutBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('file', data.file);
    return channelBillRequest.post('/tm-stockout-bill/upload', formData, {
      params: {
        billDate: data.billDate,
        financeBillConfigId: data.financeBillConfigId,
      },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 1000 * 60 * 60,
      showLoading: false,
    });
  }
  /**
   * 上传小红书账单
   * POST /oms/finance/xhs-bill/upload（multipart/form-data）
   * billDate / financeBillConfigId 走 query string，file1 / file2 走 multipart body
   * 小红书一次需要上传 2 个文件：贷款明细（file1）+ 订单结算明细（file2）
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadXhsBill(
    data: FinanceXhsBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('file1', data.file1);
    formData.append('file2', data.file2);
    return channelBillRequest.post('/xhs-bill/upload', formData, {
      params: {
        billDate: data.billDate,
        financeBillConfigId: data.financeBillConfigId,
      },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 1000 * 60 * 60,
      showLoading: false,
    });
  }

  // 拼多多 待补
}

export default ManagementReportApi;
