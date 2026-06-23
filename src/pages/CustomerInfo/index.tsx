import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Input, Modal, Row, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import type { TableProps } from 'antd';
import { ExclamationCircleFilled, PlusOutlined, SearchOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, DeleteOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import CustomerInfoModal from './Modal';
import type { CustomerInfoModalRef, DataType } from './Modal';
import InvoiceApi from '@/services/invoiceApi';
import type { InvoiceCustomer, PageParams, PageResponse } from '@/services/invoiceApi';
import _ from 'lodash';

const data: DataType[] = [
  {
    id: 1,
    channel: '线上',
    customerName: '浙江郡园酒店管理有限公司',
    tax: '91321322MA269Y5BXN',
    type: 'pc',
    validationStatus: 0,
    validationMessage: null,
  },
];

const CustomerInfo: React.FC = () => {
  const columns: TableProps<DataType>['columns'] = [
    {
      title: '购买方名称',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string) => (
        <Space>
          {text}
          <Tooltip title="复制">
            <CopyOutlined
              style={{ cursor: 'pointer', color: '#1677ff' }}
              onClick={() => {
                navigator.clipboard.writeText(text);
                message.success('已复制到剪贴板');
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 100,
    },
    {
      title: '发票种类',
      key: 'type',
      dataIndex: 'type',
      width: 150,
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
      title: '税号/身份证号',
      dataIndex: 'tax',
      key: 'tax',
      width: 200,
    },
    {
      title: '验证状态',
      key: 'validationStatus',
      dataIndex: 'validationStatus',
      width: 120,
      render: (status) => {
        if (status === 0) {
          return (
            <Tag icon={<ClockCircleOutlined />} color="default">
              未校验
            </Tag>
          );
        }
        if (status === 1) {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              校验通过
            </Tag>
          );
        }
        if (status === 2) {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              校验失败
            </Tag>
          );
        }
        return status;
      },
    },
    {
      title: '备注',
      key: 'validationMessage',
      dataIndex: 'validationMessage',
      width: 250,
      render: (msg) => {
        if (!msg) return '-';
        try {
          const parsedMsg = typeof msg === 'string' ? JSON.parse(msg) : msg;
          const lines = [];
          // 即使为空也要显示
          if (parsedMsg.taxNumber !== undefined) {
            lines.push(`税号/身份证号: ${parsedMsg.taxNumber || '-'}`);
          }
          if (parsedMsg.invoiceType !== undefined) {
            lines.push(`发票种类: ${parsedMsg.invoiceType || '-'}`);
          }
          return lines.length > 0 ? (
            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              {lines.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          ) : '-';
        } catch (e) {
          return <div style={{ fontSize: '12px' }}>{msg}</div>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="验证通过">
            <Button
              color="default"
              variant="text"
              onClick={() => handleValidatePass(record)}
              disabled={record.validationStatus === 1}
            >
              <CheckOutlined style={{ color: record.validationStatus === 1 ? '#bfbfbf' : '#52c41a', width: 14, height: 14 }} />
            </Button>
          </Tooltip>
          <Button color="default" variant="text" onClick={() => handleEditClick(record)}>
            <EditOutlined style={{ color: '#1677ff', width: 14, height: 14 }} />
          </Button>
          <Button color="default" variant="text" onClick={() => handleDeleteClick(record)}>
            <DeleteOutlined style={{ color: '#e7000b', width: 14, height: 14 }} />
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
  const [validationStatus, setValidationStatus] = useState('全部状态');

  const handleSearchText = (value: string) => {
    setShowSearchText(value);
  };

  const handleTaxSearchText = (value: string) => {
    setShowTaxSearchText(value);
  };

  const handleSearch = () => {
    setSearchText(showSearchText);
    setTaxSearchText(showTaxSearchText);
    // 直接使用 showSearchText 和 showTaxSearchText 构建搜索参数
    const searchParams = [];
    if (channel !== '全部渠道') {
      searchParams.push({
        searchName: 'channel',
        searchType: 'equals',
        searchValue: `"${channel}"`,
      });
    }
    if (type !== '全部种类') {
      searchParams.push({
        searchName: 'type',
        searchType: 'equals',
        searchValue: `"${type}"`,
      });
    }
    if (validationStatus !== '全部状态') {
      searchParams.push({
        searchName: 'validationStatus',
        searchType: 'equals',
        searchValue: validationStatus,
      });
    }
    if (showSearchText) {
      searchParams.push({
        searchName: 'customerName',
        searchType: 'like',
        searchValue: `${showSearchText}`,
      });
    }
    if (showTaxSearchText) {
      searchParams.push({
        searchName: 'tax',
        searchType: 'like',
        searchValue: `${showTaxSearchText}`,
      });
    }
    getInvoiceCustomerPage({
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
      searchStr: JSON.stringify(searchParams),
    });
  };

  // 处理筛选参数方法
  const getSearchStr = () => {
    const searchParams = [];
    if (channel !== '全部渠道') {
      searchParams.push({
        searchName: 'channel',
        searchType: 'equals',
        searchValue: `"${channel}"`,
      });
    }
    if (type !== '全部种类') {
      searchParams.push({
        searchName: 'type',
        searchType: 'equals',
        searchValue: `"${type}"`,
      });
    }
    if (validationStatus !== '全部状态') {
      searchParams.push({
        searchName: 'validationStatus',
        searchType: 'equals',
        searchValue: validationStatus,
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
    setValidationStatus('全部状态');
    // 重置后刷新列表，回到第一页
    setPagination({
      ...pagination,
      current: 1,
    });
    // 直接发起请求获取重置后的数据
    getInvoiceCustomerPage({
      pageNo: 1,
      pageSize: pagination.pageSize,
      searchStr: '[]',
    });
  };
  //#endregion

  //#region 分页逻辑
  // 从本地存储获取保存的 pageSize，如果没有则使用默认值 50
  const savedPageSize = localStorage.getItem('customerInfoPageSize');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: savedPageSize ? parseInt(savedPageSize, 10) : 50,
  });
  const [total, setTotal] = useState(0);

  const handlePaginationChange = (page: number, pageSize: number) => {
    // 保存 pageSize 到本地存储
    localStorage.setItem('customerInfoPageSize', pageSize.toString());
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
  }, [pagination]);

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

  // 编辑客户信息方法
  const postInvoiceCustomerUpdate = (data: InvoiceCustomer & { id: number }) => {
    InvoiceApi.postInvoiceCustomerUpdate(data).then((res: any) => {
      if (res.code === 200) {
        message.success('编辑客户成功');
        // 关闭弹窗
        customerInfoModalRef.current?.handleCancel();
        // 编辑成功后刷新列表
        refreshPagination();
      }
    });
  };

  // 处理编辑点击事件
  const handleEditClick = (record: DataType) => {
    customerInfoModalRef.current?.showModal(record);
  };

  // 处理弹窗确认事件
  const handleModalOk = (data: InvoiceCustomer, id?: number) => {
    if (id) {
      postInvoiceCustomerUpdate({ ...data, id });
    } else {
      postInvoiceCustomerNew(data);
    }
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

  // 验证通过方法
  const handleValidatePass = (record: DataType) => {
    Modal.confirm({
      title: `确认将客户 ${record.customerName} 标记为验证通过吗？`,
      icon: <ExclamationCircleFilled />,
      content: '此操作将清空备注信息',
      okText: '确定',
      okType: 'primary',
      cancelText: '取消',
      maskClosable: true,
      width: 500,
      onOk() {
        InvoiceApi.postInvoiceCustomerUpdate({
          id: record.id,
          channel: record.channel,
          customerName: record.customerName,
          tax: record.tax,
          type: record.type,
          validationStatus: 1,
          validationMessage: '',
        }).then((res: any) => {
          if (res.code === 200) {
            message.success('验证通过成功');
            refreshPagination();
          }
        });
      },
      onCancel() {
        // 取消操作
      },
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
      maskClosable: true,
      width: 500,
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
            placeholder="搜索税号/身份证号..."
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
          <Select
            value={validationStatus}
            defaultValue="全部状态"
            style={{ width: 150, marginRight: 16 }}
            options={[
              { value: '全部状态', label: '全部状态' },
              { value: '0', label: '未校验' },
              { value: '1', label: '校验通过' },
              { value: '2', label: '校验失败' },
            ]}
            onChange={(value) => setValidationStatus(value)}
          />
          <Button type="primary" style={{ marginRight: 16 }} icon={<SearchOutlined />} onClick={() => handleSearch()}>
            搜索
          </Button>
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
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          total,
          pageSizeOptions: [10, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => handlePaginationChange(page, pageSize),
        }}
      />
      <CustomerInfoModal ref={customerInfoModalRef} onOk={handleModalOk} />
    </PageContainer>
  );
};

export default CustomerInfo;
