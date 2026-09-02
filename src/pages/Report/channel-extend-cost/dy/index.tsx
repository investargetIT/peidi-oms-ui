import React from 'react';
import DyExtendCostBase from './DyExtendCostBase';

/**
 * 抖音 - 渠道推广费用
 *
 * 抖音已 fork 出独立的面板实现（DyExtendCostBase），与共享 Base 解耦。
 * 当前与 Base 逻辑一致，后续抖音专属逻辑（业务编码分类、汇总口径、
 * 统计接口等）直接在 ./DyExtendCostBase 里改，不影响其他渠道。
 */
const DyExtendCostPanel: React.FC = () => {
  return <DyExtendCostBase channel="抖音" />;
};

export default DyExtendCostPanel;
