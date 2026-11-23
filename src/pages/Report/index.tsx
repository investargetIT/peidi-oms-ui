import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import { history } from '@umijs/max';
import ManagementReportTab from './management-report';
import CostTab from './cost';
import ChannelExtendCostTab from './channel-extend-cost';
import ChannelBillsTab from './channel-bills';
import { UploadTaskProvider } from './channel-bills/common/uploadTaskStore';
import UploadTaskDrawer from './channel-bills/common/UploadTaskDrawer';

const TAB_KEY = 'report_active_tab';

/** 报表页支持的 tab（URL 上的 ?tab= 只认这几个值） */
const REPORT_TAB_KEYS = ['management-report', 'cost', 'channel-bills', 'channel-extend-cost'];

/**
 * 读 URL 上的 ?tab= / ?merchantCode=
 * 外部系统（如 BI 周报的「补录成本」）会跳 /report?tab=cost&merchantCode=xxx 直达成本核算页
 *
 * 注意：用 window.location.search 而不是 umi 的 useLocation，因为这个页面不需要
 * 响应 query 变化（值只在首次挂载时消费一次），避免额外渲染。
 */
const readQuery = () => {
  if (typeof window === 'undefined') return { tab: '', merchantCode: '' };
  const search = new URLSearchParams(window.location.search);
  const tab = search.get('tab') || '';
  const merchantCode = (search.get('merchantCode') || '').trim();
  return {
    tab: REPORT_TAB_KEYS.includes(tab) ? tab : '',
    merchantCode,
  };
};

const Report: React.FC = () => {
  // 首次渲染：URL 带 ?tab= 时以 URL 为准；只带了 merchantCode 也直接进成本核算页；
  // 都没有则沿用 localStorage 上次的 tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const { tab, merchantCode } = readQuery();
    if (tab) return tab;
    if (merchantCode) return 'cost';
    return localStorage.getItem(TAB_KEY) || 'management-report';
  });
  // 待补录的商家编码：URL 带过来时消费一次（预填搜索 + 打开录入弹窗），消费完清空，
  // 避免在成本核算 / 其它 tab 之间来回切换时反复弹窗
  const [pendingMerchantCode, setPendingMerchantCode] = useState<string>(
    () => readQuery().merchantCode,
  );

  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  const tabItems = [
    { key: 'management-report', label: '管报数据查询' },
    { key: 'cost', label: '成本核算' },
    { key: 'channel-bills', label: '各渠道月账单' },
    { key: 'channel-extend-cost', label: '渠道推广费用' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'management-report':
        return <ManagementReportTab />;
      case 'cost':
        // 带上 URL 里的商家编码：成本核算页据此预填搜索并打开「临时成本录入」，
        // 用于 BI 周报「缺失成本 → 补录成本」的跳转
        return (
          <CostTab
            initialMerchantCode={pendingMerchantCode}
            onMerchantCodeConsumed={() => setPendingMerchantCode('')}
          />
        );
      case 'channel-extend-cost':
        return <ChannelExtendCostTab />;
      case 'channel-bills':
        return <ChannelBillsTab />;
      default:
        return null;
    }
  };

  // 切换 tab 时把 URL 上的 tab/merchantCode 清掉，避免刷新后又被 URL 拉回去
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPendingMerchantCode('');
    const { tab, merchantCode } = readQuery();
    if (tab || merchantCode) {
      history.replace('/report');
    }
  };

  return (
    <UploadTaskProvider>
      <PageContainer>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          style={{ marginBottom: 16 }}
          size="large"
          type="card"
        />
        {renderTabContent()}
      </PageContainer>
      {/* 右侧悬浮上传任务卡片：跨 tab 共享任务列表 */}
      <UploadTaskDrawer />
    </UploadTaskProvider>
  );
};

export default Report;
