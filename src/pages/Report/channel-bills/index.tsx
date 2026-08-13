import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import ZfbBillPanel from './zfb';
import TmallBillPanel from './tmall';
import PddBillPanel from './pdd';
import DyBillPanel from './dy';
import XhsBillPanel from './xhs';
import JdBillPanel from './jd';

const SUB_TAB_KEY = 'channel_bills_sub_tab';

const ChannelBillsTab: React.FC = () => {
  // 当前激活的子 tab：zfb / pdd / dy / tmall / xhs / jd
  const [billSubTab, setBillSubTab] = useState<string>(() => {
    return localStorage.getItem(SUB_TAB_KEY) || 'zfb';
  });

  useEffect(() => {
    localStorage.setItem(SUB_TAB_KEY, billSubTab);
  }, [billSubTab]);

  const billSubTabItems = [
    { key: 'zfb', label: '支付宝' },
    { key: 'pdd', label: '拼多多' },
    { key: 'dy', label: '抖音' },
    { key: 'tmall', label: '天猫' },
    { key: 'xhs', label: '小红书' },
    { key: 'jd', label: '京东' },
  ];

  const renderSubTabContent = () => {
    switch (billSubTab) {
      case 'zfb':
        return <ZfbBillPanel />;
      case 'tmall':
        return <TmallBillPanel />;
      case 'pdd':
        return <PddBillPanel />;
      case 'dy':
        return <DyBillPanel />;
      case 'xhs':
        return <XhsBillPanel />;
      case 'jd':
        return <JdBillPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      <Tabs
        activeKey={billSubTab}
        onChange={setBillSubTab}
        items={billSubTabItems}
        style={{ marginBottom: 16 }}
        type="card"
      />
      {renderSubTabContent()}
    </>
  );
};

export default ChannelBillsTab;
