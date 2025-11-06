import React from 'react';
import InvoiceAuditCard from './InvoiceAuditCard';
import {
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Flex, Input, Select } from 'antd';
import InvoiceAuditModal from './Modal';
import type { InvoiceModalRef } from './Modal';

const PendingReview: React.FC = () => {
  const modalRef = React.useRef<InvoiceModalRef>(null);

  return (
    <>
      {/* 操作栏 */}
      <div style={{ marginBottom: 32, display: 'flex' }}>
        <Input
          placeholder="搜搜索申请编号、客户或提交人..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
        />
        <Select
          defaultValue="全部客户"
          style={{ width: 150 }}
          options={[
            { value: '全部客户', label: '全部客户' },
            { value: '北京火星', label: '北京火星' },
            { value: '上海电商', label: '上海电商' },
            { value: '绵阳国', label: '绵阳国' },
            { value: '鲍珂坷', label: '鲍珂坷' },
          ]}
        />
      </div>
      {/* 提示信息 */}
      {/* <div
        style={{
          color: '#737373',
          border: '1px solid #73737350',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          backgroundColor: '#fff',
        }}
      >
        <ExclamationCircleOutlined style={{ marginRight: 8, color: '#000000' }} />
        只有审核通过的申请才能勾选开票。请先审核通过申请后再进行开票操作。
      </div> */}
      {/* 批量下载信息栏 */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div style={{ color: '#737373' }}>
          <span style={{ color: '#000', marginRight: 16 }}>
            <Checkbox /> 全选已通过申请
          </span>
          <span>
            已选择
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>1</span>个申请
          </span>
          <span style={{ marginLeft: 16 }}>
            合计金额：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>¥850.00</span>
          </span>
        </div>
        <Button type="primary" icon={<DownloadOutlined />}>
          批量下载开票模板
        </Button>
      </Flex>
      {/* 卡片 */}
      <div>
        <InvoiceAuditCard type="warning" modalRef={modalRef} />
        <div style={{ marginBottom: 12 }}></div>
        <InvoiceAuditCard type="success" modalRef={modalRef} />
      </div>
      <InvoiceAuditModal ref={modalRef} />
    </>
  );
};

export default PendingReview;
