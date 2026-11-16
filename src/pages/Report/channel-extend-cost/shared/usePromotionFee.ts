import { useCallback, useRef, useState } from 'react';
import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { groupPromotionRows, splitStatData, type PromotionFeeGroup } from '../common/promotionFee';

/**
 * 「各平台推广费」取数 hook（抖音 / 京东 / 天猫 / 支付宝 等独立面板共用）
 *
 * 数据来源：GET /finance/channel-extend-cost/cost-category-stat
 *   - channel 决定推广费来源：pdd/dy/jd/zfb
 *   - 天猫推广费挂在支付宝账单上，天猫面板必须传 channel='zfb' / '支付宝'
 *   - 传 tm/天猫 或不传不会返回推广费
 *
 * 推广费只是弹窗里的补充区块：失败时只 console.warn，不影响其它统计展示。
 */
export interface LoadPromotionFeeArgs {
  shopId?: number | null;
  yearMonth?: string | null;
  /** 推广费来源渠道（中文或英文均可，见接口文档） */
  channel: string;
}

export function usePromotionFee() {
  const [promotionGroups, setPromotionGroups] = useState<PromotionFeeGroup[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const requestSeq = useRef(0);

  const resetPromotionFee = useCallback(() => {
    requestSeq.current += 1;
    setPromotionGroups([]);
    setPromotionLoading(false);
  }, []);

  const loadPromotionFee = useCallback(async (args: LoadPromotionFeeArgs) => {
    const { shopId, yearMonth, channel } = args;
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setPromotionGroups([]);

    if (shopId === undefined || shopId === null || !yearMonth) {
      setPromotionLoading(false);
      return;
    }

    setPromotionLoading(true);
    try {
      const res = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth, channel });
      if (requestSeq.current !== seq) return;
      if (res.code !== 200) return;
      const { promotionRows } = splitStatData(res.data || []);
      setPromotionGroups(groupPromotionRows(promotionRows));
    } catch (error) {
      if (requestSeq.current === seq) {
        console.warn('获取推广费失败（忽略，不影响其它统计）', error);
      }
    } finally {
      if (requestSeq.current === seq) setPromotionLoading(false);
    }
  }, []);

  return { promotionGroups, promotionLoading, loadPromotionFee, resetPromotionFee };
}
