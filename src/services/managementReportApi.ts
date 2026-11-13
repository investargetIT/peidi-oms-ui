import { createRequest, ResponseData } from './axiosRequest';
import { getOmsBaseUrl } from './apiTarget';

// ==================== 本地/生产/本地2 环境切换 ====================
// 统一 OMS 服务 request 实例：本文件所有接口（管报 / 各渠道月账单 / 各渠道上传账单等）
// 都挂在同一个 OMS 服务上，共用这一个实例，路由在各方法里写完整（含 /management-report、/finance 前缀）。
// 地址不再写死：由 apiTarget.ts 统一管理，支持运行时切换（见该文件顶部说明）。
// 默认生产；本地联调控制台执行：window.__api.set('local1' | 'local2')
const omsRequest = createRequest(() => getOmsBaseUrl(), {
  timeout: 1000 * 60,
});

// 各渠道月账单接口：同样跟随 apiTarget 切换
const billRequest = createRequest(() => getOmsBaseUrl(), {
  timeout: 1000 * 60,
});
// ==================== 切换代码结束 ====================

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
   * 数据类型：1-线上 2-线下 3-沃尔玛 4-京东自营 5-天猫超市 6-天猫闪购
   * 7-招行内购 8-宁波银行 9-天猫国际 10-亚马逊 11-沃尔玛山姆
   * 注：type=6 必须整月查询（startDate 为当月 1 号、endDate 为当月最后一天）；
   * type=9/10 复用 jdList（不返回 feeList），type=7/8 返回 zhaohangList / ningboList；
   * type=11 返回 walmartDetailList（明细表）+ walmartProfitList（利润表）
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
 * 京东自营销售+成本返回对象（type=4）
 */
export interface JdSalesCostVo {
  amountWithoutTax?: number;
  brandName?: string | null;
  created?: string;
  /**
   * 临期（无数据来源时为 null）
   */
  nearExpiry?: string | null;
  financeTotalCost?: number | null;
  financeUnitCost?: number | null;
  internalTransferTotalPrice?: number | null;
  internalTransferUnitPrice?: number | null;
  merchantCode?: string;
  orderCustomer?: string;
  own?: string | null;
  productName?: string;
  quantity?: number;
  shopName?: string;
  specNo?: string | null;
  taxRate?: string;
  totalWithTax?: number;
  u9?: string;
  unitPrice?: number;
  [property: string]: any;
}

/**
 * 天猫超市销售+成本返回对象（type=5）
 * 与京东自营共用同一套 16 个字段，另附天猫特有字段：backendGoodsCode / ticketDeduction / invoiceAmount / bizDate
 */
export interface TmcsSalesCostVo {
  amountWithoutTax?: number | null;
  brandName?: string | null;
  financeTotalCost?: number | null;
  financeUnitCost?: number | null;
  internalTransferTotalPrice?: number | null;
  internalTransferUnitPrice?: number | null;
  merchantCode?: string;
  orderCustomer?: string;
  own?: string | null;
  nearExpiry?: string | null;
  productName?: string | null;
  quantity?: number;
  taxRate?: string | null;
  totalWithTax?: number;
  u9?: string | null;
  unitPrice?: number;
  /**
   * 后端商品编码（天猫特有）
   */
  backendGoodsCode?: string;
  /**
   * 票扣（天猫特有）
   */
  ticketDeduction?: number;
  /**
   * 开票金额 = 含税金额 + 票扣（天猫特有）
   */
  invoiceAmount?: number;
  /**
   * 账单月份 yyyy-MM-dd（天猫特有）
   */
  bizDate?: string;
  [property: string]: any;
}

/**
 * 天猫闪购货品×仓库收入汇总返回对象（type=6）
 * 一行 = 一个货品在该月的汇总（嘉兴闪购仓 + 东莞闪购仓已合并，不返回仓库字段）
 * 注意：本类型的 taxRate 是**数字**（0.09 表示 9%），与 type=4/5 的字符串税率不同
 */
