import React, { useState } from 'react';
import dayjs from 'dayjs';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';
import BatchExportButton from './BatchExportButton';

/**
 * 拼多多 - 渠道推广费用
 *
 * 与 Base 共享搜索栏、表格、统计弹窗等通用逻辑；
 * 额外在操作区追加「导出当前选中月份的所有店铺统计费用」按钮，
 * 把全渠道店铺的统计结果打成 zip 下载。
 */
const PddExtendCostPanel: React.FC = () => {
  // 跟踪 Base 搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );

  return (
    <ChannelExtendCostBase
      channel="拼多多"
      onYearMonthChange={setExportYearMonth}
      extraActions={
        <BatchExportButton channel="拼多多" yearMonth={exportYearMonth} />
      }
    />
  );
};

export default PddExtendCostPanel;
