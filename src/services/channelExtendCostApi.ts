import { createRequest, ResponseData } from './axiosRequest';

// ==================== 本地/生产环境切换 ====================
// 创建渠道推广费用的request实例
// 生产环境使用
const channelExtendCostRequest = createRequest(
  `${process.env.BASE_URL}/finance/channel-extend-cost`,
  {
    timeout: 1000 * 60,
  },
);
// 测试环境使用
// const channelExtendCostRequest = createRequest(
//   `http://12.18.1.36:8085/oms/finance/channel-extend-cost`,
//   {
//     timeout: 1000 * 60,
//   },
// );
// ==================== 切换代码结束 ====================

export interface PageRequest {
  accountType?: string;
  channel?: string;
  pageNum?: number;
  pageSize?: number;
  shopId?: number;
  yearMonth?: string;
  [property: string]: any;
}

export interface ShopRequest {
  searchName?: string;
  searchValue?: string;
  searchStr?: string;
  sortStr?: string;
  [property: string]: any;
}

export interface ShopVo {
  channel?: string;
  channelFactor?: string;
  dsrDate?: string;
  id?: number;
  logisticScore?: number;
  needRefund?: number;
  needSummary?: number;
  org?: string;
  platform?: string;
  principal?: string;
  productScore?: number;
  salesman?: string;
  serviceScore?: number;
  shopName?: string;
  target?: number;
  team?: string;
  wdtName?: string;
  year?: number;
  [property: string]: any;
}

export interface OrderItem {
  asc?: boolean;
  column?: string;
  [property: string]: any;
}

export interface FinanceChannelExtendCostDetailVo {
  accountType?: string;
  businessDesc?: string;
  channel?: string;
  expenseAmount?: number;
  id?: number;
  occurredAt?: string;
  shopId?: number;
  wdtName?: string;
  [property: string]: any;
}

export interface FinanceChannelExtendCostItemVo {
  /** 店铺ID */
  shopId?: number;
  /** 店铺名称（旺店通名称） */
  wdtName?: string;
  /** 渠道（拼多多/天猫/抖音/京东...） */
  channel?: string;
  /** 年月 yyyy-MM */
  yearMonth?: string;
  /** 账单配置ID */
  financeBillConfigId?: number;
  /** 平台（与 channel 含义相近） */
  platform?: string;
  /** 店铺短名 */
  shopName?: string;
  /** 公司名称 */
  companyName?: string | null;
  /** 生成状态 */
  generateStatus?: number;
  /** 期初余额 = 上月期末余额 */
  beginningBalance?: number;
  /** 期末余额 */
  endingBalance?: number;
  [property: string]: any;
}

export interface PageResponse {
  asc?: string[];
  ascs?: string[];
  current?: number;
  desc?: string[];
  descs?: string[];
  hitCount?: boolean;
  isSearchCount?: boolean;
  countId?: string;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: OrderItem[];
  pages?: number;
  records?: FinanceChannelExtendCostItemVo[];
  searchCount?: boolean;
  size?: number;
  total?: number;
  [property: string]: any;
}

export interface FinanceCostCategoryStatVo {
  businessCode: string;
  businessDesc: string;
  totalIncome: number;
  totalExpense: number;
  calculate: number;
  [key: string]: any;
}

/**
 * 财务渠道推广费用表
 */
export interface FinanceChannelExtendCost {
  /**
   * 账务类型
   */
  accountType: string;
  /**
   * 业务编码
   */
  businessCode: string;
  /**
   * 业务描述
   */
  businessDesc?: string;
  /**
   * 渠道
   */
  channel: string;
  /**
   * 创建时间
   */
  createdAt?: string;
  /**
   * 支出金额（-元）
   */
  expenseAmount?: number;
  /**
   * 主键ID
   */
  id?: number;
  /**
   * 收入金额（+元）
   */
  incomeAmount?: number;
  /**
   * 是否删除 0-未删除 1-已删除
   */
  isDel?: number;
  /**
   * 商户订单号
   */
  merchantOrderNo: string;
  /**
   * 发生时间
   */
  occurredAt: string;
  /**
   * 备注
   */
  remark?: string;
  /**
   * 关联shoptarget表
   */
  shopId: number;
  /**
   * 更新时间
   */
  updatedAt?: string;
  [property: string]: any;
}

export interface EndingBalanceRequest {
  accountType: string;
  shopId: number;
  yearMonth: string;
  [property: string]: any;
}

// ----- 京东费用统计 -----

/**
 * 京东账单收支计算统计结果
 */
export interface FinanceJd1CalculateStatVo {
  /**
   * 账单日期
   */
  billDate?: string;
  /**
   * 业务描述
   */
  businessDesc?: string;
  /**
   * 收支合计（收入+支出，元）
   */
  calculate?: number;
  [property: string]: any;
}

/**
 * 京东钱包支出分类统计结果
 */
