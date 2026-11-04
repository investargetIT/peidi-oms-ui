import ManagementReportApi, { type FinanceZfbBillInfoVo } from '@/services/managementReportApi';

/**
 * 渠道推广费用 -「费用统计」余额取数（统一口径）
 *
 * 口径（与「各渠道月账单」完全一致）：
 *   期末余额 = 月账单记录的 endingBalance
 *   上月余额 = 月账单记录的 beginningBalance（即期初余额）
 *
 * 实现说明（2026-11 线上接口实测）：
 *   1. /finance/zfb-bill/page 传 platform / channel / shopName（中文值）会直接 500，
 *      传 shopId 会被后端忽略；只有 billDate + financeBillConfigId 能可靠过滤。
 *      因此这里按「账单月份拉全量 → 本地按 financeBillConfigId / shopId + platform 匹配」。
 *   2. 同一月份的结果做内存缓存，批量导出逐店调用时只会真正请求一次。
 *   3. 取不到（账单未生成 / 未填余额）一律返回 null，不回退旧接口。
 */

const PAGE_SIZE = 500;
const MAX_PAGES = 20;

/** 月份 -> 该月全部账单记录（Promise 缓存，失败自动清除） */
const monthCache = new Map<string, Promise<FinanceZfbBillInfoVo[]>>();

/** 渠道（渠道推广费用 tab 的 channel） -> 月账单 platform 值 */
export function toBillPlatform(channel?: string | null): string {
  if (!channel) return '';
  // 微盟在月账单里 platform 同为「微信」，靠 shopId 区分
  if (channel === '微盟') return '微信';
  return channel;
}

/** 清空缓存（切换月份/手动刷新时可用） */
export function clearBillBalanceCache() {
  monthCache.clear();
}

async function fetchMonthBills(yearMonth: string): Promise<FinanceZfbBillInfoVo[]> {
  const rows: FinanceZfbBillInfoVo[] = [];
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum += 1) {
    // 注意：这里只能传 billDate，传 platform / channel / shopId 会报 500 或被忽略
    const res = await ManagementReportApi.getZfbBillPage({
      pageNum,
      pageSize: PAGE_SIZE,
      billDate: yearMonth,
    });
    if (res.code !== 200) {
      throw new Error(res.msg || '查询各渠道月账单失败');
    }
    const records = res.data?.records || [];
    rows.push(...records);
    const total = res.data?.total || 0;
    if (records.length === 0 || rows.length >= total) break;
  }
  return rows;
}

function loadMonthBills(yearMonth: string): Promise<FinanceZfbBillInfoVo[]> {
  let promise = monthCache.get(yearMonth);
  if (!promise) {
    promise = fetchMonthBills(yearMonth).catch((error) => {
      monthCache.delete(yearMonth);
      throw error;
    });
    monthCache.set(yearMonth, promise);
  }
  return promise;
}

export interface BillBalances {
  /** 上月余额（= 各渠道月账单的期初余额 beginningBalance） */
  beginningBalance: number | null;
  /** 本月期末余额（= 各渠道月账单的期末余额 endingBalance） */
  endingBalance: number | null;
}

const EMPTY: BillBalances = { beginningBalance: null, endingBalance: null };

/**
 * 按「月份 + 渠道 + 店铺」取各渠道月账单里的期初 / 期末余额。
 * 取不到返回 null（不抛错，调用方直接展示空值）。
 */
export async function fetchBillBalances(args: {
  yearMonth?: string | null;
  channel?: string | null;
  shopId?: number | null;
  /** 账单配置ID（/group/page 记录里有，优先用它精确匹配） */
  financeBillConfigId?: number | null;
}): Promise<BillBalances> {
  const { yearMonth, channel, shopId, financeBillConfigId } = args;
  if (!yearMonth) return EMPTY;

  let rows: FinanceZfbBillInfoVo[];
  try {
    rows = await loadMonthBills(yearMonth);
  } catch (error) {
    console.warn(`获取 ${yearMonth} 各渠道月账单失败，余额按空值处理`, error);
    return EMPTY;
  }

  const platform = toBillPlatform(channel);

  let row: FinanceZfbBillInfoVo | undefined;
  if (financeBillConfigId !== undefined && financeBillConfigId !== null) {
    row = rows.find((it) => it.financeBillConfigId === financeBillConfigId);
  }
  if (!row && shopId !== undefined && shopId !== null) {
    const byShop = rows.filter((it) => it.shopId === shopId);
    row = byShop.find((it) => !platform || it.platform === platform);
    // platform 缺失或对不上时，若该店铺当月只有一条账单，直接用它
    if (!row && byShop.length === 1) {
      row = byShop[0];
    }
  }
  if (!row) return EMPTY;

  return {
    beginningBalance: row.beginningBalance ?? null,
    endingBalance: row.endingBalance ?? null,
  };
}
