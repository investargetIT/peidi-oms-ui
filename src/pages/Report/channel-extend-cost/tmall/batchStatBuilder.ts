import type {
  FinanceZfbCostStatVo,
  FinanceZfbCostStatDetailItemVo,
} from '@/services/channelExtendCostApi';

/**
 * 天猫 - 批量导出统计计算
 *
 * 从 TmallExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 */

// 备注 → 分类 映射（与《8月聚合账户处理后文件》Sheet3 一致）：
// 天猫明细接口的 category 实际返回「备注」原样，多数备注与分类同名；
// 仅「收款」分类下的各明细以备注细分，这里把备注归一为「收款」。
export const TMALL_REMARK_CATEGORY_MAP: Record<string, string> = {
  订单打款: '收款',
  订单退款: '收款',
  百亿补贴定向营销费用: '收款',
  消费券代付资金扣回: '收款',
  限时红包代商家垫付扣回: '收款',
  猫猫币抵扣项目平台垫付资金: '收款',
};
// 备注 → 分类：映射不到时回退为备注本身（兼容接口直接返回「收款 / 提现 / BP」等真分类）
export const remarkToCategory = (remark: string | undefined) =>
  TMALL_REMARK_CATEGORY_MAP[remark || ''] ?? remark;

// 账单明细汇总「费用分类」映射：分类（document_type）→ 费用分类（推广费用 / 平台费用 / 其他）。
// 对应关系来自业务提供的《8月聚合账户处理后文件》Sheet3 备注/费用分类 两列（唯一口径，已去重）；
// 未在映射内的分类兜底展示为「空」并追加到末尾。
// 此常量原定义在 TmallExtendCostBase.tsx，现抽到 builder 供弹窗与「批量导出」共用，避免两处漂移。
export const TMALL_FEE_TYPE_GROUPS: { feeType: string; categories: string[] }[] = [
  {
    feeType: '推广费用',
    categories: [
      '百亿补贴软件服务费渠道KY_ITEM',
      '百亿补贴软件服务费T全渠道KY_ITEM',
      '品牌新享-首单拉新计划KY_ITEM',
      '品牌新享-天猫营销托管软件服务费',
      '品牌新享天猫超级老客加速软件服务费',
      '品牌新享天猫超级新客加速固定软件服务费',
      '品牌新享新品孵化软件服务费KY_ITEM',
      '品牌新享-超级流量加速软件服务费',
      '品牌直播大场营销软件服务费',
      '光合平台软件服务费',
      '淘宝内容推广服务费',
      '淘宝天猫跨境服务增值费端内',
    ],
  },
  {
    feeType: '平台费用',
    categories: [
      '基础软件服务费',
      '淘金币软件服务费',
      '天猫U先入仓物流抽佣',
      '天猫U先试用超市物流服务费KY_ITEM',
      '先用后付技术服务费',
      '公益宝贝',
    ],
  },
  {
    feeType: '其他',
    // 天猫「其他」与配置表单一致：分类为「收款」的各类明细（订单打款/订单退款/消费券代付资金扣回/限时红包代商家垫付扣回/百亿补贴定向营销费用/猫猫币抵扣项目平台垫付资金）均归为「其他」；
    // 同时兼容 document_type 直接返回「收款 / 提现 / BP」的情况。
    categories: [
      '收款',
      '提现',
      'BP',
      '订单打款',
      '订单退款',
      '消费券代付资金扣回',
      '限时红包代商家垫付扣回',
      '百亿补贴定向营销费用',
      '猫猫币抵扣项目平台垫付资金',
    ],
  },
];

// 扁平化映射表：分类 → 费用分类（由 TMALL_FEE_TYPE_GROUPS 派生，保证两处一致）
export const TMALL_FEE_TYPE_MAP: Record<string, string> = TMALL_FEE_TYPE_GROUPS.reduce(
  (map, group) => {
    group.categories.forEach((cat) => {
      map[cat] = group.feeType;
    });
    return map;
  },
  {} as Record<string, string>,
);

