import React from 'react';
import InvoiceAuditCard from './InvoiceAuditCard';
import { ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';

const PendingReview: React.FC = () => {
  return (
    <>
      {/* 操作栏 */}
      <div style={{ marginBottom: 12, display: 'flex' }}>
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
      <div
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
      </div>
      {/* 卡片 */}
      <div>
        <InvoiceAuditCard type="warning" />
      </div>
    </>
  );
};

export default PendingReview;
