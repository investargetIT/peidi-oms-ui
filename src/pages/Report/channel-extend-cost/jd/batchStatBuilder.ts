import dayjs from 'dayjs';
import type {
  FinanceJd1CalculateStatVo,
  FinanceJd2ExpenseStatVo,
} from '@/services/channelExtendCostApi';

/**
 * 京东 - 批量导出 计算工具（与「费用统计」弹窗保持完全一致）
 *
 * 把京东 jd-cost-stat 接口返回的原始数据，重算成四张表的数据：
 *   1. 京东余额对账（单行，6 列）
 *   2. 京东钱包支出分类统计（透视成 1 行 N 列：每个 remarkCategory 一列）
 *   3. 费用分类统计（按固定映射把账单收支总计行归类为 分类-管报名称-业务描述）
 *   4. 京东账单收支计算列表（透视成 N 行：每 billDate 一行，每 businessDesc 一列 + 总计列）
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
  /** 费用分类统计表（与弹窗一致：固定映射归类 + rowSpan 合并元信息） */
  jd1Category: JdCategoryTable;
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

// ===== 费用分类统计映射（与 jd/index.tsx 弹窗完全一致） =====
export interface JdCategoryMapping {
  major: string;
  category: string;
  desc: string;
  source?: 'jd2';
}

// 费用分类统计：取「京东账单收支计算列表」总计行每列的合计，
// 按 分类/管报名称/业务描述 归类展示（样式参考拼多多费用统计弹窗）
// source: 'jd2' 表示该行金额不从账单收支取，改从「京东钱包支出分类统计」对应分类取
const JD1_CATEGORY_MAPPING: JdCategoryMapping[] = [
  { major: '推广费', category: '京东联盟', desc: '京东联盟', source: 'jd2' },
  { major: '平台费用', category: '交易服务费', desc: '交易服务费' },
  { major: '平台费用', category: '白条', desc: '代收白条网络推广技术服务费' },
  { major: '其他', category: '其他', desc: '价保返佣' },
  { major: '平台费用', category: '佣金', desc: '佣金' },
  { major: '其他', category: '其他', desc: '货款' },
  { major: '平台费用', category: '运费险', desc: '运费保险服务费' },
  { major: '平台费用', category: '京豆', desc: '随单送的京豆' },
  { major: '其他', category: '其他', desc: '平台券价保补贴' },
  { major: '其他', category: '其他', desc: '平台券价保补贴佣金' },
  { major: '其他', category: '其他', desc: '代收配送费' },
  { major: '其他', category: '其他', desc: '综合违约金' },
];

// 按「第一层分类 → 第二层管报名称」排序后的映射（相同层的行排在一起，合并才连续），
// 组间顺序按清单首次出现先后（稳定排序，组内保持原相对顺序）。
const SORTED_JD1_CATEGORY_MAPPING = (() => {
  const majorOrder: Record<string, number> = {};
  const categoryOrder: Record<string, number> = {};
  JD1_CATEGORY_MAPPING.forEach((m) => {
    if (majorOrder[m.major] === undefined) {
      majorOrder[m.major] = Object.keys(majorOrder).length;
    }
    const catKey = `${m.major}-${m.category}`;
    if (categoryOrder[catKey] === undefined) {
      categoryOrder[catKey] = Object.keys(categoryOrder).length;
    }
  });
  return JD1_CATEGORY_MAPPING.map((m, originIndex) => ({ ...m, originIndex })).sort(
    (a, b) =>
      majorOrder[a.major] - majorOrder[b.major] ||
      categoryOrder[`${a.major}-${a.category}`] - categoryOrder[`${b.major}-${b.category}`] ||
      a.originIndex - b.originIndex,
  );
})();

/** 费用分类统计 展示行 */
export interface JdCategoryRow {
  /** 第一层分类（合并单元格用） */
  major: string;
  /** 第二层管报名称（合并单元格用） */
  category: string;
  /** 业务描述 */
  desc: string;
  /** 金额（来源按 source；未命中时为 undefined，展示 '-'） */
  amount: number | undefined;
}

