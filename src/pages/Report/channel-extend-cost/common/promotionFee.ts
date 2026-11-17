import type { FinanceCostCategoryStatVo } from '@/services/channelExtendCostApi';

/**
 * 渠道推广费用 - 「各平台推广费」解析工具
 *
 * 后端 GET /finance/channel-extend-cost/cost-category-stat 在原有费用分类行之后，
 * 会追加若干「推广费行」，靠 infoName 是否为 null 区分：
 *   - 原有费用分类行：infoName === null
 *   - 推广费行：infoName 不为 null，infoValue 有值（与 calculate 同值）
 *
 * ⚠️ 不依赖接口返回的数组顺序：推广费值一律按 infoName 强匹配到标准字段，
 * 列顺序也由标准字段顺序决定（接口顺序只用于「未知字段」的兜底排序）。
 *
 * 标准字段（各平台缺项就不展示该列）：
 *   上月余额 → 期末余额 → 本月收入:充值金额 → 本月支出:推广费合计
 * 展示列名按「平台 + 站内推广费用名称」取 CSV《推广费用字段展示》H / I 列：
 *   拼多多/京东 本月支出：消耗金额、天猫 本期充值/本期消耗、
 *   抖音 推广费-充值金额/推广费-非赠款消耗（见 getPromotionFieldLabel）
 * 兼容后端尚未统一的别名（实测京东仍返回 期初余额 / 本期充值 / 本期消耗）。
 *
 * 天猫多账户店通过 accountName 区分账户；accountName 为 null 视为单账户。
 * 只有 0 值的空账户已被后端剔除，不会出现在返回里。
 */

export interface PromotionFieldDef {
  /** 标准字段名（展示用） */
  name: string;
  /** 可识别的 infoName 别名（全角/半角冒号差异会在匹配时归一） */
  aliases: string[];
}

/** 标准字段定义：顺序即列顺序 */
export const PROMOTION_FIELD_DEFS: PromotionFieldDef[] = [
  { name: '上月余额', aliases: ['上月余额', '期初余额'] },
  { name: '期末余额', aliases: ['期末余额'] },
  {
    name: '本月收入:充值金额',
    aliases: ['本月收入:充值金额', '本期充值', '充值金额', '推广费-充值金额'],
  },
  {
    name: '本月支出:推广费合计',
    aliases: [
      '本月支出:推广费合计',
      // 拼多多 / 京东：本月支出：消耗金额（全角冒号由 normalizeName 归一）
      '本月支出:消耗金额',
      '本期消耗',
      '推广费合计',
      // 抖音：推广费-非赠款消耗
      '推广费-非赠款消耗',
    ],
  },
];

/** 标准字段展示顺序 */
export const PROMOTION_FIELD_ORDER: string[] = PROMOTION_FIELD_DEFS.map((def) => def.name);

const ALIAS_TO_NAME: Map<string, string> = (() => {
  const map = new Map<string, string>();
  PROMOTION_FIELD_DEFS.forEach((def) => {
    def.aliases.forEach((alias) => {
      if (!map.has(alias)) map.set(alias, def.name);
    });
  });
  return map;
})();

function normalizeName(name: string): string {
  // 全角冒号 → 半角冒号，并去掉首尾空白
  return name.trim().replace(/：/g, ':');
}

/**
 * 按 infoName 强匹配标准字段名；匹配不到返回 null（视为未知字段，原样展示）。
 */
export function resolvePromotionFieldName(infoName?: string | null): string | null {
  if (!infoName) return null;
  return ALIAS_TO_NAME.get(normalizeName(infoName)) ?? null;
}

/**
 * 「站内推广费用名称」：按平台强匹配固定名称。
 * 天猫 / 支付宝不在这里强匹配 —— 该列由接口返回（即推广费行的 accountName）。
 */
export const PLATFORM_PROMOTION_NAMES: Record<string, string> = {
  拼多多: '推广费',
  抖音: '巨量千川服务费',
  京东: '京准通',
};

