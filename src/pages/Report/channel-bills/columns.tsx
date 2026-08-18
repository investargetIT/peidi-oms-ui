import React from 'react';
import { Tag } from 'antd';

/**
 * 渲染"账单文件"列：使用 fileUrls + fileNames 一一对应展示。
 * - 优先使用数组形式（fileUrls / fileNames），新接口统一返回这种结构。
 * - 若仅返回了单值 fileUrl（兼容老数据），退回到原来的单链接展示。
 */
const renderBillFiles = (record: {
  fileUrls?: string[] | null;
  fileNames?: string[] | null;
  fileUrl?: string;
}) => {
  const urls = record?.fileUrls;
  const names = record?.fileNames;
  if (Array.isArray(urls) && urls.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {urls.map((url, idx) => {
          if (!url) return null;
          const displayName =
            (Array.isArray(names) && names[idx]) || decodeURIComponent(url.split('?')[0].split('/').pop() || `文件${idx + 1}`);
          return (
            <a key={`${url}-${idx}`} href={url} target="_blank" rel="noopener noreferrer">
              {displayName}
            </a>
          );
        })}
      </div>
    );
  }
  if (record?.fileUrl) {
    return (
      <a href={record.fileUrl} target="_blank" rel="noopener noreferrer">
        查看文件
      </a>
    );
  }
  return '-';
};

/**
 * 各渠道月账单通用表格列定义
 * 适用于 zfb / tmall / dy / jd / 后续其他渠道
 */
export const channelBillColumns = [
  {
    title: '账单日期',
    dataIndex: 'billDate',
    key: 'billDate',
    width: 110,
    fixed: 'left' as const,
  },
  {
    title: '店铺名称',
    dataIndex: 'shopName',
    key: 'shopName',
    width: 180,
  },
  {
    title: '期初余额',
    dataIndex: 'beginningBalance',
    key: 'beginningBalance',
    width: 120,
    render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
  },
  {
    title: '期末余额',
    dataIndex: 'endingBalance',
    key: 'endingBalance',
    width: 120,
    render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
  },
  {
    title: '生成状态',
    dataIndex: 'generateStatus',
    key: 'generateStatus',
    width: 110,
    render: (v?: number) => {
      const map: Record<number, { text: string; color: string }> = {
        0: { text: '待生成', color: 'default' },
        1: { text: '生成中', color: 'processing' },
        2: { text: '生成成功', color: 'success' },
        3: { text: '生成失败', color: 'error' },
        5: { text: '无业务数据', color: 'warning' },
        6: { text: '未知错误', color: 'error' },
      };
      const item = v !== undefined && map[v] ? map[v] : { text: '-', color: 'default' };
      return <Tag color={item.color}>{item.text}</Tag>;
    },
  },
  {
    title: '账单文件',
    dataIndex: 'fileUrls',
    key: 'fileUrls',
    width: 280,
    render: (_: unknown, record: any) => renderBillFiles(record),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
  },
];
