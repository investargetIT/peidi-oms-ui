import React, { useState } from 'react';
import dayjs from 'dayjs';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';
import BatchExportButton, { fetchChannelShops } from '../shared/BatchExportButton';
import { renderGenericShopStatExcel } from '../shared/genericStatExport';

/**
 * 天猫 - 渠道推广费用
 *
 * 与 Base 共享搜索栏、表格、统计弹窗等通用逻辑；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载（口径与拼多多一致）。
 */
const TmallExtendCostPanel: React.FC = () => {
  // 跟踪 Base 搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <ChannelExtendCostBase
      channel="天猫"
      onYearMonthChange={setExportYearMonth}
      extraActions={
        <BatchExportButton
          channel="天猫"
          yearMonth={exportYearMonth}
          fetchShops={() => fetchChannelShops('天猫')}
          renderShopExcel={(shop, shopName) =>
            renderGenericShopStatExcel({
              shopId: shop.id as number,
              shopName,
              yearMonth: exportYearMonth,
              channel: '天猫',
            })
          }
          descriptionLines={[
            '· 每店一个 Excel，含 2 个 Sheet：汇总校验 + 业务编码明细',
            '· 样式尽量还原前端弹窗（合并单元格、底色、加粗、校验列染色）',
            '· 失败的店铺会写入 zip 内的 _失败明细.txt',
          ]}
        />
      }
    />
  );
};

export default TmallExtendCostPanel;
