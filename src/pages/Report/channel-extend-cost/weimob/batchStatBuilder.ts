import type { FinanceLedgerSummaryRowVo } from '@/services/channelExtendCostApi';
import { WX_WM_DEFAULT_MAPPING } from '../common/wxWmCategoryConfig';

/**
 * 微盟 - 批量导出统计计算
 *
 * 从 WxExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 *
 * 展示形式：直接消费新接口 /wx-cost-summary 返回的流水汇总行
 * （LedgerSummaryRowVo，按业务类型/收支类型聚合，含分类/费用分类/总计）。
 *   列：费用分类（合并，其他/平台费用）/ 分类 / 业务类型 / 收支类型 / 金额
 *   行：平铺展示，按 费用分类 排序（稳定，同费用分类内保持接口返回顺序），相同费用分类合并成一个大单元格
 *   总计行：直接使用后端返回的「总计」行
 */

export interface WmDetailRow {
  /** 费用分类（其他 / 平台费用，合并单元格用） */
  expenseCategory: string;
  /** 分类（收款 / 交易手续费 / 提现 / 其他） */
  category: string;
  /** 业务类型（交易 / 扣除交易手续费 / 退款 / 提现） */
  businessType: string;
  /** 收支类型（收入 / 支出；总计行为空） */
  accountType: string;
  /** 金额（元，保留正负号；收入为正、支出为负） */
  amount: number;
}

