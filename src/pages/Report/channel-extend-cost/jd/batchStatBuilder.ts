import dayjs from 'dayjs';
import type {
  FinanceJd1CalculateStatVo,
  FinanceJd2ExpenseStatVo,
} from '@/services/channelExtendCostApi';

/**
 * 京东 - 批量导出 计算工具（与「费用统计」弹窗保持完全一致）
 *
 * 把京东 jd-cost-stat 接口返回的原始数据，重算成三张表的数据：
 *   1. 京东余额对账（单行，6 列）
 *   2. 京东钱包支出分类统计（透视成 1 行 N 列：每个 remarkCategory 一列）
 *   3. 京东账单收支计算列表（透视成 N 行：每 billDate 一行，每 businessDesc 一列 + 总计列）
 *
 * 计算口径与 jd/index.tsx 弹窗里的 useMemo 完全对齐，保证导出与页面展示一致。
 */

export interface JdBalanceRow {
  lastMonthBalance: number;
  endingBalance: number;
  currentMonthIn: number;
  currentPeriodExpense: number;
  collection: number;
  checkSum: number;
}

export interface JdPivotedRow {
  billDate: string;
  total: number;
  [desc: string]: number | string;
}

export interface JdBatchStatResult {
  /** 余额对账单行 */
  balance: JdBalanceRow;
  /** 钱包支出分类的有序列（按首次出现顺序） */
  jd2Categories: string[];
  /** 钱包支出分类透视（1 行，key = 分类名，value = 金额） */
  pivotedJd2: Record<string, number>[];
  /** 账单收支计算的有序业务描述列 */
  jd1Columns: string[];
  /** 账单收支计算透视（每 billDate 一行） */
  pivotedJd1: JdPivotedRow[];
  /** 总计行（排除本月最后一天，但保留上月末日） */
  jd1SummaryRow: Record<string, number>;
}

export interface BuildJdStatArgs {
  jd2ExpenseStat: FinanceJd2ExpenseStatVo[];
  jd1CalculateStat: FinanceJd1CalculateStatVo[];
  lastMonthJd1CalculateStat: FinanceJd1CalculateStatVo[];
  lastMonthEndingBalance: number | null;
  yearMonth: string;
  shopName: string;
}

// 扣减项（本月入账做减法用）
const DEDUCT_CATEGORIES = [
  '提现',
  '京东联盟',
  '违约金',
  '其他',
  '价保',
  '直赔代扣',
  '售后',
  '先行赔付',
  '挽单补偿险',
  '逆向价保险',
  '运营服务费',
];

// 收款 = A − 直赔代扣 − 违约金 − 价保 − 售后 − 先行赔付 − 挽单补偿险
const COLLECTION_A_CATEGORIES = [
  '代收配送费',
  '货款',
  '价保扣款',
  '平台券价保补贴',
  '平台券价保补贴佣金',
  '售后卖家赔付费',
  '综合违约金',
];
const COLLECTION_DEDUCT_CATEGORIES = ['直赔代扣', '违约金', '价保', '售后', '先行赔付', '挽单补偿险'];

// 本期费用 = 9 项 jd1 总计列之和 − 钱包支出里的京东联盟、运营服务费
const EXPENSE_JD1_CATEGORIES = [
  '代收白条网络推广技术服务费',
  '交易服务费',
  '随单送的京豆',
  '运费保险服务费',
  '价保返佣',
  '佣金',
  '直营服务费',
  '商品保险服务费',
  '智能礼金新客推广费',
];
const EXPENSE_JD2_CATEGORIES = ['京东联盟', '运营服务费'];

const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

/**
 * 按 yyyy-MM 算出当月 startDate / endDate
 */
export function getMonthRange(yearMonth: string): { startDate: string; endDate: string } {
  const m = dayjs(`${yearMonth}-01`);
  return {
    startDate: m.startOf('month').format('YYYY-MM-DD'),
    endDate: m.endOf('month').format('YYYY-MM-DD'),
  };
}

/**
 * 把京东 jd-cost-stat 原始数据重算成三张表数据。
 */
