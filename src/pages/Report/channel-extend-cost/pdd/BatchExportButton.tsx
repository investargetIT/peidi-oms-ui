import React from 'react';
import BatchExportButton, { fetchChannelShops } from '../shared/BatchExportButton';
import {
  renderGenericShopStatExcel,
  renderGenericEmptyStatExcel,
} from '../shared/genericStatExport';

export interface BatchExportButtonProps {
  /** 渠道名，如「拼多多」 */
  channel: string;
  /** 当前选中的年月（来自 Base 搜索栏），格式 yyyy-MM */
  yearMonth: string;
}

/**
 * 拼多多 TAB - 导出当前选中月份的所有店铺统计费用
 *
 * 通用壳见 shared/BatchExportButton；本文件只提供拼多多的取数/渲染逻辑：
 * 每家店调 getCostCategoryStat + 余额接口 -> buildStatResult -> renderStatExcel
 * （与「费用统计」弹窗同一套口径），全部打包成 zip 下载。
 */
const PddBatchExportButton: React.FC<BatchExportButtonProps> = ({ channel, yearMonth }) => (
  <BatchExportButton
    channel={channel}
    yearMonth={yearMonth}
    fetchShops={() => fetchChannelShops(channel)}
    renderShopExcel={(shop, shopName) =>
      renderGenericShopStatExcel({
        shopId: shop.id as number,
        shopName,
        yearMonth,
        channel,
      })
    }
    renderEmptyExcel={(shop, shopName) =>
      renderGenericEmptyStatExcel({ shopName, yearMonth, channel })
    }
    descriptionLines={[
      '· 每店一个 Excel，含 2 个 Sheet：汇总校验 + 业务编码明细',
      '· 样式尽量还原前端弹窗（合并单元格、底色、加粗、校验列染色）',
      '· 失败的店铺会写入 zip 内的 _失败明细.txt',
    ]}
  />
);

export default PddBatchExportButton;
