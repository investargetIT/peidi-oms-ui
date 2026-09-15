import React from 'react';
import BatchExportButton from '../shared/BatchExportButton';
import { fetchShopBalances } from '../shared/balanceFetcher';
import ChannelExtendCostApi from '@/services/channelExtendCostApi';
import { buildZfbStat } from './batchStatBuilder';
import { renderZfbStatExcel } from './batchExcelRenderer';

export interface BatchExportButtonProps {
  /** 当前选中的年月（来自 Base 搜索栏），格式 yyyy-MM */
  yearMonth: string;
}

/**
 * 支付宝 TAB - 导出当前选中月份的所有店铺统计费用
 *
 * 通用壳见 shared/BatchExportButton；本文件只提供支付宝的取数/渲染逻辑。
 *
 * 注意：支付宝费用统计接口 POST /bill/zfb/detail-summary 需要
 * financeBillConfigId（账单配置ID），该 ID 只在 /group/page 的返回里有，
 * 因此这里不按店铺列表导出，而是拉取 group/page 当前月份的全部记录
 * （每条记录含 shopId / wdtName / financeBillConfigId）逐条导出。
 *
 * 每条记录调 getZfbCostStat（账单明细汇总）+ 余额接口
 * -> buildZfbStat 按弹窗相同口径算出余额对账 + 账单明细汇总
 * -> renderZfbStatExcel 生成 Excel -> 全部打包成 zip 下载。
 *
 * 失败处理：失败的店铺仍生成空模板，店名 + 失败原因写入 zip 内的 _失败明细.txt。
 */
const ZfbBatchExportButton: React.FC<BatchExportButtonProps> = ({ yearMonth }) => (
  <BatchExportButton
    channel="支付宝"
    yearMonth={yearMonth}
    fetchShops={async () => {
      // 支付宝需要 financeBillConfigId，从 group/page 拉全量记录（按当前月份过滤）
      const res = await ChannelExtendCostApi.getGroupPage({
        channel: '支付宝',
        yearMonth,
        pageNum: 1,
        pageSize: 500,
      });
      if (res.code !== 200) {
        throw new Error('获取店铺列表失败');
      }
      return res.data.records || [];
    }}
    renderShopExcel={async (record, shopName) => {
      const financeBillConfigId = record.financeBillConfigId;
      const shopId = record.shopId as number | undefined;
      if (!financeBillConfigId) {
        throw new Error('缺少账单配置ID，无法查询');
      }
      // 1. 明细/汇总：新接口 /bill/zfb/detail-summary
      const res = await ChannelExtendCostApi.getZfbCostStat({
        financeBillConfigId,
        billDate: yearMonth,
      });
      if (res.code !== 200) {
        throw new Error('getZfbCostStat 返回非 200');
      }
      const zfbStatData = res.data || null;
      // 2. 余额对账：老接口 /cost-category-stat 内联余额项（无则回退 queryEndingBalance）
      let beginningBalance: number | null = null;
      let endingBalance: number | null = null;
      if (shopId !== undefined && shopId !== null) {
        const balances = await fetchShopBalances(shopId, yearMonth);
        beginningBalance = balances.beginningBalance;
        endingBalance = balances.endingBalance;
      }
      const statResult = buildZfbStat({
        zfbStatData,
        beginningBalance,
        endingBalance,
        yearMonth,
        shopName,
      });
      return renderZfbStatExcel(statResult);
    }}
    renderEmptyExcel={async (_shop, shopName) => {
      const emptyStat = buildZfbStat({
        zfbStatData: null,
        beginningBalance: null,
        endingBalance: null,
        yearMonth,
        shopName,
      });
      return renderZfbStatExcel(emptyStat);
    }}
    descriptionLines={[
      '· 每店一个 Excel，含 2 个 Sheet：支付宝余额对账 + 账单明细汇总',
      '· 口径与前端弹窗完全一致（余额对账按「收款/提现/结息」分类归类）',
      '· 失败的店铺会生成空模板，错误信息写入 zip 内的 _失败明细.txt',
    ]}
  />
);

export default ZfbBatchExportButton;
