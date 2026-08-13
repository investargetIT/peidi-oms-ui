import type { FinanceCostCategoryStatVo } from '@/services/channelExtendCostApi';
import {
  summaryGroups,
  getFeeCategory,
  feeCategoryOrder,
  getFeeMajorCategory,
  feeMajorCategoryOrder,
} from './businessCodes';

/**
 * 渠道推广费用 - 站内外推广费统计 通用计算工具
 *
 * 原逻辑内联在 ChannelExtendCostBase.tsx 的「费用统计」弹窗里，
 * 这里抽成纯函数后，弹窗渲染和「批量导出 Excel」共用同一份计算结果，
 * 保证两边展示完全一致。
 */

export interface SummaryRow {
  /** 账单月份，格式 yyyy-MM */
  billMonth: string;
  /** 渠道（拼多多/天猫/抖音/京东） */
  platform: string;
  /** 店铺名称（已走 displayShopName） */
  accountName: string;
  /** 本月期末余额（来自 queryEndingBalance） */
  endBalance: number;
  /** 上月期末余额 = 本月期初余额 */
  lastMonthBalance: number;
  /** 本期收款：业务编码 ∈ summaryGroups[0] 的 calculate 之和 */
  currentCollection: number;
  /** 本期费用：业务编码 ∈ summaryGroups[1] 的 calculate 之和 */
  currentExpense: number;
  /** 提现：业务编码 ∈ summaryGroups[2] 的 calculate 之和 */
  withdraw: number;
  /** 结息：当前固定为 0 */
  interest: number;
  /** 计算余额 = lastMonthBalance + currentCollection + currentExpense + withdraw + interest */
  calculatedBalance: number;
  /** 校验 = calculatedBalance - endBalance，绝对值 < 0.001 视为平衡 */
  checkDiff: number;
}

export interface DetailRow {
  /** 一级分类（合并单元格用） */
  feeMajorCategory: string;
  /** 二级分类（合并单元格用） */
  feeCategory: string;
  /** 按二级分类聚合的 收入金额合计 */
  incomeSum: number;
  /** 按二级分类聚合的 支出金额合计 */
  expenseSum: number;
  /** 业务编码 */
  businessCode: string;
  /** 业务描述 */
  businessDesc: string;
  /** 收入金额 */
  totalIncome: number;
  /** 支出金额 */
  totalExpense: number;
  /** 计算结果（后端给的值，不在前端算） */
  calculate: number;
  /** 行底色类型（Excel / 弹窗行底色用） */
  rowColor: 'collection' | 'deduction' | 'withdraw' | null;
}

export interface DetailGroupMeta {
  /** 一级分类 -> 行数 */
  majorCount: Record<string, number>;
  /** 一级分类 -> 首次出现的行索引（用于 rowSpan） */
  majorFirstIndex: Record<string, number>;
  /** 二级分类 -> 行数 */
  categoryCount: Record<string, number>;
  /** 二级分类 -> 首次出现的行索引 */
  categoryFirstIndex: Record<string, number>;
}

export interface StatResult {
  summary: SummaryRow;
  detail: DetailRow[];
  detailGroupMeta: DetailGroupMeta;
}

export interface BuildStatResultArgs {
  /** getCostCategoryStat 原始返回 */
  statData: FinanceCostCategoryStatVo[];
  /** 上月期末余额（= 本月期初）。null 表示后端没拿到 */
  beginningBalance: number | null;
  /** 本月期末余额。null 表示后端没拿到 */
  endingBalance: number | null;
  yearMonth: string;
  channel: string;
  shopName: string;
}

/**
 * 根据业务编码判断行底色
 */
function getRowColor(businessCode: string): DetailRow['rowColor'] {
  if (summaryGroups[0].codes.includes(businessCode)) return 'collection';
  if (summaryGroups[1].codes.includes(businessCode)) return 'deduction';
  if (summaryGroups[2].codes.includes(businessCode)) return 'withdraw';
  return null;
}

/**
 * 把后端 3 个接口的原始数据组装成「汇总 + 排序后明细」
 *
 * 排序规则（与原弹窗一致）：
 *   1. 一级分类按 feeMajorCategoryOrder 排序
 *   2. 二级分类按 feeCategoryOrder 排序
 *   3. 业务编码字典序
 */