export interface TmallFlashSaleVo {
  /**
   * 订货客户，固定「天猫闪购」
   */
  orderCustomer?: string;
  merchantCode?: string;
  /**
   * 料号
   */
  u9?: string | null;
  productName?: string | null;
  brandName?: string | null;
  /**
   * 自有/外采（匹配到成本表才有，否则为 null）
   */
  own?: string | null;
  /**
   * 数量 = 实际销售量 + 系统发货但平台退款量
   */
  quantity?: number;
  /**
   * 单价 = 实际销售额 ÷ 实际销售量（实际销售量为 0 时为 null）
   */
  unitPrice?: number | null;
  /**
   * 恒为 0（保留字段，平台退款量/额已并入 quantity、totalWithTax）
   */
  refundAmount?: number;
  /**
   * 价税合计 = 实际销售额 + 系统发货但平台退款金额 + 邮费
   */
  totalWithTax?: number;
  /**
   * 税率（数字，0.09 表示 9%）；匹配不到为 null
   */
  taxRate?: number | null;
  /**
   * 不含税金额 = 价税合计 ÷ (1 + 税率)；税率为 null 时等于价税合计
   */
  amountWithoutTax?: number;
  /**
   * 财务单位成本（成本快照日 = startDate）
   */
  financeUnitCost?: number | null;
  /**
   * 财务总成本 = 财务单位成本 × quantity（含退款量）
   */
  financeTotalCost?: number | null;
  internalTransferUnitPrice?: number | null;
  /**
   * 内部转移总价 = 内部转移单价 × quantity（含退款量）
   */
  internalTransferTotalPrice?: number | null;
  /**
   * 成本匹配来源：精确-智创（已匹配）/ 未匹配
   */
  costMatchSource?: string;
  [property: string]: any;
}

/**
 * 京东自营费用子分类返回对象（type=4 / type=5）
 */
export interface JdFeeVo {
  /**
   * 未税金额
   */
  amount?: number;
  /**
   * 费用类别：快递费 / 推广费用 / 平台费用 / 公共费用分摊
   */
  category?: string;
  /**
   * 子分类名称（如 京准通 / 促销服务费 / TC运费）
   */
  name?: string;
  /**
   * 税率（如 "0.06"）
   */
  taxRate?: string;
  /**
   * 价税合计
   */
  total?: number;
  [property: string]: any;
}

/**
 * 上传 U9 应收单请求（京东自营 / 天猫国际 / 亚马逊 共用）
 */
export interface U9ReceivableUploadReq {
  /**
   * 数据类型：京东自营（默认）/ 天猫国际 / 亚马逊
   */
  type?: U9ReceivableType;
  /**
   * U9 应收单导出文件（xlsx / xls）
   */
  file: File;
}

/**
 * U9 应收单支持的数据类型（中文，按 UTF-8 传）
 * 对应管报 type：京东自营=4、天猫国际=9、亚马逊=10
 */
export const U9_RECEIVABLE_TYPES = ['京东自营', '天猫国际', '亚马逊'] as const;
export type U9ReceivableType = (typeof U9_RECEIVABLE_TYPES)[number];

/**
 * 京东自营费用保存明细项
 */
export interface JdFeeSaveItem {
  /**
   * 费用类别：快递费 / 推广费用 / 平台费用 / 公共费用分摊
   */
  category: string;
  /**
   * 子分类名称
   */
  name?: string;
  /**
   * 未税金额
   */
  amount?: number | null;
  /**
   * 税率（字符串，如 "0.09"）
   */
  taxRate?: string | null;
  /**
   * 价税合计
   */
  total?: number | null;
}

/**
 * 京东自营费用保存 / 查询请求
 */
export interface JdFeeSaveReq {
  /**
   * 数据类型：4-京东自营 5-天猫超市
   */
  type: number;
  /**
   * 结算日期 yyyy-MM-dd
   */
  dataDate: string;
  /**
   * 费用明细（按 type + dataDate 整份覆盖）
   */
  items: JdFeeSaveItem[];
}

export interface JdFeeQueryReq {
  /**
   * 数据类型：4-京东自营 5-天猫超市
   */
  type: number;
  dataDate: string;
}

/**
 * 追加 / 更新一条其他费用（按 type + dataDate + category + name upsert，不影响其它费用）
 */
export interface JdFeeAddReq {
  /**
   * 数据类型：4-京东自营 5-天猫超市
   */
  type: number;
  /**
   * 结算日期 yyyy-MM-dd
   */
  dataDate: string;
  /**
   * 费用类别：快递费 / 推广费用 / 平台费用 / 公共费用分摊
   */
  category: string;
  name: string;
  /**
   * 未税金额
   */
  amount?: number | null;
  /**
   * 税率（字符串，如 "0.09"）
   */
  taxRate?: string | null;
  /**
   * 价税合计
   */
  total?: number | null;
}

/* ==================== 沃尔玛山姆（type=11） ==================== */

/**
 * 管报明细表：沃尔玛山姆明细（出货单 + 退回单，逐行；退货不合并负数）
 * type=11 返回 walmartDetailList
 */
