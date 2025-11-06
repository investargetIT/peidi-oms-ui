import React from 'react';
import InvoiceAuditCard from './InvoiceAuditCard';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const HistoricalRecords: React.FC = () => {
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
          defaultValue="全部状态"
          style={{ width: 150, marginRight: 16 }}
          options={[
            { value: '全部状态', label: '全部状态' },
            { value: '已通过', label: '已通过' },
            { value: '已驳回', label: '已驳回' },
          ]}
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
      {/* 卡片 */}
      <div>
        <InvoiceAuditCard type="info" />
      </div>
    </>
  );
};

export default HistoricalRecords;