/**
 * 取「站内推广费用名称」：
 *   - 拼多多 / 抖音 / 京东：固定名称（推广费 / 巨量千川服务费 / 京准通）
 *   - 天猫 / 支付宝：接口返回的 accountName，不强匹配
 *   - 其它未知平台：优先固定名称，其次 accountName
 */
export function getPromotionDisplayName(
  platform?: string | null,
  accountName?: string | null,
): string {
  if (platform === '天猫' || platform === '支付宝') return accountName ?? '';
  return PLATFORM_PROMOTION_NAMES[platform ?? ''] ?? accountName ?? '';
}

export interface PromotionFeeRow {
  /** 推广费字段名（已归一为标准字段名；未知字段保留原样） */
  infoName: string;
  /** 推广费数值（元） */
  infoValue: number;
  /** 天猫多账户时的账户名；其它为 null */
  accountName: string | null;
}

export interface PromotionFeeGroup {
  /** 分组 key（accountName 为空时用固定值） */
  key: string;
  /** 账户名；null 表示单账户 */
  accountName: string | null;
  /** infoName -> 数值（已归一为标准字段名） */
  values: Record<string, number>;
  /** 该账户下 infoName 首次出现的顺序（用于未知字段兜底排序） */
  fieldOrder: string[];
}

/** 是否为推广费行（原有行的 infoName 为 null / undefined） */
export function isPromotionRow(row: FinanceCostCategoryStatVo): boolean {
  const { infoName } = row;
  if (infoName !== null && infoName !== undefined && infoName !== '') return true;
  // 兼容：个别环境 infoName 缺失，但 businessCode 直接就是推广费字段名。
  // 注意只匹配 businessCode，不匹配 businessDesc —— 历史余额行（PDD_BALANCE）的
  // businessDesc 也是「期末余额」，匹配 desc 会把余额行误判成推广费。
  return (
    typeof row.businessCode === 'string' && resolvePromotionFieldName(row.businessCode) !== null
  );
}

/**
 * 把 cost-category-stat 的返回拆成「原有费用分类行」与「推广费行」。
 * 原有费用分类行继续走业务编码明细渲染；推广费行单独成块展示。
 */
export function splitStatData(statData: FinanceCostCategoryStatVo[]): {
  detailData: FinanceCostCategoryStatVo[];
  promotionRows: PromotionFeeRow[];
} {
  const detailData: FinanceCostCategoryStatVo[] = [];
  const promotionRows: PromotionFeeRow[] = [];
  (statData || []).forEach((row) => {
    if (isPromotionRow(row)) {
      const value =
        typeof row.infoValue === 'number'
          ? row.infoValue
          : typeof row.calculate === 'number'
          ? row.calculate
          : 0;
      const rawName = (row.infoName || row.businessCode) as string;
      promotionRows.push({
        // 按 infoName 强匹配标准字段；未知字段保留原始名称
        infoName: resolvePromotionFieldName(rawName) ?? rawName,
        infoValue: value,
        accountName: row.accountName ?? null,
      });
    } else {
      detailData.push(row);
    }
  });
  return { detailData, promotionRows };
}

/**
 * 按 accountName 分组（保持接口返回顺序）；accountName 为 null 归为单账户组。
 */
export function groupPromotionRows(rows: PromotionFeeRow[]): PromotionFeeGroup[] {
  const map = new Map<string, PromotionFeeGroup>();
  (rows || []).forEach((row) => {
    const accountName = row.accountName ?? null;
    const key = accountName === null ? '__single__' : accountName;
    let group = map.get(key);
    if (!group) {
      group = { key, accountName, values: {}, fieldOrder: [] };
      map.set(key, group);
    }
    if (!group.fieldOrder.includes(row.infoName)) {
      group.fieldOrder.push(row.infoName);
    }
    group.values[row.infoName] = row.infoValue;
  });
  return Array.from(map.values());
}

/**
 * 动态生成展示列：标准字段按固定顺序在前（仅保留实际出现的），
 * 未知字段按首次出现顺序追加在后。
 */
