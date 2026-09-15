import type { FinanceDyCostStatVo } from '@/services/channelExtendCostApi';

/**
 * 抖音 - 批量导出统计计算
 *
 * 从 DyExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 */

/** 每个分类的「纯收支」元信息 */
export interface DyCategoryMeta {
  /**
   * pure = 除「收入金额（入账）/ 支出金额（出账）」外，其余明细列
   * （含 订单净收入 及各费用列）均为 0，即后端未给出任何费用拆分
   */
  pure: boolean;
  /**
   * orderNetIncome = 该分类在「订单净收入」列展示 / 汇总的有效值：
   *   小额打款 → 首层 value；
   *   纯收支分类 → 收入金额（入账）＝首层 value 为正的部分；
   *   其余（含 提现）→ details 里「订单净收入」原值
   */
  orderNetIncome: number;
}

export interface DyBalanceSummary {
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

export interface DyBatchStatResult {
  /** 动态明细列名（「订单净收入」固定第一个，其余按出现顺序） */
  columnNames: string[];
  /** 每个分类的纯收支元信息 */
  categoryMeta: Map<string, DyCategoryMeta>;
  /** 各明细列纵向合计（含最右侧「收入金额」「支出金额」两列合计） */
  summaryRow: Record<string, number>;
  /** 抖音余额对账（顶部汇总表） */
  balance: DyBalanceSummary;
}

/** 该分类 details 里某明细项的值（缺失 / 非数字按 0 处理） */
function detailValue(cat: FinanceDyCostStatVo, name: string): number {
  const d = (cat.details || []).find((x) => x.name === name);
  return d && typeof d.value === 'number' ? d.value : 0;
}

/**
 * 动态明细列名：取所有分类 details 里 name 的去重并集（保持出现顺序）
 * 「订单净收入」固定为第一列；「动账金额」「收入金额」「支出金额」三项明细
 * 与最右侧固定两列含义重复，滤除不再单独展示。
 */
export function getDyDetailColumnNames(data: FinanceDyCostStatVo[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const collect = (detailName: string | undefined) => {
    if (!detailName) return;
    if (detailName === '动账金额' || detailName === '收入金额' || detailName === '支出金额') return;
    if (!seen.has(detailName)) {
      seen.add(detailName);
      names.push(detailName);
    }
  };
  collect('订单净收入');
  data.forEach((cat) => {
    (cat.details || []).forEach((d) => {
      collect(d.name);
    });
  });
  return names;
}

/**
 * 每个分类的「纯收支」元信息（业务描述（分类别）除 小额打款 / 提现 外判断）
 */
export function getDyCategoryMeta(
  data: FinanceDyCostStatVo[],
  columnNames: string[],
): Map<string, DyCategoryMeta> {
  const map = new Map<string, DyCategoryMeta>();
  data.forEach((cat) => {
    const name = cat.name || '';
    if (name === '小额打款') {
      map.set(name, {
        pure: false,
        orderNetIncome: typeof cat.value === 'number' ? cat.value : 0,
      });
      return;
    }
    if (name === '提现') {
      map.set(name, { pure: false, orderNetIncome: detailValue(cat, '订单净收入') });
      return;
    }
    const pure = columnNames.every((col) => Math.abs(detailValue(cat, col)) < 1e-9);
    const incomeAmount = typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
    map.set(name, {
      pure,
      orderNetIncome: pure ? incomeAmount : detailValue(cat, '订单净收入'),
    });
  });
  return map;
}

/**
 * 抖音费用统计各明细列纵向合计（每列 = 所有分类该列金额之和），
 * 作为表格的合计行展示，便于核对「汇总各费用项」。
 * 右端两列合计：收入金额 = 各分类首层 value 正数之和；支出金额 = 负数之和。
 */
export function getDySummaryRow(
  data: FinanceDyCostStatVo[],
  categoryMeta: Map<string, DyCategoryMeta>,
): Record<string, number> {
  const acc: Record<string, number> = {};
  let incomeSum = 0;
  let expenseSum = 0;
  data.forEach((cat) => {
    (cat.details || []).forEach((d) => {
      // 「动账金额」「收入金额」「支出金额」明细项与最右侧固定列重复，不计入列合计
      if (d.name === '动账金额' || d.name === '收入金额' || d.name === '支出金额') return;
      if (d.name && typeof d.value === 'number') {
        // 订单净收入特殊口径：
        //   小额打款 → 取首层 value；
        //   纯收支分类 → 收入金额（入账）＝首层 value 为正的部分；
        //   其余 → details 原值
        let dv = d.value;
        if (d.name === '订单净收入' && cat.name === '小额打款') {
          dv = typeof cat.value === 'number' ? cat.value : 0;
        } else if (d.name === '订单净收入' && cat.name && categoryMeta.get(cat.name)?.pure) {
          dv = typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
        }
        acc[d.name] = (acc[d.name] || 0) + dv;
      }
    });
    const v = typeof cat.value === 'number' ? cat.value : 0;
    if (v > 0) incomeSum += v;
    if (v < 0) expenseSum += v;
  });
  acc['收入金额'] = incomeSum;
  acc['支出金额'] = expenseSum;
  return acc;
}

/**
 * 抖音余额对账（最上面的汇总表）：
 *   本期收款 = 订单净收入合计（小额打款取首层 value、纯收支分类取收入金额（入账）、其余取 details 原值）
 *   本期费用 = 平台服务费 + 佣金 + 服务商佣金 + 招商服务费 + 站外推广费（五列合计，保留负号）
 *              + 除 小额打款 / 提现 外各「纯收支」分类的支出金额（出账）
 *              + 兼容：上门取件-支付快递费 / 退换货运费险 / 充值基础保证金 / 消费者赔付
 *                若未命中「纯收支」（罕见），仍单独把支出金额（出账）计入本期费用
 *   提现 = 「提现」分类行的支出金额（出账，首层 value 为负的部分）；结息 = 默认 0
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
 *   校验     = 计算余额 - 期末余额
 */
export function getDyBalanceSummary(args: {
  data: FinanceDyCostStatVo[];
  categoryMeta: Map<string, DyCategoryMeta>;
  summaryRow: Record<string, number>;
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): DyBalanceSummary {
  const { data, categoryMeta, summaryRow } = args;
  const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);

  // 本期收款 = 订单净收入合计
  let incomeTotal = 0;
  data.forEach((cat) => {
    if (cat.name === '小额打款') {
      if (typeof cat.value === 'number') {
        incomeTotal += cat.value;
      }
      return;
    }
    if (cat.name && categoryMeta.get(cat.name)?.pure) {
      incomeTotal += typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
      return;
    }
    const net = (cat.details || []).find((d) => d.name === '订单净收入');
    if (net && typeof net.value === 'number') {
      incomeTotal += net.value;
    }
  });

  // 本期费用
  const asNegative = (n: number | undefined) => {
    if (typeof n !== 'number') return 0;
    return n < 0 ? n : -n;
  };
  const outgoOf = (cat: FinanceDyCostStatVo | undefined) =>
    cat && typeof cat.value === 'number' && cat.value < 0 ? cat.value : 0;
  let expenseTotal = 0;
  ['平台服务费', '佣金', '服务商佣金', '招商服务费', '站外推广费'].forEach((key) => {
    expenseTotal += asNegative(summaryRow[key]);
  });
  data.forEach((cat) => {
    if (!cat.name || cat.name === '小额打款' || cat.name === '提现') return;
    if (categoryMeta.get(cat.name)?.pure) {
      expenseTotal += outgoOf(cat);
    }
  });
  ['上门取件-支付快递费', '退换货运费险', '充值基础保证金', '消费者赔付'].forEach(
    (categoryName) => {
      const cat = data.find((c) => c.name === categoryName);
      const meta = cat ? categoryMeta.get(categoryName) : undefined;
      if (cat && !(meta && meta.pure)) {
        expenseTotal += outgoOf(cat);
      }
    },
  );

  const lastMonthBalance = safeNum(args.beginningBalance);
  const endBalance = safeNum(args.endingBalance);
  const currentCollection = incomeTotal;
  const currentExpense = expenseTotal;
  // 提现 = 「提现」分类首层 value 为负的部分（保留负号），非负则计 0
  const withdrawCat = data.find((c) => c.name === '提现');
  const withdrawValue = typeof withdrawCat?.value === 'number' ? withdrawCat.value : 0;
  const withdraw = withdrawCat ? (withdrawValue < 0 ? withdrawValue : 0) : 0;
  const interest = 0; // 结息固定 0
  const calculatedBalance =
    lastMonthBalance + currentCollection + currentExpense + withdraw + interest;
  const checkDiff = calculatedBalance - endBalance;

  return {
    billMonth: args.yearMonth,
    accountName: args.shopName,
    platform: '抖音',
    endBalance,
    lastMonthBalance,
    currentCollection,
    currentExpense,
    withdraw,
    interest,
    calculatedBalance,
    checkDiff,
  };
}

/**
 * 组装抖音批量导出所需的全部统计结果
 */
export function buildDyStat(args: {
  dyStatData: FinanceDyCostStatVo[];
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): DyBatchStatResult {
  const columnNames = getDyDetailColumnNames(args.dyStatData);
  const categoryMeta = getDyCategoryMeta(args.dyStatData, columnNames);
  const summaryRow = getDySummaryRow(args.dyStatData, categoryMeta);
  const balance = getDyBalanceSummary({
    data: args.dyStatData,
    categoryMeta,
    summaryRow,
    beginningBalance: args.beginningBalance,
    endingBalance: args.endingBalance,
    yearMonth: args.yearMonth,
    shopName: args.shopName,
  });
  return { columnNames, categoryMeta, summaryRow, balance };
}
