import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import PddExtendCostPanel from './pdd';
import TmallExtendCostPanel from './tmall';
import DyExtendCostPanel from './dy';
import JdExtendCostPanel from './jd';

const SUB_TAB_KEY = 'channel_extend_cost_sub_tab';

/**
 * 渠道推广费用 - 一级 Tab
 *
 * 参考 channel-bills 的结构，按渠道拆分子模块（拼多多/天猫/抖音/京东）。
 * 4 个渠道当前共用 ../shared/ChannelExtendCostBase 实现，仅 channel 名称不同。
 * 后续如果某个渠道有独立的业务差异，可在该渠道目录下 fork 一份独立实现。
 */
const ChannelExtendCostTab: React.FC = () => {
  // 当前激活的子 tab：pdd / tmall / dy / jd
  const [subTab, setSubTab] = useState<string>(() => {
    return localStorage.getItem(SUB_TAB_KEY) || 'pdd';
  });

  useEffect(() => {
    localStorage.setItem(SUB_TAB_KEY, subTab);
  }, [subTab]);

  const subTabItems = [
    { key: 'pdd', label: '拼多多' },
    { key: 'tmall', label: '天猫' },
    { key: 'dy', label: '抖音' },
    { key: 'jd', label: '京东' },
  ];

  const renderSubTabContent = () => {
    switch (subTab) {
      case 'pdd':
        return <PddExtendCostPanel />;
      case 'tmall':
        return <TmallExtendCostPanel />;
      case 'dy':
        return <DyExtendCostPanel />;
      case 'jd':
        return <JdExtendCostPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      <Tabs
        activeKey={subTab}
        onChange={setSubTab}
        items={subTabItems}
        style={{ marginBottom: 16 }}
        type="card"
      />
      {renderSubTabContent()}
    </>
  );
};

export default ChannelExtendCostTab;
