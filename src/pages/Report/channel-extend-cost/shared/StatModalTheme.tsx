import React from 'react';

/**
 * 费用统计弹窗统一视觉主题（配合 Modal 的 rootClassName="stat-stat-modal"）。
 *
 * 目标：表格多的时候区域分明、阅读不累。
 * - 弹窗内容区浅灰底，每张表格独立成白色卡片
 * - 表头统一浅灰底 + 半粗，行高/内边距稍微放松
 * - 区块标题统一加蓝色竖条
 */
const StatModalTheme: React.FC = () => (
  <style>{`
    .stat-stat-modal .ant-modal-content {
      border-radius: 12px;
      overflow: hidden;
    }
    .stat-stat-modal .ant-modal-header {
      margin-bottom: 0;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    .stat-stat-modal .ant-modal-body {
      background: #f5f7fa !important;
      max-height: 74vh;
      overflow-y: auto;
    }
    .stat-stat-modal .ant-modal-body::-webkit-scrollbar {
      width: 8px;
    }
    .stat-stat-modal .ant-modal-body::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 4px;
    }
    .stat-stat-modal .ant-modal-body::-webkit-scrollbar-track {
      background: transparent;
    }

    /* 每张表格一张白色卡片 */
    .stat-stat-modal .ant-table-wrapper {
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .stat-stat-modal .ant-table-wrapper:last-child {
      margin-bottom: 0;
    }

    /* 表格排版放松一点 */
    .stat-stat-modal .ant-table {
      font-size: 12px;
    }
    .stat-stat-modal .ant-table-thead > tr > th {
      background: #fafafa !important;
      color: #1f1f1f;
      font-weight: 600;
    }
    .stat-stat-modal .ant-table-tbody > tr > td {
      padding: 6px 8px !important;
    }
    .stat-stat-modal .ant-table-tbody > tr:hover > td {
      background: #f5faff !important;
    }
    .stat-stat-modal .ant-table-summary > tr > td {
      background: #fafafa !important;
      font-weight: 600;
    }

    /* 区块标题：蓝色竖条 + 统一间距 */
    .stat-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 600;
      color: #1f1f1f;
    }
    .stat-section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 14px;
      border-radius: 2px;
      background: #1677ff;
    }
  `}</style>
);

export default StatModalTheme;