export interface WalmartDetailVo {
  /** 订货客户 = 渠道（山姆 / 沃尔玛） */
  orderCustomer?: string;
  /** 渠道：山姆 / 沃尔玛 */
  channel?: string;
  /** 单据类型：出货单 / 退回单 */
  docType?: string;
  /** 单据编号 */
  docNo?: string;
  /** 货号 */
  merchantCode?: string;
  /** 商品编号 */
  merchantSku?: string | null;
  /** 料号 */
  u9?: string;
  /** 品名 */
  productName?: string;
  /** 品牌 */
  brandName?: string | null;
  /** 自有/外采（固定「自有」） */
  own?: string;
  /** 数量（出货单=出库数量；退回单=可开票数量） */
  quantity?: number;
  /** 单价（最终价） */
  unitPrice?: number;
  /** 价税合计 */
  totalWithTax?: number;
  /** 税率（数字，0.09 表示 9%；按料号取，匹配不到为 null） */
  taxRate?: number | null;
  /** 不含税金额 = 价税合计 / (1 + 税率) */
  amountWithoutTax?: number;
  /** 含税收入（明细表展示） */
  revenueWithTax?: number;
  /** 不含税收入（明细表展示） */
  revenueWithoutTax?: number;
  /** 成本 = 该月成本单价 × 实际出货量；该料号当月无成本单价时为 null */
  costAmount?: number | null;
  /** 单据日期 yyyy-MM-dd */
  created?: string;
  [property: string]: any;
}

/**
 * 管报利润表：沃尔玛山姆利润（固定「山姆 / 沃尔玛 / 合计」三行）
 * type=11 返回 walmartProfitList
 */
export interface WalmartProfitVo {
  /** 渠道：山姆 / 沃尔玛 / 合计 */
  channel?: string;
  /** 月份 yyyy-MM */
  month?: string;
  /** 订单金额 */
  orderAmount?: number;
  /** 销售收入 */
  salesRevenue?: number;
  /** 未税收入 */
  noTaxRevenue?: number;
  /** 返利（含预计年返） */
  rebate?: number;
  /** 商品成本（含包材） */
  goodsCost?: number;
  /** 物流 */
  logistics?: number;
  /** 毛利 */
  grossProfit?: number;
  /** 毛利率（小数，0.059 表示 5.90%） */
  grossMargin?: number;
  /** 营业税金及附加 */
  taxSurcharge?: number;
  /** 仓储 */
  storage?: number;
  /** 人工（装 PDQ 人工） */
  labor?: number;
  /** 货损 */
  loss?: number;
  /** 净利润 */
  netProfit?: number;
  /** 净利率（小数，0.033342 表示 3.3342%） */
  netMargin?: number;
  [property: string]: any;
}

/**
 * 沃尔玛山姆月度成本单价 / 物流费行（同一张表，kind 区分）
 */
export interface WalmartCostVo {
  id?: number;
  /** 年月 yyyy-MM */
  month?: string;
  /** 料号（物流费行为 null） */
  materialNo?: string | null;
  /** 品名 */
  goodsName?: string | null;
  /** 渠道：成本单价行=该料号的渠道；物流费行=该行渠道（山姆/沃尔玛） */
  channel?: string | null;
  /** 类型：成本单价 / 物流费 */
  kind?: string;
  /** 成本单价；物流费行=当月物流费（含税） */
  costPrice?: number | null;
  /** 包材单价（仅展示，不参与计算） */
  packagingPrice?: number | null;
  [property: string]: any;
}

/**
 * 查询沃尔玛山姆月度成本单价 + 物流费
 * POST /oms/finance/walmart-cost/list
 */
export interface WalmartCostListReq {
  /** 年月 yyyy-MM */
  month: string;
  /** 料号 / 品名关键字 */
  keyword?: string;
}

/**
 * 新增 / 更新单条成本单价（channel 同时维护渠道）
 * POST /oms/finance/walmart-cost/save
 */
export interface WalmartCostSaveReq {
  /** 年月 yyyy-MM */
  month: string;
  /** 料号 */
  materialNo?: string | null;
  /** 成本单价（物流费行时为含税物流费） */
  costPrice?: number | null;
  /** 品名 */
  goodsName?: string | null;
  /** 渠道：山姆 / 沃尔玛 */
  channel?: string | null;
  /** 类型：成本单价 / 物流费（不传默认成本单价） */
  kind?: string;
}

/**
 * 批量新增到新月份（只复制 kind=成本单价 行，物流费不复制）
 * POST /oms/finance/walmart-cost/copy
 */
