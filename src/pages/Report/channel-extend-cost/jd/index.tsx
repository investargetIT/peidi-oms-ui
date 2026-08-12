import React from 'react';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';

/**
 * 京东 - 渠道推广费用
 *
 * 当前与 Base 实现完全一致，后续如果发现京东有特殊的业务编码分类
 * 或汇总逻辑，可以在这里 fork Base 实现一份独立的 panel。
 */
const JdExtendCostPanel: React.FC = () => {
  return <ChannelExtendCostBase channel="京东" />;
};

export default JdExtendCostPanel;
