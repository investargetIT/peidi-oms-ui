import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Input, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import Icon, { ExclamationCircleFilled, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { DeleteOutlined } from './icon';
import { PageContainer } from '@ant-design/pro-components';
import CustomerInfoModal from './Modal';
import type { CustomerInfoModalRef } from './Modal';
import InvoiceApi from '@/services/invoiceApi';
import type { InvoiceCustomer, PageParams, PageResponse } from '@/services/invoiceApi';
import _ from 'lodash';

export interface DataType {
  id: number;
  channel: string;
  customerName: string;
  tax: string;
  type: string;
}

const data: DataType[] = [
  {
    id: 1,
    channel: '线上',
    customerName: '浙江郡园酒店管理有限公司',
    tax: '91321322MA269Y5BXN',
    type: 'pc',
  },
];

const CustomerInfo: React.FC = () => {
  const columns: TableProps<DataType>['columns'] = [
    {
      title: '购买方名称',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
    },
    {
      title: '发票种类',
      key: 'type',
      dataIndex: 'type',
      render: (type) => {
        if (type === 'pc') {
          return '数电普票（电子）';
        }
        if (type === 'bs') {
          return '数电专票（电子）';
        }
        return type;
      },
    },
    {
      title: '税号',
      dataIndex: 'tax',
      key: 'tax',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button color="default" variant="text" onClick={() => handleDeleteClick(record)}>
            <Icon component={DeleteOutlined} style={{ color: '#e7000b', width: 16, height: 16 }} />
          </Button>
        </Space>
      ),
    },
  ];
  const customerInfoModalRef = useRef<CustomerInfoModalRef>(null);
  // 表格数据
  const [tableData, setTableData] = useState<DataType[]>([]);

  //#region 筛选逻辑
  const [searchText, setSearchText] = useState('');
  const [showSearchText, setShowSearchText] = useState('');
  const [channel, setChannel] = useState('全部渠道');
  const [type, setType] = useState('全部种类');
  const [taxSearchText, setTaxSearchText] = useState('');
  const [showTaxSearchText, setShowTaxSearchText] = useState('');

  const handleSearchText = (value: string) => {
    setShowSearchText(value);
    debouncedSearchText(value); // 防抖处理
  };
  // 使用useRef保持防抖函数的稳定性
  const debouncedSearchText = useRef(
    _.debounce((value) => {
      setSearchText(value);
    }, 500),
  ).current;

  const handleTaxSearchText = (value: string) => {
    setShowTaxSearchText(value);
    debouncedTaxSearchText(value); // 防抖处理
  };
  // 使用useRef保持防抖函数的稳定性
  const debouncedTaxSearchText = useRef(
    _.debounce((value) => {
      setTaxSearchText(value);
    }, 500),
  ).current;

  // 处理筛选参数方法
  const getSearchStr = () => {
    const searchParams = [];
    if (channel !== '全部渠道') {
      searchParams.push({
        searchName: 'channel',
        searchType: 'equals',
        searchValue: `\"${channel}\"`,
      });
    }
    if (type !== '全部种类') {
      searchParams.push({
        searchName: 'type',
        searchType: 'equals',
        searchValue: `\"${type}\"`,
      });
    }
    if (searchText) {
      searchParams.push({
        searchName: 'customerName',
        searchType: 'like',
        searchValue: `${searchText}`,
      });
    }
    if (taxSearchText) {
      searchParams.push({
        searchName: 'tax',
        searchType: 'like',
        searchValue: `${taxSearchText}`,
      });
    }
    return JSON.stringify(searchParams);
  };
  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setShowSearchText('');
    setTaxSearchText('');
    setShowTaxSearchText('');
    setChannel('全部渠道');
    setType('全部种类');
  };
  //#endregion

  //#region 分页逻辑
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [total, setTotal] = useState(0);

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination({
      current: page,
      pageSize,
    });
  };
  //#endregion

  //#region 请求逻辑
  // 筛选触发时查询  页面变化时查询
  useEffect(() => {
    refreshPagination();
    return () => {
      // 组件卸载时取消防抖
      debouncedSearchText.cancel();
      debouncedTaxSearchText.cancel();
    };
  }, [channel, type, searchText, taxSearchText, pagination]);

  // 获取客户信息分页列表方法
  const getInvoiceCustomerPage = (params: PageParams) => {
    InvoiceApi.getInvoiceCustomerPage(params).then((res: PageResponse<any>) => {
      // 如果当前页大于总页数，重置为第一页 排除总页数为0的情况
      if (res.data?.current > res.data?.pages && res.data?.total !== 0) {
        setPagination({
          current: res.data?.pages,
          pageSize: pagination.pageSize,
        });
        return;
      }
      setTableData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    });
  };
  // 刷新分页方法  可复用
  const refreshPagination = () => {
    getInvoiceCustomerPage({
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
      searchStr: getSearchStr(),
    });
  };

  // 新增客户信息方法
  const postInvoiceCustomerNew = (data: InvoiceCustomer) => {
    InvoiceApi.postInvoiceCustomerNew(data).then((res: any) => {
      if (res.code === 200) {
        message.success('新增客户成功');
        // 关闭弹窗
        customerInfoModalRef.current?.handleCancel();
        // 新增成功后刷新列表
        refreshPagination();
      }
    });
  };

  // 删除客户信息方法
  const postInvoiceCustomerDelete = (idList: number[]) => {
    InvoiceApi.postInvoiceCustomerDelete(idList).then((res: any) => {
      if (res.code === 200) {
        message.success('删除客户成功');
        // 删除成功后刷新列表
        refreshPagination();
      }
    });
  };
  //#endregion

  // 处理删除点击事件
  const handleDeleteClick = (record: DataType) => {
    // console.log('点击删除', record);
    Modal.confirm({
      title: `确认删除客户 ${record.customerName} 吗？`,
      icon: <ExclamationCircleFilled />,
      // content: 'Some descriptions',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      closable: true,
      maskClosable: true,
      onOk() {
        // console.log('OK');
        postInvoiceCustomerDelete([record.id]);
      },
      onCancel() {
        // console.log('Cancel');
      },
    });
  };
  return (
    <PageContainer>
      {/* 操作栏 */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={22}>
          <Input
            value={showSearchText}
            placeholder="搜索购买方名称..."
            prefix={<SearchOutlined style={{ color: '#737373' }} />}
            style={{ maxWidth: 250, marginRight: 16 }}
            onChange={(e) => handleSearchText(e.target.value)}
          />
          <Input
            value={showTaxSearchText}
            placeholder="搜索税号..."
            prefix={<SearchOutlined style={{ color: '#737373' }} />}
            style={{ maxWidth: 250, marginRight: 16 }}
            onChange={(e) => handleTaxSearchText(e.target.value)}
          />
          <Select
            value={channel}
            defaultValue="全部渠道"
            style={{ width: 150, marginRight: 16 }}
            options={[
              { value: '全部渠道', label: '全部渠道' },
              { value: '线上', label: '线上' },
              { value: '线下', label: '线下' },
            ]}
            onChange={(value) => setChannel(value)}
          />
          <Select
            value={type}
            defaultValue="全部种类"
            style={{ width: 200, marginRight: 16 }}
            options={[
              { value: '全部种类', label: '全部种类' },
              { value: 'pc', label: '数电普票（电子）' },
              { value: 'bs', label: '数电专票（电子）' },
            ]}
            onChange={(value) => setType(value)}
          />
          {/* <Button style={{ marginRight: 16 }} type="primary" onClick={() => handleSearch()}>
            查询
          </Button> */}
          <Button onClick={() => handleReset()}>重置</Button>
        </Col>
        <Col span={2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => customerInfoModalRef.current?.showModal()}
          >
            新增客户
          </Button>
        </Col>
      </Row>
      <Table<DataType>
        columns={columns}
        dataSource={tableData}
        size="small"
        pagination={{
          pageSize: 10,
          current: pagination.current,
          total,
          pageSizeOptions: [10],
          onChange: (page, pageSize) => handlePaginationChange(page, pageSize),
        }}
      />
      <CustomerInfoModal ref={customerInfoModalRef} onOk={postInvoiceCustomerNew} />
    </PageContainer>
  );
};

export default CustomerInfo;