export function buildStatResult(args: BuildStatResultArgs): StatResult {
  const { statData, beginningBalance, endingBalance, yearMonth, channel, shopName } = args;

  // === 1. 排序 ===
  const sorted = [...statData].sort((a, b) => {
    const ca = getFeeCategory(a.businessCode);
    const cb = getFeeCategory(b.businessCode);
    const ma = feeMajorCategoryOrder.indexOf(getFeeMajorCategory(ca));
    const mb = feeMajorCategoryOrder.indexOf(getFeeMajorCategory(cb));
    if (ma !== mb) return ma - mb;
    const ia = feeCategoryOrder.indexOf(ca);
    const ib = feeCategoryOrder.indexOf(cb);
    if (ia !== ib) return ia - ib;
    return (a.businessCode || '').localeCompare(b.businessCode || '');
  });

  // === 2. 汇总 3 类（按业务编码聚合 calculate） ===
  const collectionTotal = statData
    .filter((it) => summaryGroups[0].codes.includes(it.businessCode))
    .reduce((s, it) => s + (it.calculate || 0), 0);
  const deductionTotal = statData
    .filter((it) => summaryGroups[1].codes.includes(it.businessCode))
    .reduce((s, it) => s + (it.calculate || 0), 0);
  const withdrawTotal = statData
    .filter((it) => summaryGroups[2].codes.includes(it.businessCode))
    .reduce((s, it) => s + (it.calculate || 0), 0);

  const lastMonthBalance = beginningBalance || 0;
  const currentMonthEndBalance = endingBalance || 0;
  const interest = 0;
  const calculatedBalance =
    lastMonthBalance + collectionTotal + deductionTotal + withdrawTotal + interest;
  const checkDiff = calculatedBalance - currentMonthEndBalance;

  const summary: SummaryRow = {
    billMonth: yearMonth,
    platform: channel,
    accountName: shopName,
    endBalance: currentMonthEndBalance,
    lastMonthBalance,
    currentCollection: collectionTotal,
    currentExpense: deductionTotal,
    withdraw: withdrawTotal,
    interest,
    calculatedBalance,
    checkDiff,
  };

  // === 3. 明细 + rowSpan 聚合 ===
  const majorCount: Record<string, number> = {};
  const majorFirstIndex: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  const categoryFirstIndex: Record<string, number> = {};
  const categoryIncomeSum: Record<string, number> = {};
  const categoryExpenseSum: Record<string, number> = {};

  sorted.forEach((it, idx) => {
    const cat = getFeeCategory(it.businessCode);
    const major = getFeeMajorCategory(cat);
    majorCount[major] = (majorCount[major] || 0) + 1;
    if (majorFirstIndex[major] === undefined) majorFirstIndex[major] = idx;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (categoryFirstIndex[cat] === undefined) categoryFirstIndex[cat] = idx;
    categoryIncomeSum[cat] = (categoryIncomeSum[cat] || 0) + (it.totalIncome || 0);
    categoryExpenseSum[cat] = (categoryExpenseSum[cat] || 0) + (it.totalExpense || 0);
  });

  const detail: DetailRow[] = sorted.map((it, idx) => {
    const cat = getFeeCategory(it.businessCode);
    return {
      feeMajorCategory: getFeeMajorCategory(cat),
      feeCategory: cat,
      incomeSum: categoryIncomeSum[cat] || 0,
      expenseSum: categoryExpenseSum[cat] || 0,
      businessCode: it.businessCode,
      businessDesc: it.businessDesc,
      totalIncome: it.totalIncome || 0,
      totalExpense: it.totalExpense || 0,
      calculate: it.calculate || 0,
      rowColor: getRowColor(it.businessCode),
    };
  });

  return {
    summary,
    detail,
    detailGroupMeta: {
      majorCount,
      majorFirstIndex,
      categoryCount,
      categoryFirstIndex,
    },
  };
}

/**
 * 计算上一个年月，跨年自动处理（2026-01 -> 2025-12）
 */
export function getPrevYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  let py = y;
  let pm = m - 1;
  if (pm === 0) {
    py = y - 1;
    pm = 12;
  }
  return `${py}-${String(pm).padStart(2, '0')}`;
}
