import type { FinanceKuaishouCostStatItemVo } from '@/services/channelExtendCostApi';

/**
 * 快手 - 批量导出统计计算
 *
 * 从 KuaishouExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 *
 * 展示形式：固定 5 行模板，按后端返回的 name 匹配取数（参考小红书）：
 *   分类「其他」     : 其他（净收入）= 合计收入 - 订单退款
 *   分类「平台费用」 : 技术服务费
 *   分类「推广费用」 : 达人佣金 / 团长佣金 / 服务商佣金
 */

/** 快手统一展示模板：分类 -> 管报名称 -> 后端 name 来源 */
export interface KuaishouRowDef {
  /** 分类（合并单元格用），顺序即展示顺序 */
  category: string;
  /** 管报名称（展示用） */
  displayName: string;
  /** 金额取数的后端 name；净收入行额外用订单退款做减法 */
  sourceName: string;
  /** 净收入行：value = sourceName(合计收入) - 订单退款 */
  net?: boolean;
}

/** 后端返回 name 顺序无关，模板顺序即最终展示顺序 */
export const KUAISHOU_ROW_DEFS: KuaishouRowDef[] = [
  { category: '其他', displayName: '其他', sourceName: '合计收入', net: true },
  { category: '平台费用', displayName: '技术服务费', sourceName: '技术服务费' },
  { category: '推广费用', displayName: '达人佣金', sourceName: '达人佣金' },
  { category: '推广费用', displayName: '团长佣金', sourceName: '团长佣金' },
  { category: '推广费用', displayName: '服务商佣金', sourceName: '服务商佣金' },
];

/** 净收入行的减项 name */
const NET_REFUND_NAME = '订单退款';

export interface KuaishouBalanceSummary {
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

export interface KuaishouDetailRow {
  /** 分类（其他 / 平台费用 / 推广费用，合并单元格用） */
  category: string;
  /** 管报名称 */
  name: string;
  income: number;
  expense: number;
}

export interface KuaishouBatchStatResult {
  /** 快手余额对账（顶部汇总表），income/expense/total 供合计行使用 */
  summary: KuaishouBalanceSummary & { income: number; expense: number; total: number };
  /** 明细表行（按模板固定顺序） */
  rows: KuaishouDetailRow[];
  /** 分类合并单元格用：分类 -> 行数 / 首行下标 */
  catCount: Record<string, number>;
  catFirstIndex: Record<string, number>;
}

/**
 * 组装快手批量导出所需的全部统计结果。
 *
 * 口径（与小红书一致）：
 *   本期收款 = 明细表收入列之和（净收入）
 *   本期费用 = 明细表支出列之和（技术服务费 + 各项佣金，保留负号）
 *   提现 / 结息 = 默认 0
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
 *   校验     = 计算余额 - 期末余额
 */
export function buildKuaishouStat(args: {
  kuaishouStatData: FinanceKuaishouCostStatItemVo[];
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): KuaishouBatchStatResult {
  const { kuaishouStatData, beginningBalance, endingBalance, yearMonth, shopName } = args;

  // —— 后端 name -> { value, type } 索引 ——
  const byName: Record<string, { value: number; type?: string }> = {};
  kuaishouStatData.forEach((it) => {
    const key = it.name || '';
    byName[key] = {
      value: typeof it.value === 'number' ? it.value : 0,
      type: it.type,
    };
  });

  // —— 展示行：按模板顺序取数，后端未返回的 name 不展示 ——
  const rows: KuaishouDetailRow[] = [];
  KUAISHOU_ROW_DEFS.forEach((def) => {
    const item = byName[def.sourceName];
    // 后端没返回该 name 就隐藏这一行（净收入行的取数源是「合计收入」）
    if (!item) return;
    let value = item.value;
    let type = item.type;
    if (def.net) {
      // 净收入 = 合计收入 - 订单退款（后端未返回订单退款时按 0 处理）
      const refund = byName[NET_REFUND_NAME]?.value ?? 0;
      value = value - refund;
      type = value >= 0 ? '收入' : '支出';
    }
    rows.push({
      category: def.category,
      name: def.displayName,
      income: type === '收入' ? value : 0,
      expense: type === '支出' ? value : 0,
    });
  });

  // —— 汇总：本期收款 / 费用 取明细表行列合计（保证与展示完全一致）——
  let income = 0; // 本期收款 / 收入列之和（正数）
  let expense = 0; // 本期费用 / 支出列之和（保留负号）
  rows.forEach((r) => {
    income += r.income;
    expense += r.expense;
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
    platform: '快手',
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

  // —— 分类列合并计数 / 首行下标 ——
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
