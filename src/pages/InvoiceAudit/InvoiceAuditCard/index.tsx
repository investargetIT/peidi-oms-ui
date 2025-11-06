import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Card, Checkbox, Flex, Table, TableColumnsType, Tag } from 'antd';
import React, { useState } from 'react';
import type { DataType } from '@/pages/Invoice/index';
import type { InvoiceModalRef } from '../Modal';

const columns: TableColumnsType<DataType> = [
  {
    title: '单据日期',
    dataIndex: 'date',
  },
  {
    title: '单据编号',
    dataIndex: 'number',
  },
  {
    title: '单据类型',
    dataIndex: 'type',
  },
  {
    title: '客户',
    dataIndex: 'custom',
    hidden: true,
  },
  {
    title: '料号',
    dataIndex: 'materialNumber',
  },
  {
    title: '货号',
    dataIndex: 'goodsNumber',
    hidden: true,
  },
  {
    title: '序列编码',
    dataIndex: 'sequenceNumber',
    hidden: true,
  },
  {
    title: '料品名称',
    dataIndex: 'materialName',
  },
  {
    title: '其他品牌',
    dataIndex: 'otherBrand',
    hidden: true,
  },
  {
    title: '品牌',
    dataIndex: 'brand',
    hidden: true,
  },
  {
    title: '采购分类',
    dataIndex: 'purchaseCategory',
    hidden: true,
  },
  {
    title: '出库数量',
    dataIndex: 'outboundQuantity',
  },
  {
    title: '销售单位',
    dataIndex: 'salesUnit',
  },
  {
    title: '国家价',
    dataIndex: 'countryPrice',
  },
  {
    title: '价格合计',
    dataIndex: 'totalPrice',
  },
  {
    title: '批号',
    dataIndex: 'batchNumber',
  },
  {
    title: '创建人',
    dataIndex: 'creator',
  },
  {
    title: '采购单编号',
    dataIndex: 'purchaseOrderNumber',
    hidden: true,
  },
];

const data: DataType[] = [
  {
    key: '1',
    date: '2025.10.22',
    number: 'SM202510001',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50303001',
    goodsNumber: 'CK25-100',
    sequenceNumber: '697175827146',
    materialName: 'Mealyyay普通电商套餐A',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '5,000',
    salesUnit: '盒',
    countryPrice: '¥12.00',
    totalPrice: '¥60.00',
    batchNumber: '5',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
  {
    key: '2',
    date: '2025.10.22',
    number: 'SM202510002',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50303002',
    goodsNumber: 'CK32-100',
    sequenceNumber: '6280932260666',
    materialName: 'Mealyyay普通电商套餐B',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '5,000',
    salesUnit: '盒',
    countryPrice: '¥12.00',
    totalPrice: '¥60.00',
    batchNumber: '5',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
  {
    key: '3',
    date: '2025.10.22',
    number: 'SM202510003',
    type: '内陆出货',
    custom: '北京火星',
    materialNumber: '50301001',
    goodsNumber: 'ck37-100',
    sequenceNumber: '697175827146',
    materialName: 'Mealyyay普通套餐C',
    otherBrand: '自有',
    brand: '',
    purchaseCategory: '宠物零食-普通商品',
    outboundQuantity: '2,000',
    salesUnit: '盒',
    countryPrice: '¥13.00',
    totalPrice: '¥26.00',
    batchNumber: '2',
    creator: 'cpel',
    purchaseOrderNumber: 'CNY0.00',
  },
];

// props 定义
interface InvoiceAuditCardProps {
  // 类型 -枚举：待审核warning 已通过success 已下载info
  type: 'warning' | 'success' | 'info';
  // 父组件传递的 ref
  modalRef: React.RefObject<InvoiceModalRef>;
}

const InvoiceAuditCard: React.FC<InvoiceAuditCardProps> = ({ type, modalRef }) => {
  // 审核通过
  const handleOk = () => {
    if (modalRef.current) {
      modalRef.current.showModal('approve');
    }
  };
  // 审核驳回
  const handleCancel = () => {
    if (modalRef.current) {
      modalRef.current.showModal('reject');
    }
  };
  return (
    <Card>
      {/* 头部信息 */}
      <Flex align="center" justify="space-between">
        {/* 左侧 */}
        <Flex align="flex-start">
          <Checkbox
            disabled={type === 'warning'}
            style={{ marginTop: 2, marginRight: 15 }}
          ></Checkbox>
          <div>
            <Flex align="center">
              <div
                style={{ color: '#0a0a0a', fontSize: '18px', fontWeight: 'bold', marginRight: 10 }}
              >
                申请编号: APP001
              </div>
              <div>
                {type === 'warning' && (
                  <>
                    <Tag icon={<ClockCircleOutlined />} color="warning">
                      待审核
                    </Tag>
                    <span style={{ color: '#737373' }}>(需审核通过后才能开票)</span>
                  </>
                )}
                {type === 'success' && (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已通过
                  </Tag>
                )}
                {type === 'info' && <Tag icon={<DownloadOutlined />}>已下载</Tag>}
              </div>
            </Flex>
            <div style={{ color: '#737373', marginTop: 5 }}>
              提交时间: 2025.10.22 14:30 | 提交人: 张三
            </div>
          </div>
        </Flex>
        {/* 右侧 */}
        <Flex justify="flex-end" align="flex-end" vertical>
          <div style={{ color: '#737373' }}>开票客户</div>
          <div style={{ color: '#0a0a0a', fontSize: '18px', fontWeight: 'bold' }}>北京火星</div>
        </Flex>
      </Flex>
      {/* 表格状态 */}
      <Flex style={{ marginTop: 16, marginBottom: 16 }} justify="flex-start" align="center">
        <div style={{ color: '#737373', marginRight: 5 }}>订单数量:</div>
        <div style={{ color: '#0a0a0a', fontSize: '16px', fontWeight: 'bold', marginRight: 18 }}>
          4 个
        </div>
        <div style={{ color: '#737373', marginRight: 5 }}>合计金额:</div>
        <div style={{ color: '#0a0a0a', fontSize: '16px', fontWeight: 'bold' }}>¥506.00</div>
      </Flex>
      {/* 表格 */}
      <Table<DataType>
        columns={columns}
        dataSource={data}
        scroll={{ x: 'max-content' }}
        pagination={{ position: ['none'] }}
        size="small"
        style={{ border: '1px solid #e8e8e8', borderRadius: 8 }}
      />
      {/* 操作按钮 */}
      <Flex justify="flex-end" align="center" style={{ marginTop: 24 }}>
        {(type === 'success' || type === 'info') && (
          <Button icon={<DownloadOutlined />}>下载开票模板</Button>
        )}

        {type === 'warning' && (
          <>
            <Button
              icon={<CloseCircleOutlined />}
              style={{ marginRight: 12 }}
              onClick={() => handleCancel()}
            >
              驳回
            </Button>
            <Button icon={<CheckCircleOutlined />} type="primary" onClick={() => handleOk()}>
              通过
            </Button>
          </>
        )}
      </Flex>
    </Card>
  );
};

export default InvoiceAuditCard;
