import { createRequest, ResponseData } from './axiosRequest';

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

export interface FinanceChannelExtendCostMonthGroupVo {
  details?: FinanceChannelExtendCostDetailVo[];
  yearMonth?: string;
  [property: string]: any;
}

export interface FinanceChannelExtendCostShopGroupVo {
  channel?: string;
  monthGroups?: FinanceChannelExtendCostMonthGroupVo[];
  shopId?: number;
  totalCount?: number;
  wdtName?: string;
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
  records?: FinanceChannelExtendCostShopGroupVo[];
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

// 创建渠道推广费用的request实例
// 测试环境使用
const channelExtendCostRequest = createRequest(
  `http://12.18.1.36:8085/oms/finance/channel-extend-cost`,
  {
    timeout: 1000 * 60,
  },
);
// 生产环境使用
// const channelExtendCostRequest = createRequest(
//   `${process.env.BASE_URL}/finance/channel-extend-cost`,
//   {
//     timeout: 1000 * 60,
//   },
// );

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
}

// 默认导出实例
export default ChannelExtendCostApi;

// 导出请求实例，方便其他地方使用
export { channelExtendCostRequest };