export interface WalmartCostCopyReq {
  /** 被复制的月份 yyyy-MM */
  sourceMonth: string;
  /** 新配置月份 yyyy-MM */
  targetMonth: string;
}

/**
 * 删除成本单价 / 物流费
 * POST /oms/finance/walmart-cost/delete
 */
export interface WalmartCostDeleteReq {
  id?: number;
  month?: string;
  materialNo?: string;
}

/**
 * 录入 / 更新某月某渠道物流费（含税）
 * POST /oms/finance/walmart-cost/logistics-save
 */
export interface WalmartLogisticsSaveReq {
  /** 年月 yyyy-MM */
  month: string;
  /** 渠道：山姆 / 沃尔玛 */
  channel: string;
  /** 当月物流费（含税） */
  amount: number;
}

/**
 * 上传沃尔玛山姆三份原始单（三个文件均可选，同类型同月覆盖）
 * POST /oms/finance/walmart-sam/upload（multipart/form-data）
 */
export interface WalmartSamUploadReq {
  /** 账单月份 yyyy-MM */
  month: string;
  /** 出货单 */
  chuhuoFile?: File;
  /** 退回单（不是每月都有） */
  tuihuiFile?: File;
  /** 销售订单 */
  orderFile?: File;
}

/**
 * 上传天猫超市账单请求
 * POST /oms/finance/tmcs/upload（multipart/form-data）
 */
export interface TmcsUploadReq {
  /**
   * 账单明细（含 sheet「账单明细-寄售」）
   */
  billFile: File;
  /**
   * 货品数据（可选）
   */
  goodsFile?: File;
  /**
   * 数据类型，默认 5
   */
  type?: number;
  /**
   * 账单月份 yyyy-MM
   */
  month: string;
}

/**
 * 管报数据查询返回对象
 */