/** 费用分类分组的展示顺序 */
const TMALL_FEE_TYPE_ORDER: Record<string, number> = { 推广费用: 0, 平台费用: 1, 其他: 2, 空: 3 };

export interface TmallBalanceSummary {
  billMonth: string;
  accountName: string;
  platform: string;
  endBalance: number;
  lastMonthBalance: number;
  currentCollection: number;
  currentExpense: number;
  withdraw: number;
  interest: number;
  calculatedBalance: number;
  checkDiff: number;
}

/** 天猫账单明细汇总视图行（与弹窗明细表完全对齐后，供导出渲染） */
export interface TmallDetailRow {
  /** 费用分类（推广费用 / 平台费用 / 其他 / 空，合并单元格用） */
  feeType: string;
  /** 分类（由备注归一，合并单元格用，与弹窗「分类」列一致） */
  category: string;
  /** 备注（接口 category 原样） */
  remark: string;
  /** 对方账号 */
  accountCode: string;
  /** 收入金额 */
  totalIncome: number;
  /** 支出金额 */
  totalExpense: number;
  /** 费用分类 rowSpan（>1 表示该行起始并向下合并 n 格；0 = 已被合并） */
  feeTypeSpan: number;
  /** 分类 rowSpan（>1 表示该行起始并向下合并 n 格；0 = 已被合并） */
  categorySpan: number;
}

/** 天猫账单明细汇总「总计行」（分类已归一，与弹窗汇总行一致） */
export interface TmallTotalRow {
  category: string;
  accountCode: string;
  incomeTotal: number;
  expenseTotal: number;
}

export interface TmallBatchStatResult {
  /** 账单明细汇总行（分类 + 对方账号 + 收入/支出） */
  rows: FinanceZfbCostStatDetailItemVo[];
  /** 总计行（收入/支出全量合计） */
  total?: FinanceZfbCostStatDetailItemVo;
  /** 收入全量合计 */
  incomeTotal: number;
  /** 支出全量合计 */
  expenseTotal: number;
  /** 天猫余额对账（顶部汇总表） */
  summary: TmallBalanceSummary;
  /** 账单明细汇总视图行（与弹窗明细表一致：费用分类/分类归一 + 分组排序 + rowSpan 合并） */
  detailRows: TmallDetailRow[];
  /** 账单明细汇总「总计行」（分类已归一） */
  totalRow: TmallTotalRow;
}

/**
 * 把账单明细原始 rows 组装成与弹窗明细表一致的视图：
 *  1. 按 费用分类（推广费用→平台费用→其他→空）稳定分组排序，组内保持接口原相对顺序；
 *  2. 费用分类 = TMALL_FEE_TYPE_MAP 归一（映射外兜底「空」）；
 *  3. 分类      = remarkToCategory 归一；
 *  4. 备注/对方账号/收入/支出 = 接口原样；
 *  5. rowSpan：费用分类整组合并；分类仅在同一费用分类分组内连续相等才合并。
 * 与 TmallExtendCostBase.tsx 的 statDetailRows / statFeeTypeSpan / statCategoryRowSpan 完全同口径。
 */
