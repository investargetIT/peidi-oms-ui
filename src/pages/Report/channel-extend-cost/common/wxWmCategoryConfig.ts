/**
 * 微信/微盟 费用统计 - 「业务类型 -> 分类 / 费用分类」自定义映射
 *
 * 后端 /wx-cost-summary、/wm-cost-summary 自带的 category / expenseCategory 默认直接使用；
 * 如需覆盖某个业务类型的归属，在这里按 业务类型（动账类型）加一条即可。
 *
 * 参考：微信爵宴官方旗舰店账单 Sheet1 的 动账类型 -> 分类/费用分类 关系。
 */
export interface WxWmCategoryRule {
  /** 分类（省略则用后端返回的 category） */
  category?: string;
  /** 费用分类（省略则用后端返回的 expenseCategory） */
  expenseCategory?: string;
}

export const WX_WM_DEFAULT_MAPPING: Record<string, WxWmCategoryRule> = {
  // 账单 Sheet1：动账类型即业务类型
  达人佣金: { category: '达人佣金', expenseCategory: '推广费用' },
  '订单交易｜先用后付': { category: '收款', expenseCategory: '其他' },
  订单支付: { category: '收款', expenseCategory: '其他' },
  技术服务费: { category: '技术服务费', expenseCategory: '平台费用' },
  运费险: { category: '运费险', expenseCategory: '平台费用' },
  // 收入/支出 均归收款
  订单退款: { category: '收款', expenseCategory: '其他' },
  平台优惠补贴: { category: '收款', expenseCategory: '其他' },
};

/** 映射扁平行（计算逻辑说明中的映射表格数据源，与 WX_WM_DEFAULT_MAPPING 同源派生，保证一致） */
export interface WxWmMappingRow {
  /** 业务类型（动账类型） */
  businessType: string;
  /** 分类 */
  category: string;
  /** 费用分类 */
  expenseCategory: string;
}

export const WX_WM_MAPPING_ROWS: WxWmMappingRow[] = Object.entries(WX_WM_DEFAULT_MAPPING).map(
  ([businessType, rule]) => ({
    businessType,
    category: rule.category || '',
    expenseCategory: rule.expenseCategory || '',
  }),
);
