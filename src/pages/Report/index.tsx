import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import ManagementReportTab from './management-report';
import CostTab from './cost';
import ChannelExtendCostTab from './channel-extend-cost';
import ChannelBillsTab from './channel-bills';

const TAB_KEY = 'report_active_tab';

const Report: React.FC = () => {
  // 从 localStorage 读取上次激活的 tab，刷新后保持不变
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(TAB_KEY) || 'management-report';
  });

  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  const tabItems = [
    { key: 'management-report', label: '管报数据查询' },
    { key: 'cost', label: '成本核算' },
    { key: 'channel-extend-cost', label: '渠道推广费用' },
    { key: 'channel-bills', label: '各渠道月账单' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'management-report':
        return <ManagementReportTab />;
      case 'cost':
        return <CostTab />;
      case 'channel-extend-cost':
        return <ChannelExtendCostTab />;
      case 'channel-bills':
        return <ChannelBillsTab />;
      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
        size="large"
        type="card"
      />
      {renderTabContent()}
    </PageContainer>
  );
};

export default Report;