export function buildTmallDetailRows(
  rows: FinanceZfbCostStatDetailItemVo[],
): TmallDetailRow[] {
  const feeTypeOf = (row: FinanceZfbCostStatDetailItemVo) =>
    TMALL_FEE_TYPE_MAP[row.category || ''] ?? '空';

  // 1. 按费用分类分组稳定排序（同费用分类内保持接口原相对顺序）
  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (TMALL_FEE_TYPE_ORDER[feeTypeOf(a.row)] ?? 3) -
          (TMALL_FEE_TYPE_ORDER[feeTypeOf(b.row)] ?? 3) || a.index - b.index,
    )
    .map((it) => it.row);

  // 2. 费用分类 rowSpan：整组合并（同组已相邻，span = 组行数；组内非首行 = 0）
  const feeTypeSpan: number[] = new Array(sorted.length).fill(0);
  {
    let i = 0;
    while (i < sorted.length) {
      const ft = feeTypeOf(sorted[i]);
      let j = i;
      while (j < sorted.length && feeTypeOf(sorted[j]) === ft) j++;
      feeTypeSpan[i] = j - i > 1 ? j - i : 1;
      i = j;
    }
  }

  // 3. 分类 rowSpan：仅在同一费用分类分组内连续相等才合并（与弹窗 statCategoryRowSpan 同算法）
  const categorySpan: number[] = new Array(sorted.length).fill(0);
  {
    for (let start = 0; start < sorted.length; ) {
      const ft = feeTypeOf(sorted[start]);
      let end = start;
      while (end < sorted.length && feeTypeOf(sorted[end]) === ft) end++;
      for (let i = start; i < end; ) {
        const cat = remarkToCategory(sorted[i].category || '');
        let j = i;
        while (j < end && remarkToCategory(sorted[j].category || '') === cat) j++;
        categorySpan[i] = j - i > 1 ? j - i : 1;
        i = j;
      }
      start = end;
    }
  }

  return sorted.map((row, index) => ({
    feeType: feeTypeOf(row),
    category: remarkToCategory(row.category || '') || '-',
    remark: row.category || '',
    accountCode: row.accountCode || '',
    totalIncome: row.totalIncome || 0,
    totalExpense: row.totalExpense || 0,
    feeTypeSpan: feeTypeSpan[index],
    categorySpan: categorySpan[index],
  }));
}

/**
 * 组装天猫批量导出所需的全部统计结果。
 *
 * 余额对账口径（按「账单明细汇总 rows 的分类」归类）：
 *   本期收款 = "收款" 分类的收入金额 + 支出金额
 *   提现     = "提现" 分类的收入金额 + 支出金额
 *   结息     = "结息" 分类的收入金额 + 支出金额
 *   本期费用 = 移除 收款 / 提现 / 结息 后，其余分类的收入金额 + 支出金额 之和
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
 *   校验     = 计算余额 - 期末余额
 */
export function buildTmallStat(args: {
  statData: FinanceZfbCostStatVo | null;
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): TmallBatchStatResult {
  const { statData, beginningBalance, endingBalance, yearMonth, shopName } = args;
  const rows = statData?.rows || [];
  const total = statData?.total;
  const incomeTotal = total?.totalIncome ?? rows.reduce((sum, r) => sum + (r.totalIncome || 0), 0);
  const expenseTotal =
    total?.totalExpense ?? rows.reduce((sum, r) => sum + (r.totalExpense || 0), 0);

  const sumOf = (r: FinanceZfbCostStatDetailItemVo) => (r.totalIncome || 0) + (r.totalExpense || 0);
  let collection = 0; // 本期收款
  let withdraw = 0; // 提现
  let interest = 0; // 结息
  let expense = 0; // 本期费用（其余分类收入+支出之和）
  rows.forEach((r) => {
    const val = sumOf(r);
    // 按「备注→分类」归一后归类（明细接口返回的是备注原样），与明细「分类」列同口径
    const cat = remarkToCategory(r.category);
    if (cat === '收款') collection += val;
    else if (cat === '提现') withdraw += val;
    else if (cat === '结息') interest += val;
    else expense += val;
  });

  const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
  const lastMonthBalance = safeNum(beginningBalance);
  const endBalance = safeNum(endingBalance);
  const calculatedBalance = lastMonthBalance + collection + expense + withdraw + interest;
  const checkDiff = calculatedBalance - endBalance;

  return {
    rows,
    total,
    incomeTotal,
    expenseTotal,
    // 明细视图（费用分类/分类归一 + 分组排序 + rowSpan），供导出密布与弹窗一致渲染
    detailRows: buildTmallDetailRows(rows),
    // 总计行（分类归一），与弹窗汇总行一致
    totalRow: {
      category: remarkToCategory(total?.category) || '总计',
      accountCode: total?.accountCode || '',
      incomeTotal,
      expenseTotal,
    },
    summary: {
      billMonth: yearMonth,
      accountName: shopName,
      platform: '天猫',
      endBalance,
      lastMonthBalance,
      currentCollection: collection,
      currentExpense: expense,
      withdraw,
      interest,
      calculatedBalance,
      checkDiff,
    },
  };
}
