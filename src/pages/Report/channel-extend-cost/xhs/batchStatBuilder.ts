import type { FinanceXhsCostStatItemVo } from '@/services/channelExtendCostApi';

/**
 * 小红书 - 批量导出统计计算
 *
 * 从 XhsExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 */

/** 小红书费用统计项的分类归属：固定两种——「平台费用」「其他」
 *  规则：计佣基数 → 其他；其余（赔付薯券 / 买手佣金 / 运费宝 / 平台佣金等）→ 平台费用 */
export const XHS_CATEGORY_ORDER = ['平台费用', '其他'];
export const getXhsCategory = (name: string | undefined) =>
  name === '计佣基数' ? '其他' : '平台费用';

export interface XhsBalanceSummary {
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

export interface XhsDetailRow {
  /** 分类（平台费用 / 其他，合并单元格用） */
  category: string;
  /** 管报名称（计佣基数 → 其他（净收入）） */
  name: string;
  income: number;
  expense: number;
}

export interface XhsBatchStatResult {
  /** 小红书余额对账（顶部汇总表），income/expense/total 供合计行使用 */
  summary: XhsBalanceSummary & { income: number; expense: number; total: number };
  /** 明细表行（按分类排序：平台费用 / 其他） */
  rows: XhsDetailRow[];
  /** 分类合并单元格用：分类 -> 行数 / 首行下标 */
  catCount: Record<string, number>;
  catFirstIndex: Record<string, number>;
}

/**
 * 组装小红书批量导出所需的全部统计结果。
 *
 * 余额对账口径：
 *   本期收款 = 收入列之和（type 为「收入」的各项之和，value 为正）
 *   本期费用 = 支出列之和（type 为「支出」的各项之和，保留负号）
 *   提现 / 结息 = 默认 0
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
 *   校验     = 计算余额 - 期末余额
 */
export function buildXhsStat(args: {
  xhsStatData: FinanceXhsCostStatItemVo[];
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): XhsBatchStatResult {
  const { xhsStatData, beginningBalance, endingBalance, yearMonth, shopName } = args;

  // —— 汇总 ——
  let income = 0; // 本期收款 / 收入列之和
  let expense = 0; // 本期费用 / 支出列之和（保留负号）
  xhsStatData.forEach((it) => {
    const v = typeof it.value === 'number' ? it.value : 0;
    if (it.type === '收入') {
      income += v;
    } else {
      expense += v;
    }
  });
  const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
  const lastMonthBalance = safeNum(beginningBalance);
  const endBalance = safeNum(endingBalance);
  const withdraw = 0; // 提现默认 0
  const interest = 0; // 结息固定 0
  const calculatedBalance = lastMonthBalance + income + expense + withdraw + interest;
  const checkDiff = calculatedBalance - endBalance;

  const summary = {
    billMonth: yearMonth,
    accountName: shopName,
    platform: '小红书',
    endBalance,
    lastMonthBalance,
    currentCollection: income,
    currentExpense: expense,
    withdraw,
    interest,
    calculatedBalance,
    checkDiff,
    // 明细表合计行使用的收入 / 支出 / 总金额
    income,
    expense,
    total: income + expense,
  };

  // —— 明细行：把接口返回项映射为「分类 / 管报名称 / 收入 / 支出」 ——
  const byCat: Record<string, XhsDetailRow[]> = {};
  xhsStatData.forEach((it) => {
    const cat = getXhsCategory(it.name);
    const v = typeof it.value === 'number' ? it.value : 0;
    // 展示名：计佣基数 →「其他（净收入）」，其余沿用接口返回 name
    const displayName = it.name === '计佣基数' ? '其他（净收入）' : it.name || '-';
    const row: XhsDetailRow = {
      category: cat,
      name: displayName,
      income: it.type === '收入' ? v : 0,
      expense: it.type === '支出' ? v : 0,
    };
    (byCat[cat] = byCat[cat] || []).push(row);
  });
  const rows: XhsDetailRow[] = [];
  XHS_CATEGORY_ORDER.forEach((cat) => {
    (byCat[cat] || []).forEach((r) => rows.push(r));
  });
  // 分类列合并计数 / 首行下标
  const catCount: Record<string, number> = {};
  const catFirstIndex: Record<string, number> = {};
  rows.forEach((r, i) => {
    if (catCount[r.category] === undefined) {
      catCount[r.category] = 1;
      catFirstIndex[r.category] = i;
    } else {
      catCount[r.category] += 1;
    }
  });

  return { summary, rows, catCount, catFirstIndex };
}
