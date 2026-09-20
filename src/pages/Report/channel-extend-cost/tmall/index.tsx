import React, { useState } from 'react';
import dayjs from 'dayjs';
import TmallExtendCostBase from './TmallExtendCostBase';
import TmallBatchExportButton from './BatchExportButton';

/**
 * 天猫（天猫聚合） - 渠道推广费用
 *
 * 已 fork 出独立的面板实现（TmallExtendCostBase），与共享 Base 解耦；
 * 「费用统计」接口与支付宝一致（POST /bill/zfb/detail-summary），
 * 仅渠道参数 channel="天猫" 不同。
 *
 * 批量导出同样与支付宝一致（每店一个 Excel：天猫余额对账 + 账单明细汇总），
 * 把全店铺的统计结果打成 zip 下载。
 */
const TmallExtendCostPanel: React.FC = () => {
  // 跟踪 Base 搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <TmallExtendCostBase
      channel="天猫"
      onYearMonthChange={setExportYearMonth}
      extraActions={<TmallBatchExportButton yearMonth={exportYearMonth} />}
    />
  );
};

export default TmallExtendCostPanel;
