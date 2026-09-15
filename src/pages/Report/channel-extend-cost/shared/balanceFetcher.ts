import ChannelExtendCostApi from '@/services/channelExtendCostApi';

/**
 * 渠道推广费用 - 批量导出用余额获取
 *
 * 抖音 / 小红书 / 支付宝费用统计弹窗里「上月余额 / 期末余额」的取数口径：
 *   1. 优先走老接口 GET /cost-category-stat，取内联余额项：
 *        PDD_LAST_BALANCE = 上月余额（本月期初）
 *        PDD_BALANCE      = 本月期末余额
 *   2. 接口未内联余额时回退 queryEndingBalance 两次（上月 / 当月）。
 *
 * 与弹窗 openStatModal 里的逻辑保持一致，抽出来供批量导出复用。
 */
export async function fetchShopBalances(
  shopId: number,
  yearMonth: string,
): Promise<{ beginningBalance: number | null; endingBalance: number | null }> {
  const costRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth });
  if (costRes.code !== 200) {
    throw new Error('getCostCategoryStat 返回非 200');
  }
  const rawData = costRes.data || [];

  const balanceItem = rawData.find((it: any) => it.businessCode === 'PDD_BALANCE');
  const lastBalanceItem = rawData.find((it: any) => it.businessCode === 'PDD_LAST_BALANCE');
  const hasInlineBalance = !!balanceItem || !!lastBalanceItem;

  if (hasInlineBalance) {
    const beginningBalance =
      lastBalanceItem &&
      lastBalanceItem.totalIncome !== undefined &&
      lastBalanceItem.totalIncome !== null
        ? lastBalanceItem.totalIncome
        : null;
    const endingBalance =
      balanceItem && balanceItem.totalIncome !== undefined && balanceItem.totalIncome !== null
        ? balanceItem.totalIncome
        : null;
    return { beginningBalance, endingBalance };
  }

  // 回退：queryEndingBalance 取「上月末 = 期初」和「本月末」
  const [py, pm] = yearMonth.split('-').map(Number);
  const prevYear = pm === 1 ? py - 1 : py;
  const prevMonth = pm === 1 ? 12 : pm - 1;
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const [beginRes, endRes] = await Promise.all([
    ChannelExtendCostApi.queryEndingBalance({
      accountType: '期末余额',
      shopId,
      yearMonth: prevYearMonth,
    }),
    ChannelExtendCostApi.queryEndingBalance({
      accountType: '期末余额',
      shopId,
      yearMonth,
    }),
  ]);

  const beginningBalance =
    beginRes.code === 200 && beginRes.data && beginRes.data.incomeAmount !== undefined
      ? beginRes.data.incomeAmount
      : null;
  const endingBalance =
    endRes.code === 200 && endRes.data && endRes.data.incomeAmount !== undefined
      ? endRes.data.incomeAmount
      : null;
  return { beginningBalance, endingBalance };
}