export interface ManagementReportQueryVo {
  feeList?: JdFeeVo[];
  /**
   * 京东自营（type=4）/ 天猫国际（type=9）/ 亚马逊（type=10）共用
   */
  jdList?: JdSalesCostVo[];
  offlineList?: SalesOutDetailsCostVo[];
  onlineList?: FinanceGoodsSalesSummaryAllCostVo[];
  tmcsList?: TmcsSalesCostVo[];
  walmartList?: WalmartRebateQueryVo[];
  /**
   * 天猫闪购（type=6）：只有该列表有值，其余列表为 null；无数据时为 []
   */
  warehouseList?: TmallFlashSaleVo[];
  /**
   * 招行内购（type=7）：字段同 jdList
   */
  zhaohangList?: JdSalesCostVo[];
  /**
   * 宁波银行（type=8）：字段同 jdList
   */
  ningboList?: JdSalesCostVo[];
  /**
   * 沃尔玛山姆（type=11）明细表：出货单 + 退回单明细（逐行）
   */
  walmartDetailList?: WalmartDetailVo[];
  /**
   * 沃尔玛山姆（type=11）利润表：山姆 / 沃尔玛 / 合计 三行利润
   */
  walmartProfitList?: WalmartProfitVo[];
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
  /**
   * 财务收入（元）
   */
  financeIncome?: number;
  /**
   * 财务支出（元）
   */
  financeExpense?: number;
  /**
   * 店铺收入（元）
   */
  shopIncome?: number;
  /**
   * 店铺退款（元）
   */
  shopRefund?: number;
  /**
   * 推广金额（元）
   */
  promotionAmount?: number;
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
 * 微信/微盟流水汇总行
 * /oms/finance/wx-bill/upload、/oms/finance/wm-bill/upload 返回 summary 数组元素
 */
export interface LedgerSummaryRowVo {
  /**
   * 收支类型（收入/支出；总计行为空）
   */
  accountType?: string;
  /**
   * 汇总金额（元）
   */
  amount?: number;
  /**
   * 业务类型（交易/扣除交易手续费/退款/提现；总计行固定为"总计"）
   */
  businessType?: string;
  /**
   * 分类（收款/交易手续费/提现/其他）
   */
  category?: string;
  /**
   * 费用分类（其他/平台费用）
   */
  expenseCategory?: string;
  [property: string]: any;
}

/**
 * 微信/微盟账单导入结果
 * /oms/finance/wx-bill/upload、/oms/finance/wm-bill/upload 返回
 */
export interface FinanceLedgerBillUploadVo {
  /**
   * 渠道编码（wx=微信/星云有客，wm=微盟），对应 finance_channel_extend_cost.channel
   */
  channel?: string;
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
   * 按(业务类型,收支类型)汇总的表格行（含总计行）
   */
  summary?: LedgerSummaryRowVo[];
  /**
   * 总记录数
   */
  totalCount?: number;
  [property: string]: any;
}

/**
 * 上传微信/微盟账单请求
 * billDate / financeBillConfigId 走 query string，file 走 multipart body
 */
export interface FinanceWxWmBillUploadReq {
  /**
   * 账单日期，格式：yyyy-MM
   */
  billDate: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 流水文件（xlsx/csv，表头第1列"记账时间"）
   */
  file: File;
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
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
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
  [property: string]: any;
}

/**
 * 上传拼多多账单请求
 */
export interface FinancePddBillUploadReq {
  /**
   * 渠道（pdd）
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
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
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
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
  [property: string]: any;
}

/**
 * 新增拼多多推广费请求
 * /oms/finance/channel-extend-cost/pdd-promotion
 */
export interface FinancePddPromotionAddReq {
  /**
   * 日期，格式：yyyy-MM-dd
   */
  date: string;
  /**
   * 账单配置ID（finance_bill_config.id）
   */
  financeBillConfigId: number;
  /**
   * 推广金额（元）
   */
  promotionAmount: number;
  [property: string]: any;
}

/**
 * 上传京东账单请求
 * 京东特殊：一次需要上传 2 个文件 —— 财务汇总表（file1）+ 月账单（file2）
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
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
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
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
  [property: string]: any;
}

/**
 * 上传快手账单请求
 * /oms/finance/ks-bill/upload
 * billDate / financeBillConfigId 走 query string，file / walletFile / storeZipFile 走 multipart body
 * 快手由「单表上传」改为「双表上传」：订单流水导出(file) + 安心钱包账单(walletFile，可选)
 */
export interface FinanceKsBillUploadReq {
  /**
   * 账单日期，格式：yyyy-MM
   */
  billDate: string;
  /**
   * 关联账单配置ID
   */
  financeBillConfigId: number;
  /**
   * 订单流水导出文件，支持 xlsx/xls/csv/txt/zip（表头 A1 为"商家ID"）；
   * 传 zip 时后端会解出内部表格再解析
   */
  file: File;
  /**
   * 安心钱包账单文件，支持 csv/txt/xlsx/xls/zip（表头 A1 为"账务流水号"）；
   * 可选，不传则跳过运费险解析
   */
  walletFile?: File;
  /**
   * 归档用的原始压缩包（如"货款账单.zip"），可选；传入后下载链接即为该 zip
   */
  storeZipFile?: File;
  /**
   * 期初余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  beginningBalance?: number | string | null;
  /**
   * 期末余额（元）。不传/空串则沿用库中已有值，首次新建且不传记 0
   */
  endingBalance?: number | string | null;
  [property: string]: any;
}

/**
 * 各渠道月账单 /zfb-bill/page 的 channel 取值映射：
 * 其余渠道（支付宝/拼多多/抖音/天猫/小红书/京东/快手）与 platform 一致。
 * 微信/微盟本地联调时按后端排期传中文「微信」「微盟」（原 wx/wm），后端调整后可改回。
 */
export const ZFB_BILL_CHANNEL_MAP: Record<string, string> = {
  微信: '微信',
  微盟: '微盟',
};

/**
 * 余额字段（期初 / 期末）入参
 */
export interface BillBalanceFields {
  beginningBalance?: number | string | null;
  endingBalance?: number | string | null;
}

/**
 * 把期初 / 期末余额追加到 multipart 表单。
 * 规则（与后端一致）：传了（非空）就覆盖库中值；没传 / 空串 -> 不追加该字段，
 * 后端沿用库中已有余额（首次新建且未传记 0）。显式传 0 表示把余额改成 0，所以 0 必须传。
 */
function appendBalanceFields(formData: FormData, data: BillBalanceFields) {
  const append = (key: 'beginningBalance' | 'endingBalance', value?: number | string | null) => {
    if (value === undefined || value === null) return;
    const str = String(value).trim();
    if (str === '') return;
    if (typeof value === 'number' && Number.isNaN(value)) return;
    formData.append(key, str);
  };
  append('beginningBalance', data.beginningBalance);
  append('endingBalance', data.endingBalance);
}

/**
 * 报表 API（管报数据 + 各渠道月账单）
 */
export class ManagementReportApi {
  /* ---- 管报数据查询 ---- */
  static async query(
    params: ManagementReportQueryReq,
  ): Promise<ResponseData<ManagementReportQueryVo>> {
    return omsRequest.post('/management-report/query', params);
  }

