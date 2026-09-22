import type {
  FinanceZfbCostStatVo,
  FinanceZfbCostStatDetailItemVo,
} from '@/services/channelExtendCostApi';

/**
 * 支付宝 - 批量导出统计计算
 *
 * 从 ZfbExtendCostBase「费用统计」弹窗里的 useMemo 计算逻辑抽成纯函数，
 * 弹窗渲染和「批量导出 Excel」共用同一份口径，保证两边展示完全一致。
 *
 * 「费用分类」映射（ZFB_FEE_TYPE_GROUPS / ZFB_FEE_TYPE_MAP）与明细视图组装
 * （buildZfbDetailRows）原定义在 ZfbExtendCostBase.tsx，现抽到本 builder，
 * 供弹窗与「批量导出」共用，避免两端各自维护而漂移。
 */

// 账单明细汇总「费用分类」映射：分类（document_type）→ 费用分类（推广费用 / 平台费用 / 其他）。
// 对应关系由业务提供，重复项已去重；未在映射内的分类兜底为「空」。
export const ZFB_FEE_TYPE_GROUPS: { feeType: string; categories: string[] }[] = [
  {
    feeType: '推广费用',
    categories: [
      '百亿补贴软件服务费（渠道）',
      '百亿补贴软件服务费T62（全渠道）',
      '品牌新享-首单拉新计划',
      '品牌新享-天猫营销托管软件服务费',
      '品牌新享天猫超级老客加速软件服务费',
      '品牌新享天猫超级新客加速（固定）软件服务费',
      '品牌新享新品孵化软件服务费',
      '品牌新享-超级流量加速软件服务费',
      '品牌直播大场营销软件服务费',
      '品牌新享天猫新客营销托管',
      '光合平台软件服务费',
      '猫猫币抵扣项目平台垫付资金',
      '猫猫币抵扣项目推广服务费',
      '淘宝客佣金',
      '淘宝内容推广服务费',
      '超市福袋',
      '店播佣金',
      '渠道推广服务费',
      '淘客U选返佣',
      '销售渠道推广费',
      '营销活动-品类消费金',
      '营销活动-淘客',
      '营销活动-淘客团长服务费',
      '用户权益推广服务费',
      '直播收费（佣金）',
    ],
  },
  {
    feeType: '平台费用',
    categories: [
      '返点积分',
      '基础软件服务费',
      '缺货赔付',
      '淘金币软件服务费',
      '天猫佣金',
      '消费者体验提升计划服务费',
      '先用后付技术服务费',
      '先用后付服务费',
      '淘宝天猫跨境服务增值费',
      '商家集运物流服务费',
      '商家集运中转操作费',
      '公益宝贝捐赠',
      '官方物流送货上门服务费',
      '技术服务费(花呗分期免息营销)',
      '闪购仓-退货入仓费',
      '闪购仓-装卸费',
      '闪购仓基础供应链管理服务费',
      '天猫U先入仓物流抽佣',
      '天猫U先试用超市物流服务费',
      '天猫淘宝商家跨境服务基础费',
      '寄售集货仓物流费',
      '评价有礼服务费',
      '售后客服服务费',
      '售前客服服务费',
      '送货上门服务费',
      '退货运费保障服务费',
    ],
  },
  {
    feeType: '其他',
    categories: ['收款', '提现', 'BP'],
  },
];

// 扁平化映射表：分类 → 费用分类（由 ZFB_FEE_TYPE_GROUPS 派生，保证两处一致）
export const ZFB_FEE_TYPE_MAP: Record<string, string> = ZFB_FEE_TYPE_GROUPS.reduce((map, group) => {
  group.categories.forEach((cat) => {
    map[cat] = group.feeType;
  });
  return map;
}, {} as Record<string, string>);

/** 费用分类分组的展示顺序 */
const ZFB_FEE_TYPE_ORDER: Record<string, number> = { 推广费用: 0, 平台费用: 1, 其他: 2, 空: 3 };

/** 支付宝账单明细汇总视图行（与弹窗明细表对齐后，供导出渲染） */
export interface ZfbDetailRow {
  /** 费用分类（推广费用 / 平台费用 / 其他 / 空，合并单元格用） */
  feeType: string;
  /** 分类（document_type 原样） */
  category: string;
  /** 对方账号 */
  accountCode: string;
  /** 收入金额 */
  totalIncome: number;
  /** 支出金额 */
  totalExpense: number;
  /** 费用分类 rowSpan（>1 表示该行起始并向下合并 n 格；0 = 已被合并） */
  feeTypeSpan: number;
}

