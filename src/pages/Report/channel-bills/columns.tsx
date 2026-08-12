import React from 'react';
import { Tag } from 'antd';

/**
 * 各渠道月账单通用表格列定义
 * 适用于 zfb / tmall / 后续其他渠道
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
    dataIndex: 'fileUrl',
    key: 'fileUrl',
    width: 240,
    render: (v?: string) =>
      v ? (
        <a href={v} target="_blank" rel="noopener noreferrer">
          查看文件
        </a>
      ) : (
        '-'
      ),
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