  /* ---- U9 应收单（京东自营 / 天猫国际 / 亚马逊） ---- */
  /**
   * 上传 U9 应收单原始数据
   * POST /oms/finance/u9-receivable/upload（multipart/form-data）
   * type 支持：京东自营（默认）/ 天猫国际 / 亚马逊，中文按 UTF-8 传
   * 上传后服务端会重新富化该月份数据（同月份会覆盖旧数据）
   */
  static async uploadU9Receivable(
    data: U9ReceivableUploadReq,
  ): Promise<ResponseData<JdSalesCostVo[]>> {
    const formData = new FormData();
    if (data.type) {
      formData.append('type', data.type);
    }
    formData.append('file', data.file);
    return omsRequest.post('/finance/u9-receivable/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 解析 + 成本匹配可能较慢，单独放宽超时
      timeout: 1000 * 60 * 30,
      showLoading: false,
    });
  }

  /**
   * 已入库的数据类型列表
   * POST /oms/finance/u9-receivable/types
   */
  static async getU9ReceivableTypes(): Promise<ResponseData<string[]>> {
    return omsRequest.post('/finance/u9-receivable/types');
  }

  /**
   * 追加 / 更新一条费用（推荐）
   * POST /oms/finance/jd-fee/add
   * 按 type + dataDate + category + name upsert，不影响同 type+日期的其它费用
   */
  static async addJdFee(params: JdFeeAddReq): Promise<ResponseData<JdFeeVo>> {
    return omsRequest.post('/finance/jd-fee/add', params);
  }

  /**
   * 保存 / 更新京东自营费用
   * POST /oms/finance/jd-fee/save
   * 按 type + dataDate 整份覆盖（会先删除该日期全部费用）
   */
  static async saveJdFee(params: JdFeeSaveReq): Promise<ResponseData<JdFeeVo[]>> {
    return omsRequest.post('/finance/jd-fee/save', params);
  }

  /**
   * 精确查询京东自营 / 天猫超市费用
   * POST /oms/finance/jd-fee/query
   */
  static async queryJdFee(params: JdFeeQueryReq): Promise<ResponseData<JdFeeVo[]>> {
    return omsRequest.post('/finance/jd-fee/query', params);
  }

  /* ---- 天猫超市账单 ---- */
  /**
   * 上传天猫超市账单
   * POST /oms/finance/tmcs/upload（multipart/form-data）
   * 同 type + 月份重传会硬删覆盖；上传时自动写入平台费用
   */
  static async uploadTmcs(data: TmcsUploadReq): Promise<ResponseData<TmcsSalesCostVo[]>> {
    const formData = new FormData();
    formData.append('billFile', data.billFile);
    if (data.goodsFile) {
      formData.append('goodsFile', data.goodsFile);
    }
    formData.append('type', String(data.type ?? 5));
    formData.append('month', data.month);
    return omsRequest.post('/finance/tmcs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 账单约 10MB，解析 + 成本匹配较慢，单独放宽超时
      timeout: 1000 * 60 * 30,
      showLoading: false,
    });
  }

  /**
   * 查询天猫超市账单数据
   * POST /oms/finance/tmcs/query
   */
  static async queryTmcs(
    params: ManagementReportQueryReq,
  ): Promise<ResponseData<TmcsSalesCostVo[]>> {
    return omsRequest.post('/finance/tmcs/query', params);
  }

  /* ---- 沃尔玛山姆（type=11）：月度成本单价 / 物流费 ---- */
  /**
   * 上传某月成本单价 Excel
   * POST /oms/finance/walmart-cost/upload?month=yyyy-MM（multipart/form-data）
   * month 走 query，file 走 multipart body
   * Excel 需含「料号」+「2026」（成品单价）+「包材」+「渠道」列；同月覆盖
   */
  static async uploadWalmartCost(data: {
    month: string;
    file: File;
  }): Promise<ResponseData<number>> {
    const formData = new FormData();
    formData.append('file', data.file);
    return omsRequest.post('/finance/walmart-cost/upload', formData, {
      params: { month: data.month },
      headers: { 'Content-Type': 'multipart/form-data' },
      // Excel 解析可能较慢，单独放宽超时
      timeout: 1000 * 60 * 30,
      showLoading: false,
    });
  }

