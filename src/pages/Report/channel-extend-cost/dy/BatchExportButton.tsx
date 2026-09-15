import React from 'react';
import BatchExportButton, { fetchChannelShops } from '../shared/BatchExportButton';
import { fetchShopBalances } from '../shared/balanceFetcher';
import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { buildDyStat } from './batchStatBuilder';
import { renderDyStatExcel } from './batchExcelRenderer';

export interface BatchExportButtonProps {
  /** 当前选中的年月（来自 Base 搜索栏），格式 yyyy-MM */
  yearMonth: string;
}

/**
 * 抖音 TAB - 导出当前选中月份的所有店铺统计费用
 *
 * 通用壳见 shared/BatchExportButton；本文件只提供抖音的取数/渲染逻辑：
 * 每家店调 getDyCostStat（明细）+ getCostCategoryStat/queryEndingBalance（余额）
 * -> buildDyStat 按弹窗相同口径算出余额对账 + 费用明细
 * -> renderDyStatExcel 生成 Excel -> 全部打包成 zip 下载。
 *
 * 失败处理：失败的店铺仍生成空模板，店名 + 失败原因写入 zip 内的 _失败明细.txt。
 */
const DyBatchExportButton: React.FC<BatchExportButtonProps> = ({ yearMonth }) => (
  <BatchExportButton
    channel="抖音"
    yearMonth={yearMonth}
    fetchShops={() => fetchChannelShops('抖音')}
    renderShopExcel={async (shop, shopName) => {
      const shopId = shop.id as number;
      // 1. 明细表：新接口 /dy-cost-stat
      const statRes = await ChannelExtendCostApi.getDyCostStat({ shopId, yearMonth });
      if (statRes.code !== 200) {
        throw new Error('getDyCostStat 返回非 200');
      }
      const dyStatData = statRes.data || [];
      // 2. 余额对账：老接口 /cost-category-stat 内联余额项（无则回退 queryEndingBalance）
      const balances = await fetchShopBalances(shopId, yearMonth);
      const statResult = buildDyStat({
        dyStatData,
        beginningBalance: balances.beginningBalance,
        endingBalance: balances.endingBalance,
        yearMonth,
        shopName,
      });
      return renderDyStatExcel(statResult, dyStatData);
    }}
    renderEmptyExcel={async (_shop, shopName) => {
      const emptyStat = buildDyStat({
        dyStatData: [],
        beginningBalance: null,
        endingBalance: null,
        yearMonth,
        shopName,
      });
      return renderDyStatExcel(emptyStat, []);
    }}
    descriptionLines={[
      '· 每店一个 Excel，含 2 个 Sheet：抖音余额对账 + 抖音费用明细（按业务分类）',
      '· 明细表列按接口 details 动态生成，口径与前端弹窗完全一致（含合计行）',
      '· 失败的店铺会生成空模板，错误信息写入 zip 内的 _失败明细.txt',
    ]}
  />
);

export default DyBatchExportButton;