/** 费用分类统计 表格视图（含 rowSpan 元信息，与 jd/index.tsx 的 jd1CategoryTable 一致） */
export interface JdCategoryTable {
  rows: JdCategoryRow[];
  majorCount: Record<string, number>;
  categoryCount: Record<string, number>;
  majorFirstIndex: Record<string, number>;
  categoryFirstIndex: Record<string, number>;
}

const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

/**
 * 组装「费用分类统计」表格（与 jd/index.tsx 弹窗 jd1CategoryTable 完全同口径）：
 *   - 按固定映射把账单收支计算列表「总计行」各业务列归到 分类-管报名称-业务描述；
 *   - source === 'jd2' 的行金额取自「京东钱包支出分类统计」对应分类；
 *   - 映射之外的业务描述追加到末尾，归类为「空-空-业务描述」。
 */
export function buildJdCategoryTable(args: {
  /** 账单收支计算列表「总计行」（各业务列合计） */
  jd1SummaryRow: Record<string, number>;
  /** 账单收支计算列表的有序业务描述列 */
  jd1Columns: string[];
  /** 钱包支出分类透视（1 行） */
  pivotedJd2: Record<string, number>[];
}): JdCategoryTable {
  const { jd1SummaryRow, jd1Columns, pivotedJd2 } = args;
  const majorCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  const majorFirstIndex: Record<string, number> = {};
  const categoryFirstIndex: Record<string, number> = {};
  const rows: JdCategoryRow[] = [];

  SORTED_JD1_CATEGORY_MAPPING.forEach((m, index) => {
    const majorKey = m.major;
    const catKey = `${m.major}-${m.category}`;
    if (majorFirstIndex[majorKey] === undefined) majorFirstIndex[majorKey] = index;
    if (categoryFirstIndex[catKey] === undefined) categoryFirstIndex[catKey] = index;
    majorCount[majorKey] = (majorCount[majorKey] || 0) + 1;
    categoryCount[catKey] = (categoryCount[catKey] || 0) + 1;
    let amount: number | undefined;
    if (m.source === 'jd2') {
      const jd2Row = pivotedJd2[0];
      amount = jd2Row && typeof jd2Row[m.desc] === 'number' ? jd2Row[m.desc] : undefined;
    } else {
      amount = jd1Columns.includes(m.desc) ? jd1SummaryRow[m.desc] : undefined;
    }
    rows.push({ major: m.major, category: m.category, desc: m.desc, amount });
  });

  // 兜底：数据里出现但映射清单之外的业务描述 → 追加到末尾，归类为「空-空-该业务描述」
  const mappedDescs = new Set(JD1_CATEGORY_MAPPING.map((m) => m.desc));
  const unmappedDescs = jd1Columns.filter((desc) => !mappedDescs.has(desc));
  unmappedDescs.forEach((desc) => {
    const index = rows.length;
    const catKey = `${''}-${''}`;
    if (majorFirstIndex[''] === undefined) majorFirstIndex[''] = index;
    if (categoryFirstIndex[catKey] === undefined) categoryFirstIndex[catKey] = index;
    majorCount[''] = (majorCount[''] || 0) + 1;
    categoryCount[catKey] = (categoryCount[catKey] || 0) + 1;
    rows.push({ major: '', category: '', desc, amount: jd1SummaryRow[desc] });
  });

  return { rows, majorCount, categoryCount, majorFirstIndex, categoryFirstIndex };
}

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
    // 费用分类统计表（固定映射把总计行归类，与弹窗一致）
    jd1Category: buildJdCategoryTable({
      jd1SummaryRow,
      jd1Columns: descOrder,
      pivotedJd2: jd2CatOrder.length > 0 ? [jd2Row] : [],
    }),
  };
}
