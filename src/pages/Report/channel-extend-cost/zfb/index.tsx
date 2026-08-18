import React from 'react';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';

/**
 * 支付宝 - 渠道推广费用
 *
 * 当前与 Base 实现完全一致，后续如果发现支付宝有特殊的业务编码分类
 * 或汇总逻辑（比如"费用统计"要调自己的接口），可以在这里 fork Base
 * 实现一份独立的 panel，并加 onCustomStatClick 拦截。
 *
 * 列表数据走 /oms/finance/channel-extend-cost/group/page，
 * 后端会按 channel="支付宝" 过滤返回。
 */
const ZfbExtendCostPanel: React.FC = () => {
  return <ChannelExtendCostBase channel="支付宝" />;
};

export default ZfbExtendCostPanel;
