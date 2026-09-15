import React, { useState } from 'react';
import dayjs from 'dayjs';
import DyExtendCostBase from './DyExtendCostBase';
import DyBatchExportButton from './BatchExportButton';

/**
 * 抖音 - 渠道推广费用
 *
 * 抖音已 fork 出独立的面板实现（DyExtendCostBase），与共享 Base 解耦。
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 * 后续抖音专属逻辑（业务编码分类、汇总口径、统计接口等）直接在
 * ./DyExtendCostBase 里改，不影响其他渠道。
 */
const DyExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <DyExtendCostBase
      channel="抖音"
      onYearMonthChange={setExportYearMonth}
      extraActions={<DyBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default DyExtendCostPanel;