export interface FinanceJd2ExpenseStatVo {
  /**
   * 备注分类
   */
  remarkCategory?: string;
  /**
   * 支出总额（元）
   */
  totalExpense?: number;
  [property: string]: any;
}

/**
 * 京东费用统计结果（京东钱包支出分类 + 京东账单收支计算）
 */
export interface FinanceJdCostStatVo {
  /**
   * 京东账单收支计算统计
   */
  jd1CalculateStat?: FinanceJd1CalculateStatVo[];
  /**
   * 京东钱包支出分类统计
   */
  jd2ExpenseStat?: FinanceJd2ExpenseStatVo[];
  [property: string]: any;
}

/**
 * 京东费用统计请求
 * GET /oms/finance/channel-extend-cost/jd-cost-stat
 */
export interface FinanceJdCostStatReq {
  /**
   * 结束日期，格式：yyyy-MM-dd
   */
  endDate: string;
  /**
   * 店铺ID
   */
  shopId: number;
  /**
   * 开始日期，格式：yyyy-MM-dd
   */
  startDate: string;
  [property: string]: any;
}

// ----- 小红书费用统计 -----

/**
 * 小红书费用统计项（按 business_desc 分类）
 * 返回 name-value-type 格式
 * GET /oms/finance/channel-extend-cost/xhs-cost-stat
 */
export interface FinanceXhsCostStatItemVo {
  /**
   * 费用名称（中文）
   */
  name?: string;
  /**
   * 类型：收入/支出
   */
  type?: string;
  /**
   * 费用金额（包含正负号）
   */
  value?: number;
  [property: string]: any;
}

/**
 * 小红书费用统计请求
 * GET /oms/finance/channel-extend-cost/xhs-cost-stat
 */
export interface FinanceXhsCostStatReq {
  /**
   * 店铺ID
   */
  shopId: number;
  /**
   * 年月，格式：yyyy-MM
   */
  yearMonth: string;
  [property: string]: any;
}

// ----- 快手费用统计 -----

/**
 * 快手费用统计项（按 business_desc 分类）
 * 返回 name-value-type 格式
 * GET /oms/finance/channel-extend-cost/ks-cost-stat
 */
export interface FinanceKuaishouCostStatItemVo {
  /**
   * 费用名称（中文）
   */
  name?: string;
  /**
   * 类型：收入/支出
   */
  type?: string;
  /**
   * 费用金额（包含正负号）
   */
  value?: number;
  [property: string]: any;
}

/**
 * 快手费用统计请求
 * GET /oms/finance/channel-extend-cost/ks-cost-stat
 */
export interface FinanceKuaishouCostStatReq {
  /**
   * 店铺ID
   */
  shopId: number;
  /**
   * 年月，格式：yyyy-MM
   */
  yearMonth: string;
  [property: string]: any;
}

// ----- 支付宝费用统计 -----

/**
 * 支付宝费用统计 - 账单汇总行（分类 + 对方账号 + 收入/支出）
 * POST /oms/finance/channel-extend-cost/bill/zfb/detail-summary
 */
export interface FinanceZfbCostStatDetailItemVo {
  /**
   * 对方账号
   */
  accountCode?: string;
  /**
   * 分类（document_type），总计行为'总计'
   */
  category?: string;
  /**
   * 支出合计
   */
  totalExpense?: number;
  /**
   * 收入合计
   */
  totalIncome?: number;
  [property: string]: any;
}

/**
 * 支付宝费用统计 - 汇总结果
 * POST /oms/finance/channel-extend-cost/bill/zfb/detail-summary
 */
export interface FinanceZfbCostStatVo {
  /**
   * 查询结束日期（由账单月份解析，yyyy-MM-dd）
   */
  endDate?: string;
  /**
   * 汇总行列表（分类 + 对方账号 + 收入/支出）
   */
  rows?: FinanceZfbCostStatDetailItemVo[];
  /**
   * 查询起始日期（由账单月份解析，yyyy-MM-dd）
   */
  startDate?: string;
  /**
   * 总计行（收入/支出全量合计）
   */
  total?: FinanceZfbCostStatDetailItemVo;
  [property: string]: any;
}

/**
 * 支付宝费用统计请求
 * POST /oms/finance/channel-extend-cost/bill/zfb/detail-summary
 */
export interface FinanceZfbCostStatReq {
  /**
   * 账单月份，格式：yyyy-MM（后端解析为该月日期区间）
   */
  billDate: string;
  /**
   * 账单配置ID（finance_bill_config.id）
   */
  financeBillConfigId: number;
  [property: string]: any;
}

// ----- 抖音费用统计 -----

/**
 * 抖音费用统计 - 明细项（业务分类下的具体费用项）
 * GET /oms/finance/channel-extend-cost/dy-cost-stat
 */
