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
    if (r.category === '收款') collection += val;
    else if (r.category === '提现') withdraw += val;
    else if (r.category === '结息') interest += val;
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
