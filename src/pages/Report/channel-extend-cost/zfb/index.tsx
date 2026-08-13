import React from 'react';

/**
 * 支付宝 - 渠道推广费用
 *
 * TODO: 内容待补
 * 后续可参考 jd/index.tsx 的实现：复用 ../shared/ChannelExtendCostBase，
 * 通过 channel="支付宝" 调 /oms/finance/channel-extend-cost/group/page；
 * 如果有"费用统计"自定义需求，再加 onCustomStatClick 拦截。
 */
const ZfbExtendCostPanel: React.FC = () => {
  return (
    <div
      style={{
        padding: '60px 0',
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
      }}
    >
      支付宝 - 渠道推广费用：敬请期待
    </div>
  );
};

export default ZfbExtendCostPanel;
