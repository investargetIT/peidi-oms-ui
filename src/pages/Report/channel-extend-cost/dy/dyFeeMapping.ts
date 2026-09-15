/**
 * 抖音费用明细「分类 / 管报名称」映射（依据业务提供的三张抖音统计费用 Excel 硬编码）
 *
 * 弹窗（DyExtendCostBase）与批量导出（batchExcelRenderer）共用，保证两边口径一致。
 */

/** 行维度元信息：业务描述（分类别）→ 分类 + 管报名称 */
export interface DyBizDescMeta {
  category: string;
  mgmtName: string;
}

/** 列维度元信息：动态明细列名 → 费用分类 + 管报名称（表头上方两组组头） */
export interface DyColumnMeta {
  feeType: string;
  mgmtName: string;
}

/**
 * 行维度映射：业务描述（分类别）→ { 分类, 管报名称 }
 * 仅特殊项需要维护；未在映射内的业务描述兜底为 其他/其他（与目标 Excel 一致）。
 */
const DY_BIZ_DESC_MAP: Record<string, DyBizDescMeta> = {
  '上门取件-支付快递费': { category: '平台费用', mgmtName: '运费争议赔付' },
  消费者赔付: { category: '平台费用', mgmtName: '赔付' },
  退换货运费险: { category: '平台费用', mgmtName: '运费险' },
  评价有礼: { category: '推广费用', mgmtName: '评价有礼' },
};

/** 取行业维度元信息（未映射兜底 其他/其他） */
export function dyBizDescOf(name?: string): DyBizDescMeta {
  return (name && DY_BIZ_DESC_MAP[name]) || { category: '其他', mgmtName: '其他' };
}

/**
 * 列维度映射：动态明细列名 → { 费用分类, 管报名称 }
 *  - 订单净收入 → 其他/其他
 *  - 平台服务费 → 平台费用/平台服务费
 *  - 佣金 / 服务商佣金 / 招商服务费 / 站外推广费 → 推广费用/同列名
 * 映射之外的新列（后端 details 出现新费用项）不显示组头（留空）。
 */
const DY_COLUMN_META_MAP: Record<string, DyColumnMeta> = {
  订单净收入: { feeType: '其他', mgmtName: '其他' },
  平台服务费: { feeType: '平台费用', mgmtName: '平台服务费' },
  佣金: { feeType: '推广费用', mgmtName: '佣金' },
  服务商佣金: { feeType: '推广费用', mgmtName: '服务商佣金' },
  招商服务费: { feeType: '推广费用', mgmtName: '招商服务费' },
  站外推广费: { feeType: '推广费用', mgmtName: '站外推广费' },
};

/** 取列维度元信息（未映射兜底为空字符串，即不显示组头） */
export function dyColumnMetaOf(name: string): DyColumnMeta {
  return DY_COLUMN_META_MAP[name] || { feeType: '', mgmtName: '' };
}

/** 行维度「分类」的固定排序（与支付宝费用统计口径一致）：推广费用 → 平台费用 → 其他 */
const DY_CATEGORY_ORDER: Record<string, number> = {
  推广费用: 0,
  平台费用: 1,
  其他: 2,
};

/**
 * 明细行按「分类」分组排序（稳定排序，组内保持接口原序），
 * 使相同 分类/管报名称 的行相邻，从而支持 rowSpan 合并展示。
 * 仅影响展示顺序，不影响各列合计 / 余额对账等求和口径。
 */
export function sortDyRowsByCategory<T extends { name?: string }>(data: T[]): T[] {
  return data
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (DY_CATEGORY_ORDER[dyBizDescOf(a.row.name).category] ?? 3) -
          (DY_CATEGORY_ORDER[dyBizDescOf(b.row.name).category] ?? 3) || a.index - b.index,
    )
    .map((it) => it.row);
}
