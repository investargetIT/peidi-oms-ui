import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { buildStatResult, getPrevYearMonth } from '../common/statBuilder';
import { renderStatExcel } from '../common/excelRenderer';

/**
 * 渠道推广费用 - 通用渠道（拼多多 / 天猫）单店统计 Excel 生成
 *
 * 与 ChannelExtendCostBase 的「站内外推广费统计」弹窗同一套口径：
 *   1. getCostCategoryStat 拉取业务编码明细；
 *   2. 优先取内联余额项（PDD_BALANCE / PDD_LAST_BALANCE），否则回退 queryEndingBalance；
 *   3. buildStatResult 组装 + renderStatExcel 渲染成 Excel（汇总校验 + 业务编码明细 2 个 Sheet）。
 *
 * 弹窗和「批量导出 Excel」共用此结果，保证两边展示完全一致。
 */
export async function renderGenericShopStatExcel(args: {
  shopId: number;
  shopName: string;
  yearMonth: string;
  channel: string;
}): Promise<Blob> {
  const { shopId, shopName, yearMonth, channel } = args;
  const prevYm = getPrevYearMonth(yearMonth);

  // 1. 先拉取分类统计数据
  const statRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth });
  if (statRes.code !== 200) {
    throw new Error('getCostCategoryStat 返回非 200');
  }
  const rawStatData = statRes.data || [];

  // 2. 尝试从 stat 数据末尾提取余额项（PDD_BALANCE / PDD_LAST_BALANCE）
  const balanceItem = rawStatData.find((it: any) => it.businessCode === 'PDD_BALANCE');
  const lastBalanceItem = rawStatData.find((it: any) => it.businessCode === 'PDD_LAST_BALANCE');
  const hasInlineBalance = !!balanceItem || !!lastBalanceItem;

  // 过滤掉余额项，剩下的才是业务编码明细
  const statData = rawStatData.filter(
    (it: any) => it.businessCode !== 'PDD_BALANCE' && it.businessCode !== 'PDD_LAST_BALANCE',
  );

  let beginningBalance: number | null = null;
  let endingBalance: number | null = null;

  if (hasInlineBalance) {
    // 策略 1：stat 数据里直接带余额（拼多多新接口）
    if (
      lastBalanceItem &&
      lastBalanceItem.totalIncome !== undefined &&
      lastBalanceItem.totalIncome !== null
    ) {
      beginningBalance = lastBalanceItem.totalIncome;
    }
    if (balanceItem && balanceItem.totalIncome !== undefined && balanceItem.totalIncome !== null) {
      endingBalance = balanceItem.totalIncome;
    }
  } else {
    // 策略 2：老逻辑，调两次 queryEndingBalance
    const [endingRes, beginningRes] = await Promise.all([
      ChannelExtendCostApi.queryEndingBalance({
        accountType: '期末余额',
        shopId,
        yearMonth,
      }),
      ChannelExtendCostApi.queryEndingBalance({
        accountType: '期末余额',
        shopId,
        yearMonth: prevYm,
      }),
    ]);
    endingBalance =
      endingRes.code === 200 && endingRes.data ? endingRes.data.incomeAmount ?? null : null;
    beginningBalance =
      beginningRes.code === 200 && beginningRes.data
        ? beginningRes.data.incomeAmount ?? null
        : null;
  }

  const result = buildStatResult({
    statData,
    beginningBalance,
    endingBalance,
    yearMonth,
    channel,
    shopName,
  });
  return renderStatExcel(result);
}

/**
 * 失败店铺的空模板：与弹窗同结构的空 Excel（汇总 + 明细均为空）
 */
export async function renderGenericEmptyStatExcel(args: {
  shopName: string;
  yearMonth: string;
  channel: string;
}): Promise<Blob> {
  const { shopName, yearMonth, channel } = args;
  const result = buildStatResult({
    statData: [],
    beginningBalance: null,
    endingBalance: null,
    yearMonth,
    channel,
    shopName,
  });
  return renderStatExcel(result);
}
