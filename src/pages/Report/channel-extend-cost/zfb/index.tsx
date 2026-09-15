import React, { useState } from 'react';
import dayjs from 'dayjs';
import ZfbExtendCostBase from './ZfbExtendCostBase';
import ZfbBatchExportButton from './BatchExportButton';

/**
 * 支付宝 - 渠道推广费用
 *
 * 支付宝已 fork 出独立的面板实现（ZfbExtendCostBase），与共享 Base 解耦。
 * 「费用统计」走 /bill/zfb/detail-summary（需要记录里的 financeBillConfigId）；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 *
 * 列表数据走 /oms/finance/channel-extend-cost/group/page，
 * 后端会按 channel="支付宝" 过滤返回。
 */
const ZfbExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <ZfbExtendCostBase
      channel="支付宝"
      onYearMonthChange={setExportYearMonth}
      extraActions={<ZfbBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default ZfbExtendCostPanel;