export interface FinanceDyCostStatDetailVo {
  /**
   * 费用项名称（如 动账金额 / 佣金 / 平台服务费 / 订单净收入 ...）
   */
  name?: string;
  /**
   * 数值（元）
   */
  value?: number;
  [property: string]: any;
}

/**
 * 抖音费用统计结果（按动账场景/业务分类，每个分类含名目 + 明细项）
 * 业务描述（分类别）= name；后续各列为 details 里各费用项（details[i].name）
 * GET /oms/finance/channel-extend-cost/dy-cost-stat
 */
export interface FinanceDyCostStatVo {
  /**
   * 业务描述（分类别）
   */
  name?: string;
  /**
   * 该分类动账金额（元）
   */
  value?: number;
  /**
   * 明细项列表（每项 { name, value }）
   */
  details?: FinanceDyCostStatDetailVo[];
  [property: string]: any;
}

/**
 * 抖音费用统计请求
 * GET /oms/finance/channel-extend-cost/dy-cost-stat
 */
export interface FinanceDyCostStatReq {
  /**
   * 店铺ID
   */
  shopId: number;
  /**
   * 年月，格式：yyyy-MM
   */
  yearMonth: string;
  [property: string]: any;
}

// 渠道推广费用API类
export class ChannelExtendCostApi {
  /**
   * 分组分页查询渠道推广费用（按店铺和年月分组）
   */
  static async getGroupPage(params: PageRequest): Promise<{
    code: number;
    data: PageResponse;
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/group/page', {
      params: {
        pageNum: params.pageNum || 1,
        pageSize: params.pageSize || 10,
        ...params,
      },
    });
  }

  /**
   * 获取店铺列表
   */
  static async getShops(params: ShopRequest): Promise<{
    code: number;
    data: ShopVo[];
    msg: string;
    success?: boolean;
  }> {
    // 往上跳两级到/oms，然后到orders模块
    return channelExtendCostRequest.get('../../orders/shopTarget', {
      params,
    });
  }

  /**
   * 分页查询渠道推广费用明细
   */
  static async getDetails(params: PageRequest): Promise<{
    code: number;
    data: Response;
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/details', {
      params: {
        pageNum: params.pageNum || 1,
        pageSize: params.pageSize || 20,
        ...params,
      },
    });
  }

  /**
   * 查询站内外推广费分类统计
   */
  static async getCostCategoryStat(params: {
    shopId: number;
    yearMonth: string;
    /** 渠道名（支付宝/拼多多/抖音/天猫/小红书/京东/快手），后端已调整为必传 */
    channel: string;
    [key: string]: any;
  }): Promise<{
    code: number;
    data: FinanceCostCategoryStatVo[];
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/cost-category-stat', {
      params,
    });
  }

  /**
   * 查询期末余额
   */
  static async queryEndingBalance(params: EndingBalanceRequest): Promise<{
    code: number;
    data: FinanceChannelExtendCost;
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/query', {
      params,
    });
  }

  /**
   * 京东费用统计（京东钱包支出分类 + 京东账单收支计算）
   * GET /oms/finance/channel-extend-cost/jd-cost-stat
   */
  static async getJdCostStat(params: FinanceJdCostStatReq): Promise<{
    code: number;
    data: FinanceJdCostStatVo;
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/jd-cost-stat', { params });
  }

  /**
   * 支付宝费用统计（账单明细汇总查询）
   * POST /oms/finance/channel-extend-cost/bill/zfb/detail-summary
   */
  static async getZfbCostStat(params: FinanceZfbCostStatReq): Promise<{
    code: number;
    data: FinanceZfbCostStatVo;
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.post('/bill/zfb/detail-summary', params);
  }

  /**
   * 抖音费用统计（按动账场景分类，汇总各费用项）
   * GET /oms/finance/channel-extend-cost/dy-cost-stat
   */
  static async getDyCostStat(params: FinanceDyCostStatReq): Promise<{
    code: number;
    data: FinanceDyCostStatVo[];
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/dy-cost-stat', { params });
  }

  /**
   * 小红书费用统计（按 business_desc 分类，返回 name-value-type 格式）
   * GET /oms/finance/channel-extend-cost/xhs-cost-stat
   */
  static async getXhsCostStat(params: FinanceXhsCostStatReq): Promise<{
    code: number;
    data: FinanceXhsCostStatItemVo[];
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/xhs-cost-stat', { params });
  }

  /**
   * 快手费用统计（按 business_desc 分类，返回 name-value-type 格式）
   * GET /oms/finance/channel-extend-cost/ks-cost-stat
   */
  static async getKuaishouCostStat(params: FinanceKuaishouCostStatReq): Promise<{
    code: number;
    data: FinanceKuaishouCostStatItemVo[];
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/ks-cost-stat', { params });
  }
}

// 默认导出实例
export default ChannelExtendCostApi;

// 导出请求实例，方便其他地方使用
export { channelExtendCostRequest };