/** 支付宝账单明细汇总「总计行」 */
export interface ZfbTotalRow {
  category: string;
  accountCode: string;
  incomeTotal: number;
  expenseTotal: number;
}

export interface ZfbBalanceSummary {
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

export interface ZfbBatchStatResult {
  /** 账单明细汇总行（分类 + 对方账号 + 收入/支出） */
  rows: FinanceZfbCostStatDetailItemVo[];
  /** 总计行（收入/支出全量合计） */
  total?: FinanceZfbCostStatDetailItemVo;
  /** 收入全量合计 */
  incomeTotal: number;
  /** 支出全量合计 */
  expenseTotal: number;
  /** 支付宝余额对账（顶部汇总表） */
  summary: ZfbBalanceSummary;
  /** 账单明细汇总视图行（费用分类归一 + 分组排序 + rowSpan，与弹窗明细表一致） */
  detailRows: ZfbDetailRow[];
  /** 账单明细汇总「总计行」 */
  totalRow: ZfbTotalRow;
}

/**
 * 把账单明细原始 rows 组装成与弹窗明细表一致的视图：
 *  1. 按 费用分类（推广费用→平台费用→其他→空）稳定分组排序，组内保持接口原相对顺序；
 *  2. 费用分类 = ZFB_FEE_TYPE_MAP 归一（映射外兜底「空」）；
 *  3. 分类 / 对方账号 / 收入 / 支出 = 接口原样；
 *  4. 费用分类列整组合并（rowSpan）。
 * 与 ZfbExtendCostBase.tsx 的 zfbDetailRows / zfbFeeTypeSpan 完全同口径。
 */
export function buildZfbDetailRows(
  rows: FinanceZfbCostStatDetailItemVo[],
): ZfbDetailRow[] {
  const feeTypeOf = (row: FinanceZfbCostStatDetailItemVo) =>
    ZFB_FEE_TYPE_MAP[row.category || ''] ?? '空';

  // 1. 按费用分类稳定分组排序（同组内保持接口原相对顺序）
  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (ZFB_FEE_TYPE_ORDER[feeTypeOf(a.row)] ?? 3) -
          (ZFB_FEE_TYPE_ORDER[feeTypeOf(b.row)] ?? 3) || a.index - b.index,
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

  return sorted.map((row, index) => ({
    feeType: feeTypeOf(row),
    category: row.category || '',
    accountCode: row.accountCode || '',
    totalIncome: row.totalIncome || 0,
    totalExpense: row.totalExpense || 0,
    feeTypeSpan: feeTypeSpan[index],
  }));
}

/**
 * 组装支付宝批量导出所需的全部统计结果。
 *
 * 余额对账口径（按「账单明细汇总 rows 的分类」归类）：
 *   本期收款 = "收款" 分类的收入金额 + 支出金额
 *   提现     = "提现" 分类的收入金额 + 支出金额
 *   结息     = "结息" 分类的收入金额 + 支出金额
 *   本期费用 = 移除 收款 / 提现 / 结息 后，其余分类的收入金额 + 支出金额 之和
 *   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
 *   校验     = 计算余额 - 期末余额
 */
export function buildZfbStat(args: {
  zfbStatData: FinanceZfbCostStatVo | null;
  beginningBalance: number | null;
  endingBalance: number | null;
  yearMonth: string;
  shopName: string;
}): ZfbBatchStatResult {
  const { zfbStatData, beginningBalance, endingBalance, yearMonth, shopName } = args;
  const rows = zfbStatData?.rows || [];
  const total = zfbStatData?.total;
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
    // 明细视图（费用分类归一 + 分组排序 + rowSpan），供导出与弹窗一致渲染
    detailRows: buildZfbDetailRows(rows),
    // 总计行（分类取接口 total 原样，与弹窗汇总行一致）
    totalRow: {
      category: total?.category || '',
      accountCode: total?.accountCode || '',
      incomeTotal,
      expenseTotal,
    },
    summary: {
      billMonth: yearMonth,
      accountName: shopName,
      platform: '支付宝',
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