  /**
   * 查询某月成本单价 + 物流费行
   * POST /oms/finance/walmart-cost/list?month=yyyy-MM&keyword=xxx（参数走 query）
   */
  static async getWalmartCostList(
    params: WalmartCostListReq,
  ): Promise<ResponseData<WalmartCostVo[]>> {
    return omsRequest.post('/finance/walmart-cost/list', undefined, { params });
  }

  /**
   * 新增 / 更新单条成本单价（channel 同时维护渠道）
   * POST /oms/finance/walmart-cost/save?month=&materialNo=&costPrice=&goodsName=&channel=（参数走 query）
   */
  static async saveWalmartCost(params: WalmartCostSaveReq): Promise<ResponseData<WalmartCostVo>> {
    return omsRequest.post('/finance/walmart-cost/save', undefined, { params });
  }

  /**
   * 批量新增到新月份：只复制 kind=成本单价 行，targetMonth 已存在的料号跳过
   * POST /oms/finance/walmart-cost/copy?sourceMonth=&targetMonth=（参数走 query）
   * 返回本次新增条数
   */
  static async copyWalmartCost(params: WalmartCostCopyReq): Promise<ResponseData<number>> {
    return omsRequest.post('/finance/walmart-cost/copy', undefined, { params });
  }

  /**
   * 删除成本单价 / 物流费（id 或 month + materialNo）
   * POST /oms/finance/walmart-cost/delete?id=&month=&materialNo=（参数走 query）
   */
  static async deleteWalmartCost(params: WalmartCostDeleteReq): Promise<ResponseData<boolean>> {
    return omsRequest.post('/finance/walmart-cost/delete', undefined, { params });
  }

  /**
   * 录入 / 更新某月某渠道物流费（含税）
   * POST /oms/finance/walmart-cost/logistics-save?month=&channel=&amount=（参数走 query）
   */
  static async saveWalmartLogistics(
    params: WalmartLogisticsSaveReq,
  ): Promise<ResponseData<WalmartCostVo>> {
    return omsRequest.post('/finance/walmart-cost/logistics-save', undefined, { params });
  }

