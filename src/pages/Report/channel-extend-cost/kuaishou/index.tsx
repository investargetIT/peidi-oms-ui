import React, { useState } from 'react';
import dayjs from 'dayjs';
import KuaishouExtendCostBase from './KuaishouExtendCostBase';
import KuaishouBatchExportButton from './BatchExportButton';

/**
 * 快手 - 渠道推广费用
 *
 * 快手已 fork 出独立的面板实现（KuaishouExtendCostBase），与共享 Base 解耦，
 * 结构参考小红书。
 * 「费用统计」走 /kuaishou-cost-stat；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 */
const KuaishouExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <KuaishouExtendCostBase
      channel="快手"
      onYearMonthChange={setExportYearMonth}
      extraActions={<KuaishouBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default KuaishouExtendCostPanel;
