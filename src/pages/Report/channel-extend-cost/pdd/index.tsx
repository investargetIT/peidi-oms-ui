import React from 'react';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';

/**
 * 拼多多 - 渠道推广费用
 *
 * 当前与 Base 实现完全一致，后续如果发现拼多多有特殊的业务编码分类
 * 或汇总逻辑，可以在这里 fork Base 实现一份独立的 panel。
 */
const PddExtendCostPanel: React.FC = () => {
  return <ChannelExtendCostBase channel="拼多多" />;
};

export default PddExtendCostPanel;
