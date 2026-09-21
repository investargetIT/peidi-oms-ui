import React, { useState } from 'react';
import dayjs from 'dayjs';
import WxExtendCostBase from './WxExtendCostBase';
import WxBatchExportButton from './BatchExportButton';

/**
 * 微信 - 渠道推广费用
 *
 * 微信已 fork 出独立的面板实现（WxExtendCostBase），与共享 Base 解耦，
 * 结构参考快手 fork 出来后再按微信流水汇总接口改造。
 * 「费用统计」走 /wx-cost-summary；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 */
const WxExtendCostPanel: React.FC = () => {
  // 跟踪搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <WxExtendCostBase
      channel="微信"
      onYearMonthChange={setExportYearMonth}
      extraActions={<WxBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default WxExtendCostPanel;