export function getPromotionFieldNames(groups: PromotionFeeGroup[]): string[] {
  const seen = new Set<string>();
  groups.forEach((group) => {
    group.fieldOrder.forEach((name) => seen.add(name));
  });
  const standard = PROMOTION_FIELD_ORDER.filter((name) => seen.has(name));
  const extras: string[] = [];
  groups.forEach((group) => {
    group.fieldOrder.forEach((name) => {
      if (!PROMOTION_FIELD_ORDER.includes(name) && !extras.includes(name)) {
        extras.push(name);
      }
    });
  });
  return [...standard, ...extras];
}

/** 是否有可展示的推广费数据 */
export function hasPromotionData(groups: PromotionFeeGroup[]): boolean {
  return groups.some((group) => group.fieldOrder.length > 0);
}

/** 计算余额 / 校验 用到的标准字段 */
export const PROMOTION_BALANCE_FIELDS = {
  beginning: '上月余额',
  income: '本月收入:充值金额',
  expense: '本月支出:推广费合计',
  ending: '期末余额',
} as const;

export interface PromotionBalanceResult {
  /** 计算余额 = 上月余额 + 本月收入:充值金额 - 本月支出:推广费合计（缺失项按 0） */
  calculatedBalance: number;
  /** 校验 = 计算余额 - 期末余额；接口没返回期末余额时为 null（展示 -） */
  checkDiff: number | null;
}

/**
 * 计算推广费账户的「计算余额 / 校验」。
 * 缺失字段按 0 参与计算（与站内外推广费统计的余额口径一致）；
 * 唯独期末余额缺失时不计算校验（返回 null），避免拿 0 做无意义的差异。
 */
export function computePromotionBalance(values: Record<string, number>): PromotionBalanceResult {
  const num = (name: string) => (typeof values[name] === 'number' ? values[name] : 0);
  const calculatedBalance =
    num(PROMOTION_BALANCE_FIELDS.beginning) +
    num(PROMOTION_BALANCE_FIELDS.income) -
    num(PROMOTION_BALANCE_FIELDS.expense);
  const ending = values[PROMOTION_BALANCE_FIELDS.ending];
  return {
    calculatedBalance,
    checkDiff: typeof ending === 'number' ? calculatedBalance - ending : null,
  };
}

/**
 * 「本月收入 / 本月支出」的列名口径（CSV《推广费用字段展示》H、I 列）。
 *
 * 按「平台 + 站内推广费用名称」匹配 CSV 行后取 H / I 列名：
 *   - 拼多多（推广费）：本月收入:充值金额 / 本月支出：消耗金额
 *   - 天猫（万相台无界、品销宝-明星店铺 / 品牌首推 / 品牌专区）：本期充值 / 本期消耗
 *   - 抖音（巨量千川服务费）：推广费-充值金额 / 推广费-非赠款消耗
 *   - 京东（京准通）：本月收入:充值金额 / 本月支出：消耗金额
 * 天猫 4 个账户的 H / I 列名一致，故按平台匹配即可。
 *
 * 只影响表头展示；取值仍按标准字段名归一（见 PROMOTION_FIELD_DEFS 别名）。
 */
export const PROMOTION_INCOME_EXPENSE_LABELS: Record<string, { income: string; expense: string }> =
  {
    拼多多: { income: '本月收入:充值金额', expense: '本月支出：消耗金额' },
    天猫: { income: '本期充值', expense: '本期消耗' },
    抖音: { income: '推广费-充值金额', expense: '推广费-非赠款消耗' },
    京东: { income: '本月收入:充值金额', expense: '本月支出：消耗金额' },
  };

/**
 * 取列名：本月收入 / 本月支出按平台映射到 CSV 口径，其它字段原样返回。
 */
export function getPromotionFieldLabel(field: string, platform?: string | null): string {
  const labels = platform ? PROMOTION_INCOME_EXPENSE_LABELS[platform] : undefined;
  if (!labels) return field;
  if (field === PROMOTION_BALANCE_FIELDS.income) return labels.income;
  if (field === PROMOTION_BALANCE_FIELDS.expense) return labels.expense;
  return field;
}
