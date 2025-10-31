import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import Icon, { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { DeleteOutlined } from './icon';
import { PageContainer } from '@ant-design/pro-components';
import CustomerInfoModal from './Modal';
import type { CustomerInfoModalRef } from './Modal';

interface DataType {
  key: string;
  name: string;
  channel: string;
  invoiceRequirement: string;
  invoiceType: string;
  taxNumber: string;
}

const columns: TableProps<DataType>['columns'] = [
  {
    title: '购买方名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '渠道',
    dataIndex: 'channel',
    key: 'channel',
  },
  {
    title: '发票要求',
    dataIndex: 'invoiceRequirement',
    key: 'invoiceRequirement',
  },
  {
    title: '发票种类',
    key: 'invoiceType',
    dataIndex: 'invoiceType',
  },
  {
    title: '税号',
    dataIndex: 'taxNumber',
    key: 'taxNumber',
  },
  {
    title: '操作',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <Button color="default" variant="text">
          <Icon component={DeleteOutlined} style={{ color: '#e7000b', width: 16, height: 16 }} />
        </Button>
      </Space>
    ),
  },
];

const data: DataType[] = [
  {
    key: '1',
    name: '浙江郡园酒店管理有限公司',
    channel: '线上',
    invoiceRequirement: '数电发票（普通发票）',
    invoiceType: '普票',
    taxNumber: '91330482MA2JGL1921',
  },
  {
    key: '2',
    name: '贝达药业股份有限公司',
    channel: '线下',
    invoiceRequirement: '数电发票（普通发票）',
    invoiceType: '普票',
    taxNumber: '913301007463034461',
  },
];

const CustomerInfo: React.FC = () => {
  // 表格数据
  const [tableData, setTableData] = useState(data);

  //#region 筛选逻辑
  const [searchText, setSearchText] = useState('');
  const [channel, setChannel] = useState('全部渠道');
  const [invoiceRequirement, setInvoiceRequirement] = useState('全部发票要求');
  const [invoiceType, setInvoiceType] = useState('全部种类');

  useEffect(() => {
    const filteredData = data.filter((item) => {
      const nameMatch = item.name.includes(searchText);
      const taxNumberMatch = item.taxNumber.includes(searchText);
      const channelMatch = channel === '全部渠道' || item.channel === channel;
      const invoiceRequirementMatch =
        invoiceRequirement === '全部发票要求' || item.invoiceRequirement === invoiceRequirement;
      const invoiceTypeMatch = invoiceType === '全部种类' || item.invoiceType === invoiceType;

      return (
        nameMatch && taxNumberMatch && channelMatch && invoiceRequirementMatch && invoiceTypeMatch
      );
    });
    // console.log('filteredData', filteredData);
    setTableData(filteredData);
  }, [searchText, channel, invoiceRequirement, invoiceType]);
  //#endregion

  const customerInfoModalRef = useRef<CustomerInfoModalRef>(null);

  return (
    <PageContainer>
      {/* 操作栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Input
          placeholder="搜索购买方名称或税号..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ maxWidth: 500 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          defaultValue="全部渠道"
          style={{ width: 150 }}
          options={[
            { value: '全部渠道', label: '全部渠道' },
            { value: '线上', label: '线上' },
            { value: '线下', label: '线下' },
          ]}
          onChange={(value) => setChannel(value)}
        />
        <Select
          defaultValue="全部发票要求"
          style={{ width: 200 }}
          options={[
            { value: '全部发票要求', label: '全部发票要求' },
            { value: '数电发票（普通发票）', label: '数电发票（普通发票）' },
          ]}
          onChange={(value) => setInvoiceRequirement(value)}
        />
        <Select
          defaultValue="全部种类"
          style={{ width: 150 }}
          options={[
            { value: '全部种类', label: '全部种类' },
            { value: '普票', label: '普票' },
            { value: '专票', label: '专票' },
          ]}
          onChange={(value) => setInvoiceType(value)}
        />
        <Button type="primary" onClick={() => setTableData(data)}>
          查询
        </Button>
        <Button
          onClick={() => {
            setSearchText('');
            setChannel('全部渠道');
            setInvoiceRequirement('全部发票要求');
            setInvoiceType('全部种类');
          }}
        >
          重置
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => customerInfoModalRef.current?.showModal()}
        >
          新增客户
        </Button>
      </div>
      <Table<DataType> columns={columns} dataSource={tableData} />
      <CustomerInfoModal ref={customerInfoModalRef} />
    </PageContainer>
  );
};

export default CustomerInfo;
