import React, { useState } from 'react';
import dayjs from 'dayjs';
import WmExtendCostBase from './WmExtendCostBase';
import WmBatchExportButton from './BatchExportButton';

/**
 * 微盟 - 渠道推广费用
 *
 * 微盟已 fork 出独立的面板实现（WmExtendCostBase），与共享 Base 解耦，
 * 结构参考快手 fork 出来后再按微盟流水汇总接口改造。
 * 「费用统计」走 /wm-cost-summary；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 */
const WmExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <WmExtendCostBase
      channel="微盟"
      onYearMonthChange={setExportYearMonth}
      extraActions={<WmBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default WmExtendCostPanel;
