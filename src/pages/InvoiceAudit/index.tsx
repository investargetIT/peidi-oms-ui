import { PageContainer } from '@ant-design/pro-components';
import React from 'react';
import { Tabs, TabsProps } from 'antd';
import { HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import PendingReview from './PendingReview';
import HistoricalRecords from './HistoricalRecords';

const InvoiceAudit: React.FC = () => {
  const tabsItems: TabsProps['items'] = [
    {
      key: '1',
      label: '待审核',
      children: <PendingReview />,
      icon: <ClockCircleOutlined />,
    },
    {
      key: '2',
      label: '历史记录',
      children: <HistoricalRecords />,
      icon: <HistoryOutlined />,
    },
  ];

  return (
    <PageContainer>
      <Tabs defaultActiveKey="1" items={tabsItems} type="card" size="large" />
    </PageContainer>
  );
};

export default InvoiceAudit;
