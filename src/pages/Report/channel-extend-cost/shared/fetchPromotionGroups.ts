import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { groupPromotionRows, splitStatData, type PromotionFeeGroup } from '../common/promotionFee';

export interface FetchPromotionGroupsArgs {
  shopId?: number | null;
  yearMonth: string;
  /** 推广费来源渠道：拼多多 / 抖音 / 京东 / 支付宝（天猫推广费走支付宝） */
  channel: string;
}

/**
 * 批量导出用：取某店铺某月的推广费分组数据。
 * 失败/无数据统一返回空数组，不影响该店其它 Sheet 的导出。
 */
export async function fetchPromotionGroups(
  args: FetchPromotionGroupsArgs,
): Promise<PromotionFeeGroup[]> {
  const { shopId, yearMonth, channel } = args;
  if (shopId === undefined || shopId === null || !yearMonth) return [];
  try {
    const res = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth, channel });
    if (res.code !== 200) return [];
    const { promotionRows } = splitStatData(res.data || []);
    return groupPromotionRows(promotionRows);
  } catch (error) {
    console.warn('批量导出获取推广费失败（忽略，不影响其它 Sheet）', error);
    return [];
  }
}