export function buildJdStat(args: BuildJdStatArgs): JdBatchStatResult {
  const {
    jd2ExpenseStat,
    jd1CalculateStat,
    lastMonthJd1CalculateStat,
    lastMonthEndingBalance,
    yearMonth,
  } = args;

  // ===== 京东钱包支出分类统计：pivot 成 1 行 N 列 =====
  const jd2Row: Record<string, number> = {};
  const jd2CatOrder: string[] = [];
  const jd2Seen = new Set<string>();
  (jd2ExpenseStat || []).forEach((item) => {
    const cat = item.remarkCategory;
    if (cat) {
      jd2Row[cat] = num(jd2Row[cat]) + num(item.totalExpense);
      if (!jd2Seen.has(cat)) {
        jd2Seen.add(cat);
        jd2CatOrder.push(cat);
      }
    }
  });

  // ===== 京东账单收支计算列表：合并当月 + 上月末日，按 billDate 倒序，pivot =====
  const combined: FinanceJd1CalculateStatVo[] = [
    ...(jd1CalculateStat || []),
    ...(lastMonthJd1CalculateStat || []),
  ];
  combined.sort((a, b) => (b.billDate || '').localeCompare(a.billDate || ''));

  const rowMap = new Map<string, Record<string, number>>();
  const descOrder: string[] = [];
  const descSeen = new Set<string>();
  combined.forEach((item) => {
    const date = item.billDate || '';
    if (!rowMap.has(date)) rowMap.set(date, {});
    const row = rowMap.get(date)!;
    const desc = item.businessDesc;
    if (desc) {
      row[desc] = num(row[desc]) + num(item.calculate);
      if (!descSeen.has(desc)) {
        descSeen.add(desc);
        descOrder.push(desc);
      }
    }
  });

  const pivotedJd1: JdPivotedRow[] = Array.from(rowMap.entries()).map(([date, row]) => {
    let sum = 0;
    descOrder.forEach((desc) => {
      sum += num(row[desc]);
    });
    return { billDate: date, ...row, total: sum };
  });

  // 本月最后一天（如 2026-07-31）：总计行排除它，但保留上月末日（6/30）
  const lastDayOfMonth = dayjs(`${yearMonth}-01`).endOf('month').format('YYYY-MM-DD');
  const filteredForSummary = pivotedJd1.filter((r) => r.billDate !== lastDayOfMonth);

  const jd1SummaryRow: Record<string, number> = {};
  descOrder.forEach((desc) => {
    jd1SummaryRow[desc] = filteredForSummary.reduce((acc, row) => acc + num(row[desc]), 0);
  });
  jd1SummaryRow.total = filteredForSummary.reduce((acc, row) => acc + num(row.total), 0);

  // ===== 京东余额对账（单行） =====
  const deductSum = DEDUCT_CATEGORIES.reduce((sum, cat) => sum + num(jd2Row[cat]), 0);
  const currentMonthIn = num(jd1SummaryRow.total) - deductSum;

  const collectionA = COLLECTION_A_CATEGORIES.reduce(
    (sum, desc) => sum + num(jd1SummaryRow[desc]),
    0,
  );
  const collectionDeduct = COLLECTION_DEDUCT_CATEGORIES.reduce(
    (sum, cat) => sum + num(jd2Row[cat]),
    0,
  );
  const collection = collectionA - collectionDeduct;

  const expenseJd1Sum = EXPENSE_JD1_CATEGORIES.reduce(
    (sum, desc) => sum + num(jd1SummaryRow[desc]),
    0,
  );
  const expenseJd2Value = EXPENSE_JD2_CATEGORIES.reduce(
    (sum, cat) => sum + num(jd2Row[cat]),
    0,
  );
  const currentPeriodExpense = expenseJd1Sum - expenseJd2Value;

  const lastMonthBalanceValue = num(lastMonthEndingBalance);
  const endingBalanceValue = lastMonthBalanceValue + currentMonthIn;
  const withdrawValue = num(jd2Row['提现']);

  const checkSum =
    endingBalanceValue -
    (lastMonthBalanceValue + currentPeriodExpense + collection - withdrawValue);

  return {
    balance: {
      lastMonthBalance: lastMonthBalanceValue,
      endingBalance: endingBalanceValue,
      currentMonthIn,
      currentPeriodExpense,
      collection,
      checkSum,
    },
    jd2Categories: jd2CatOrder,
    pivotedJd2: jd2CatOrder.length > 0 ? [jd2Row] : [],
    jd1Columns: descOrder,
    pivotedJd1,
    jd1SummaryRow,
  };
}
