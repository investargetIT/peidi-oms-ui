import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import ZfbExtendCostPanel from './zfb';
import PddExtendCostPanel from './pdd';
import DyExtendCostPanel from './dy';
import TmallExtendCostPanel from './tmall';
import XhsExtendCostPanel from './xhs';
import JdExtendCostPanel from './jd';

const SUB_TAB_KEY = 'channel_extend_cost_sub_tab';
// v2 迁移标记：v2 把默认 tab 从 'pdd' 改成 'zfb'，老用户清掉一次 saved value 让其回到新默认
const MIGRATION_FLAG_KEY = 'channel_extend_cost_sub_tab_v2_migrated';

/**
 * 渠道推广费用 - 一级 Tab
 *
 * 6 个渠道（支付宝/拼多多/抖音/天猫/小红书/京东）按统一顺序排列。
 * 各渠道共用 ../shared/ChannelExtendCostBase 实现，仅 channel 名称不同。
 * 后续如果某个渠道有独立的业务差异，可在该渠道目录下 fork 一份独立实现。
 */
const ChannelExtendCostTab: React.FC = () => {
  // 当前激活的子 tab：zfb / pdd / dy / tmall / xhs / jd
  // 懒加载里做一次性迁移：v2 升级时清掉旧 saved value，让老用户回到新默认 'zfb'（首个 tab）
  // 用版本标记 key 防重复执行；迁移在首次渲染前完成，不会出现"先看到旧 tab 再切"的闪烁
  const [subTab, setSubTab] = useState<string>(() => {
    if (!localStorage.getItem(MIGRATION_FLAG_KEY)) {
      localStorage.removeItem(SUB_TAB_KEY);
      localStorage.setItem(MIGRATION_FLAG_KEY, '1');
      return 'zfb';
    }
    return localStorage.getItem(SUB_TAB_KEY) || 'zfb';
  });

  useEffect(() => {
    localStorage.setItem(SUB_TAB_KEY, subTab);
  }, [subTab]);

  const subTabItems = [
    { key: 'zfb', label: '支付宝' },
    { key: 'pdd', label: '拼多多' },
    { key: 'dy', label: '抖音' },
    { key: 'tmall', label: '天猫' },
    { key: 'xhs', label: '小红书' },
    { key: 'jd', label: '京东' },
  ];

  const renderSubTabContent = () => {
    switch (subTab) {
      case 'zfb':
        return <ZfbExtendCostPanel />;
      case 'pdd':
        return <PddExtendCostPanel />;
      case 'dy':
        return <DyExtendCostPanel />;
      case 'tmall':
        return <TmallExtendCostPanel />;
      case 'xhs':
        return <XhsExtendCostPanel />;
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