export interface WmBalanceSummary {
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

export interface WmBatchStatResult {
  /** 微信余额对账（顶部汇总表），income/expense/total 供合计行使用 */
  summary: WmBalanceSummary & { income: number; expense: number; total: number };
  /** 明细表行（按接口返回顺序平铺展示，不含总计行；分级字段由后端自带） */
  rows: WmDetailRow[];
  /** 总计行（businessType=总计） */
  totalRow: WmDetailRow | null;
  /** 费用分类列合并：行下标 -> rowSpan（连续相等合并；非首行=0；单值行=1） */
  expCatSpan: Record<number, number>;
  /** 分类列合并：行下标 -> rowSpan（仅在同一 费用分类 分组内连续相等合并；非首行=0；单值行=1） */
  catSpan: Record<number, number>;
}

/**
 * 组装微信批量导出所需的全部统计结果。
 *
 * 口径：
 *   本期收款 = 汇总行中 分类=收款 的收入与支出之和（收入为正、支出为负）
 *   本期费用 = 汇总行中 分类≠收款 且 分类≠提现 的收入与支出之和（收入为正、支出为负）
 *   提现     = 汇总行中 分类=提现 的收入与支出之和（收入为正、支出为负）
 *   合计行   = 明细收入 + 明细支出（净额，不依赖后端「总计」行，但展示其总金额用于交叉核对）
 *   结息     = 默认 0
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息（本期收款/本期费用/提现均已含收入与支出正负号）
 *   校验     = 计算余额 - 期末余额
 */
export function buildWmStat(args: {
  wmStatData: FinanceLedgerSummaryRowVo[];
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): WmBatchStatResult {
  const { wmStatData, beginningBalance, endingBalance, yearMonth, shopName } = args;

  // —— 平铺流水行（总计行单独抽出），按接口返回顺序展示，不做额外排序/合并映射 ——
  let totalRow: WmDetailRow | null = null;
  const flat: WmDetailRow[] = [];
  let income = 0; // 收入合计（正数，仅用于明细表合计行净额）
  let expense = 0; // 支出合计（保留负号，仅用于明细表合计行净额）
  let collectionSum = 0; // 本期收款：分类=收款 的收入(+)/支出(-)之和
  let feeExpenseSum = 0; // 本期费用：分类≠收款 且 分类≠提现 的收入(+)/支出(-)之和
  let withdrawSum = 0; // 提现：分类=提现 的收入(+)/支出(-)之和
  let totalAmount = 0; // 总计兜底 = Σ|amount|

  (wmStatData || []).forEach((it) => {
    const rawAmount = typeof it.amount === 'number' ? it.amount : 0;
    // 收支类型=支出：金额统一转成负数（展示为支出）
    const amount = it.accountType === '支出' ? -Math.abs(rawAmount) : rawAmount;
    // 业务类型 -> 分类/费用分类 自定义映射（命中则覆盖后端返回，否则用后端自带值）
    const rule = WX_WM_DEFAULT_MAPPING[it.businessType || ''];
    const category = rule?.category ?? (it.category || '');
    const row: WmDetailRow = {
      expenseCategory: rule?.expenseCategory ?? (it.expenseCategory || ''),
      // 分类：优先使用自定义映射（业务类型 -> 分类），否则用后端返回的 category
      category,
      businessType: it.businessType || '',
      accountType: it.accountType || '',
      amount,
    };
    if (it.businessType === '总计') {
      totalRow = row;
      return;
    }
    flat.push(row);
    totalAmount += Math.abs(amount);
    // 本期收款 = 分类=收款 的收入+支出；提现 = 分类=提现 的收入+支出；本期费用 = 分类≠收款且≠提现 的收入+支出（金额均已带符号）
    if (category === '收款') collectionSum += amount;
    else if (category === '提现') withdrawSum += amount;
    else feeExpenseSum += amount;
    if (it.accountType === '收入') income += rawAmount;
    else if (it.accountType === '支出') expense += amount; // amount 已为负
  });

  const rows = flat;
  // 总计行缺省时兜底
  if (!totalRow) {
    totalRow = { expenseCategory: '', category: '', businessType: '总计', accountType: '', amount: totalAmount };
  }

  // 按 费用分类 排序（稳定排序，同费用分类内保持接口返回顺序），使相同费用分类相邻后合并成一个大单元格
  rows.sort((a, b) => a.expenseCategory.localeCompare(b.expenseCategory));

  // 费用分类列合并：连续（已相邻）相等合并
  const expCatSpan: Record<number, number> = {};
  for (let i = 0; i < rows.length; ) {
    const value = rows[i].expenseCategory;
    let j = i;
    while (j < rows.length && rows[j].expenseCategory === value) j++;
    const count = j - i;
    expCatSpan[i] = count > 1 ? count : 1;
    for (let k = i + 1; k < j; k++) expCatSpan[k] = 0;
    i = j;
  }

  // 分类列合并：仅在同一 费用分类 分组内合并（跨组不跨，避免误并）
  const catSpan: Record<number, number> = {};
  for (let start = 0; start < rows.length; ) {
    const exp = rows[start].expenseCategory;
    let end = start;
    while (end < rows.length && rows[end].expenseCategory === exp) end++;
    for (let i = start; i < end; ) {
      const cat = rows[i].category;
      let j = i;
      while (j < end && rows[j].category === cat) j++;
      const count = j - i;
      catSpan[i] = count > 1 ? count : 1;
      for (let k = i + 1; k < j; k++) catSpan[k] = 0;
      i = j;
    }
    start = end;
  }

  const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
  const lastMonthBalance = safeNum(beginningBalance);
  const endBalance = safeNum(endingBalance);
  const withdraw = withdrawSum; // 提现：分类=提现 的收入+支出
  const interest = 0; // 结息固定 0
  // 计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息（本期收款/本期费用/提现均已含收入与支出正负号）
  const calculatedBalance = lastMonthBalance + collectionSum + feeExpenseSum + withdraw + interest;
  const checkDiff = calculatedBalance - endBalance;

  const summary = {
    billMonth: yearMonth,
    accountName: shopName,
    platform: '微盟',
    endBalance,
    lastMonthBalance,
    // 本期收款 = 分类=收款 的收入+支出；本期费用 = 分类≠收款 的收入+支出
    currentCollection: collectionSum,
    currentExpense: feeExpenseSum,
    withdraw,
    interest,
    calculatedBalance,
    checkDiff,
    // 明细表合计行使用的收入 / 支出 / 总金额
    income,
    expense,
    total: income + expense,
  };

  return { summary, rows, totalRow, expCatSpan, catSpan };
}
