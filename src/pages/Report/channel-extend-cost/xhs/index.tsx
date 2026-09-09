import React from 'react';
import XhsExtendCostBase from './XhsExtendCostBase';

/**
 * 小红书 - 渠道推广费用
 *
 * 小红书已 fork 出独立的面板实现（XhsExtendCostBase），与共享 Base 解耦。
 * 当前「费用统计」沿用抖音的逻辑（走 /dy-cost-stat），后续小红书专属逻辑
 * （统计接口、汇总口径等）直接在 ./XhsExtendCostBase 里改，不影响其他渠道。
 */
const XhsExtendCostPanel: React.FC = () => {
  return <XhsExtendCostBase channel="小红书" />;
};

export default XhsExtendCostPanel;
