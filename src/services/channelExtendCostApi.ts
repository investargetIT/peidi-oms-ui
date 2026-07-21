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
  detailCount?: number;
  details?: FinanceChannelExtendCostDetailVo[];
  totalExpenseAmount?: number;
  yearMonth?: string;
  [property: string]: any;
}

export interface FinanceChannelExtendCostShopGroupVo {
  channel?: string;
  monthGroups?: FinanceChannelExtendCostMonthGroupVo[];
  shopId?: number;
  totalCount?: number;
  totalExpenseAmount?: number;
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

// 创建渠道推广费用的request实例
// 测试环境使用
// const channelExtendCostRequest = createRequest(`http://12.18.1.36:8085/oms/finance/channel-extend-cost`, {
//   timeout: 1000 * 60,
// });
// 生产环境使用
const channelExtendCostRequest = createRequest(
  `${process.env.BASE_URL}/finance/channel-extend-cost`,
  {
    timeout: 1000 * 60,
  },
);

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
    data: {
      costCategory?: string;
      costType?: string;
      totalExpense?: number;
      wdtName?: string;
      [key: string]: any;
    }[];
    msg: string;
    success?: boolean;
  }> {
    return channelExtendCostRequest.get('/cost-category-stat', {
      params,
    });
  }
}

// 默认导出实例
export default ChannelExtendCostApi;

// 导出请求实例，方便其他地方使用
export { channelExtendCostRequest };
