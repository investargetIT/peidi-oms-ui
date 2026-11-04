import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { buildStatResult } from '../common/statBuilder';
import { renderStatExcel } from '../common/excelRenderer';
import { fetchBillBalances } from './billBalanceFetcher';

/**
 * 渠道推广费用 - 通用渠道（拼多多 / 天猫）单店统计 Excel 生成
 *
 * 与 ChannelExtendCostBase 的「站内外推广费统计」弹窗同一套口径：
 *   1. getCostCategoryStat 拉取业务编码明细；
 *   2. 余额取「各渠道月账单」：期初 = beginningBalance（上月余额），期末 = endingBalance；
 *   3. buildStatResult 组装 + renderStatExcel 渲染成 Excel（汇总校验 + 业务编码明细 2 个 Sheet）。
 *
 * 弹窗和「批量导出 Excel」共用此结果，保证两边展示完全一致。
 */
export async function renderGenericShopStatExcel(args: {
  shopId: number;
  shopName: string;
  yearMonth: string;
  channel: string;
  financeBillConfigId?: number | null;
}): Promise<Blob> {
  const { shopId, shopName, yearMonth, channel, financeBillConfigId } = args;

  // 1. 先拉取分类统计数据
  const statRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth, channel });
  if (statRes.code !== 200) {
    throw new Error('getCostCategoryStat 返回非 200');
  }
  const rawStatData = statRes.data || [];

  // 2. 过滤掉旧接口内联的余额项（PDD_BALANCE / PDD_LAST_BALANCE），余额改由月账单接口提供
  const statData = rawStatData.filter(
    (it: any) => it.businessCode !== 'PDD_BALANCE' && it.businessCode !== 'PDD_LAST_BALANCE',
  );

  // 3. 余额：各渠道月账单的期初 / 期末，取不到即为 null
  const { beginningBalance, endingBalance } = await fetchBillBalances({
    yearMonth,
    channel,
    shopId,
    financeBillConfigId,
  });

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
