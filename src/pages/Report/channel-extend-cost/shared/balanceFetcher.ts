import { fetchBillBalances } from './billBalanceFetcher';

/**
 * 渠道推广费用 - 批量导出用余额获取
 *
 * 口径与「费用统计」弹窗一致：直接取「各渠道月账单」的
 *   期初余额 beginningBalance -> 上月余额
 *   期末余额 endingBalance   -> 本月期末余额
 * 取不到（账单未生成 / 未填余额）返回 null，不回退旧接口。
 */
export async function fetchShopBalances(
  shopId: number,
  yearMonth: string,
  channel: string,
  financeBillConfigId?: number | null,
): Promise<{ beginningBalance: number | null; endingBalance: number | null }> {
  return fetchBillBalances({ shopId, yearMonth, channel, financeBillConfigId });
}
