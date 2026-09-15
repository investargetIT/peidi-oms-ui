import React, { useState } from 'react';
import dayjs from 'dayjs';
import XhsExtendCostBase from './XhsExtendCostBase';
import XhsBatchExportButton from './BatchExportButton';

/**
 * 小红书 - 渠道推广费用
 *
 * 小红书已 fork 出独立的面板实现（XhsExtendCostBase），与共享 Base 解耦。
 * 「费用统计」走 /xhs-cost-stat；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 */
const XhsExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <XhsExtendCostBase
      channel="小红书"
      onYearMonthChange={setExportYearMonth}
      extraActions={<XhsBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default XhsExtendCostPanel;
