import { PageContainer } from '@ant-design/pro-components';
import React, { useState } from 'react';
import { Tabs, TabsProps } from 'antd';
import { HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import PendingReview from './PendingReview';
import HistoricalRecords from './HistoricalRecords';

const InvoiceAudit: React.FC = () => {
  const [activeKey, setActiveKey] = useState('1');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabsItems: TabsProps['items'] = [
    {
      key: '1',
      label: '开票',
      children: <PendingReview key={`pending-${refreshKey}`} />,
      icon: <ClockCircleOutlined />,
    },
    {
      key: '2',
      label: '历史记录',
      children: <HistoricalRecords key={`history-${refreshKey}`} />,
      icon: <HistoryOutlined />,
    },
  ];

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    // 每次切换标签时增加refreshKey，强制重新加载组件
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <PageContainer>
      <Tabs
        activeKey={activeKey}
        onChange={handleTabChange}
        items={tabsItems}
        type="card"
        size="large"
      />
    </PageContainer>
  );
};

export default InvoiceAudit;
