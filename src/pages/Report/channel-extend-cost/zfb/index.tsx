import React from 'react';
import ZfbExtendCostBase from './ZfbExtendCostBase';

/**
 * 支付宝 - 渠道推广费用
 *
 * 支付宝已 fork 出独立的面板实现（ZfbExtendCostBase），与共享 Base 解耦。
 * 当前逻辑与 Base 一致，后续支付宝专属逻辑（业务编码分类、汇总口径、
 * 统计接口等）直接在 ./ZfbExtendCostBase 里改，不影响其他渠道。
 *
 * 列表数据走 /oms/finance/channel-extend-cost/group/page，
 * 后端会按 channel="支付宝" 过滤返回。
 */
const ZfbExtendCostPanel: React.FC = () => {
  return <ZfbExtendCostBase channel="支付宝" />;
};

export default ZfbExtendCostPanel;