  /* ---- 沃尔玛山姆（type=11）：三份原始单上传 ---- */
  /**
   * 上传出货 / 退回 / 销售订单三份原始单
   * POST /oms/finance/walmart-sam/upload（multipart/form-data）
   * 三个文件均可选，同类型同月覆盖重传；返回入库行数
   */
  static async uploadWalmartSamFiles(data: WalmartSamUploadReq): Promise<ResponseData<number>> {
    const formData = new FormData();
    formData.append('month', data.month);
    if (data.chuhuoFile) {
      formData.append('chuhuoFile', data.chuhuoFile);
    }
    if (data.tuihuiFile) {
      formData.append('tuihuiFile', data.tuihuiFile);
    }
    if (data.orderFile) {
      formData.append('orderFile', data.orderFile);
    }
    return omsRequest.post('/finance/walmart-sam/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 三份 Excel 解析 + 成本匹配较慢，单独放宽超时
      timeout: 1000 * 60 * 30,
      showLoading: false,
    });
  }

  /* ---- 各渠道月账单 ---- */
  /**
   * 各渠道月账单 - 分页查询
   * 统一调用 /zfb-bill/page 接口，通过 platform 参数区分渠道（拼多多/抖音/天猫/小红书/支付宝）
   */
  static async getZfbBillPage(
    params: FinanceZfbBillInfoPageReq,
  ): Promise<ResponseData<IPageFinanceZfbBillInfoVo>> {
    // 本地测试
    return billRequest.post('/finance/zfb-bill/page', {
      ...params,
      // channel 必传：优先取调用方显式传入的 channel；否则按映射（微信=wx、微盟=wm），其余渠道与 platform 一致
      channel: params.channel || (ZFB_BILL_CHANNEL_MAP[params.platform || ''] ?? params.platform),
    });
  }
  /**
   * 各渠道月账单 - 生成
   * 统一调用 /zfb-bill/generate 接口，通过 platform 参数区分渠道
   */
  static async generateZfbBill(params: FinanceZfbBillGenerateReq): Promise<ResponseData<any>> {
    // 本地测试
    return billRequest.post('/finance/zfb-bill/generate', params);
  }
  /**
   * 各渠道月账单 - 批量下载（后端代理打包为 ZIP 返回，避免 OSS CORS 限制）
   * 后端实现思路：接收 ids 列表，服务端到 OSS 拉取文件，打包成 zip 流式返回（Content-Type: application/zip）
   * channel 可选：微信/微盟 platform 同为「微信」，需要显式传 channel 区分（微盟传「微盟」）
   */
  static async batchDownloadZfbBill(params: {
    ids: number[];
    platform?: string;
    channel?: string;
  }): Promise<Blob> {
    const resp = await billRequest.post('/finance/zfb-bill/batch-download', params, {
      responseType: 'blob',
    });
    return resp as unknown as Blob;
  }
  /**
   * 各渠道月账单 - 导出所有账单文件（后端代理打包 ZIP 返回，避免 OSS CORS 限制）
   * GET /oms/finance/bill/download?billDate=yyyy-MM&platform=...
   * 入参：{ billDate: yyyy-MM, platform? }（platform 为空则下载所有平台）
   * 返回：zip Blob（服务端按账单日期/平台到 OSS 拉取全部账单文件打包）
   */
  static async downloadBills(params: {
    /** 账单日期，格式 yyyy-MM */
    billDate: string;
    /** 平台（可选，为空则下载所有平台） */
    platform?: string;
    /** 渠道（可选，微信/微盟 platform 同为「微信」时用于区分） */
    channel?: string;
  }): Promise<Blob> {
    const resp = await billRequest.get('/finance/bill/download', {
      params,
      responseType: 'blob',
      showLoading: false,
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
    channel?: string;
  }): Promise<ResponseData<FinanceZfbBillConfig[]>> {
    // 本地测试
    return billRequest.get('/finance/bill-config/list', {
      params: {
        ...params,
        // channel 必传：优先取调用方显式传入的 channel；否则按映射（微信=wx、微盟=wm），其余与 platform 一致
        channel:
          params?.channel || (ZFB_BILL_CHANNEL_MAP[params?.platform || ''] ?? params?.platform),
      },
    });
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
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/tm-bill/upload', formData, {
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
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/dy-bill/upload', formData, {
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
   * 京东一次需要上传 2 个文件：财务汇总表 file1 + 月账单 file2
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
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/jd-bill/upload', formData, {
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
    return billRequest.post('/finance/tm-stockout-bill/upload', formData, {
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
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/xhs-bill/upload', formData, {
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
   * 上传拼多多账单
   * POST /oms/finance/pdd-bill/upload（multipart/form-data）
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadPddBill(
    data: FinancePddBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('channel', data.channel);
    formData.append('date', data.date);
    formData.append('financeBillConfigId', String(data.financeBillConfigId));
    formData.append('file', data.file);
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/pdd-bill/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 1000 * 60 * 60,
      showLoading: false,
    });
  }
  /**
   * 上传快手账单
   * POST /oms/finance/ks-bill/upload（multipart/form-data）
   * billDate / financeBillConfigId 走 query string，file / walletFile / storeZipFile 走 multipart body
   * file = 订单流水导出（或含它的 zip）；walletFile = 安心钱包账单（可选，用于运费险解析）；
   * storeZipFile = 归档原始压缩包（可选）
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadKsBill(
    data: FinanceKsBillUploadReq,
  ): Promise<ResponseData<FinanceChannelExtendCostImportVo>> {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.walletFile) {
      formData.append('walletFile', data.walletFile);
    }
    if (data.storeZipFile) {
      formData.append('storeZipFile', data.storeZipFile);
    }
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/ks-bill/upload', formData, {
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
   * 上传微信账单
   * POST /oms/finance/wx-bill/upload（multipart/form-data）
   * billDate / financeBillConfigId 走 query string，file 走 multipart body
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadWxBill(
    data: FinanceWxWmBillUploadReq,
  ): Promise<ResponseData<FinanceLedgerBillUploadVo>> {
    const formData = new FormData();
    formData.append('file', data.file);
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/wx-bill/upload', formData, {
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
   * 上传微盟账单
   * POST /oms/finance/wm-bill/upload（multipart/form-data）
   * billDate / financeBillConfigId 走 query string，file 走 multipart body
   * 后端解析账单比较耗时，单独把超时拉到 1 小时
   */
  static async uploadWmBill(
    data: FinanceWxWmBillUploadReq,
  ): Promise<ResponseData<FinanceLedgerBillUploadVo>> {
    const formData = new FormData();
    formData.append('file', data.file);
    appendBalanceFields(formData, data);
    return billRequest.post('/finance/wm-bill/upload', formData, {
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
   * 新增拼多多推广费
   * POST /oms/finance/channel-extend-cost/pdd-promotion
   */
  static async addPddPromotion(data: FinancePddPromotionAddReq): Promise<ResponseData<boolean>> {
    // 本地测试
    return billRequest.post('/finance/channel-extend-cost/pdd-promotion', data);
  }
}

export default ManagementReportApi;
