import React from 'react';
import BatchExportButton, { fetchChannelShops } from '../shared/BatchExportButton';
import { fetchShopBalances } from '../shared/balanceFetcher';
import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { buildWmStat } from './batchStatBuilder';
import { renderWmStatExcel } from './batchExcelRenderer';

export interface BatchExportButtonProps {
  /** 当前选中的年月（来自 Base 搜索栏），格式 yyyy-MM */
  yearMonth: string;
}

/**
 * 微盟 TAB - 导出当前选中月份的所有店铺统计费用
 *
 * 通用壳见 shared/BatchExportButton；本文件只提供微盟的取数/渲染逻辑：
 * 每家店调 getWmCostSummary（流水汇总）+ getCostCategoryStat/queryEndingBalance（余额）
 * -> buildWmStat 按弹窗相同口径算出余额对账 + 费用统计
 * -> renderWmStatExcel 生成 Excel -> 全部打包成 zip 下载。
 *
 * 失败处理：失败的店铺仍生成空模板，店名 + 失败原因写入 zip 内的 _失败明细.txt。
 */
const WmBatchExportButton: React.FC<BatchExportButtonProps> = ({ yearMonth }) => (
  <BatchExportButton
    channel="微盟"
    yearMonth={yearMonth}
    fetchShops={() => fetchChannelShops('微盟', '微信')}
    renderShopExcel={async (shop, shopName) => {
      const shopId = shop.id as number;
      // 1. 流水汇总：新接口 /wm-cost-summary
      const statRes = await ChannelExtendCostApi.getWmCostSummary({ shopId, yearMonth });
      if (statRes.code !== 200) {
        throw new Error('getWmCostSummary 返回非 200');
      }
      const wmStatData = statRes.data || [];
      // 2. 余额对账：老接口 /cost-category-stat 内联余额项（无则回退 queryEndingBalance）
      const balances = await fetchShopBalances(shopId, yearMonth, "微盟");
      const statResult = buildWmStat({
        wmStatData,
        beginningBalance: balances.beginningBalance,
        endingBalance: balances.endingBalance,
        yearMonth,
        shopName,
      });
      return renderWmStatExcel(statResult);
    }}
    renderEmptyExcel={async (_shop, shopName) => {
      const emptyStat = buildWmStat({
        wmStatData: [],
        beginningBalance: null,
        endingBalance: null,
        yearMonth,
        shopName,
      });
      return renderWmStatExcel(emptyStat);
    }}
    descriptionLines={[
      '· 每店一个 Excel，含 2 个 Sheet：微盟余额对账 + 微盟费用统计',
      '· 费用统计按 平台费用 / 其他 分类归集，口径与前端弹窗完全一致（含合计行）',
      '· 失败的店铺会生成空模板，错误信息写入 zip 内的 _失败明细.txt',
    ]}
  />
);

export default WmBatchExportButton;
