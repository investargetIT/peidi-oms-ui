import { PageContainer } from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import InvoiceApi from '@/services/invoiceApi';
import type { InvoiceTaxNo, PageParams, PageResponse } from '@/services/invoiceApi';
import { Button, Flex, Input, message, Modal, Space, Table, TableProps } from 'antd';
import Icon, { ExclamationCircleFilled, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import TaxNoModal from './Modal';
import type { TaxNoModalRef } from './Modal';
import { DeleteOutlined, EditOutlined } from '@/pages/CustomerInfo/icon';
import { useDebounceSearch } from '@/hooks/useDebounce';

// 税收编码数据接口
export interface TaxNoItem {
  /** 主键ID */
  id: number;
  /** 商品名称 */
  goodsName: string;
  /** U9编号 */
  u9No: string;
  /** 税收编码 */
  taxNo: string;
  /** 税率 */
  taxRate: number | null;
}

const TaxNo: React.FC = () => {
  const taxNoModalRef = React.useRef<TaxNoModalRef>(null);
  // 表格列定义
  const columns: TableProps<TaxNoItem>['columns'] = [
    {
      title: '商品名称',
      dataIndex: 'goodsName',
      key: 'goodsName',
    },
    {
      title: 'U9编号',
      dataIndex: 'u9No',
      key: 'u9No',
    },
    {
      title: '税收编码',
      dataIndex: 'taxNo',
      key: 'taxNo',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <Space size="middle">
          <Button
            color="default"
            variant="text"
            onClick={() => taxNoModalRef.current?.showModal('edit', record)}
          >
            <Icon component={EditOutlined} style={{ color: '#007bff', width: 16, height: 16 }} />
          </Button>
          <Button color="default" variant="text" onClick={() => handleDeleteClick(record)}>
            <Icon component={DeleteOutlined} style={{ color: '#e7000b', width: 16, height: 16 }} />
          </Button>
        </Space>
      ),
    },
  ];
  // 表格数据
  const [tableData, setTableData] = useState<TaxNoItem[]>([]);

  //#region 筛选逻辑
  // Input搜索使用通用防抖钩子
  const [searchGoodsNameText, showSearchGoodsNameText, handleSearchGoodsNameText] =
    useDebounceSearch('');
  const [searchU9NoText, showSearchU9NoText, handleSearchU9NoText] = useDebounceSearch('');
  const [searchTaxNoText, showSearchTaxNoText, handleSearchTaxNoText] = useDebounceSearch('');

  // 处理筛选参数方法
  const getSearchStr = () => {
    const searchParams = [];
    if (searchGoodsNameText) {
      searchParams.push({
        searchName: 'goodsName',
        searchType: 'like',
        searchValue: `${searchGoodsNameText}`,
      });
    }
    if (searchU9NoText) {
      searchParams.push({
        searchName: 'u9No',
        searchType: 'like',
        searchValue: `${searchU9NoText}`,
      });
    }
    if (searchTaxNoText) {
      searchParams.push({
        searchName: 'taxNo',
        searchType: 'like',
        searchValue: `${searchTaxNoText}`,
      });
    }
    return JSON.stringify(searchParams);
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
  }, [pagination, searchGoodsNameText, searchU9NoText, searchTaxNoText]);
  // 分页获取税收编码方法
  function getTaxNoPage(params: PageParams) {
    return InvoiceApi.getTaxNoPage(params).then((res: any) => {
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
  }
  // 刷新分页方法  可复用
  const refreshPagination = () => {
    getTaxNoPage({
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
      searchStr: getSearchStr(),
    });
  };

  // 新增税收编码方法
  const postInvoiceTaxNoNew = (params: InvoiceTaxNo) => {
    InvoiceApi.postInvoiceTaxNoNew(params).then((res: any) => {
      if (res.code === 200) {
        message.success('新增税收编码成功');
        // 关闭弹窗
        taxNoModalRef.current?.handleCancel();
        // 新增成功后刷新列表
        refreshPagination();
      }
    });
  };

  // 删除税收编码方法
  const postInvoiceTaxNoDelete = (params: number[]) => {
    InvoiceApi.postInvoiceTaxNoDelete(params).then((res: any) => {
      if (res.code === 200) {
        message.success('删除税收编码成功');
        // 删除成功后刷新列表
        refreshPagination();
      }
    });
  };

  // 修改税收编码方法
  const postInvoiceTaxNoUpdate = (params: InvoiceTaxNo) => {
    InvoiceApi.postInvoiceTaxNoUpdate(params).then((res: any) => {
      if (res.code === 200) {
        message.success('修改税收编码成功');
        // 关闭弹窗
        taxNoModalRef.current?.handleCancel();
        // 修改成功后刷新列表
        refreshPagination();
      }
    });
  };
  //#endregion

  // 处理删除点击事件
  const handleDeleteClick = (record: TaxNoItem) => {
    // console.log('点击删除', record);
    Modal.confirm({
      title: `确认删除U9编号 ${record.u9No} 的税收编码吗？`,
      icon: <ExclamationCircleFilled />,
      // content: 'Some descriptions',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      closable: true,
      maskClosable: true,
      onOk() {
        // console.log('OK');
        postInvoiceTaxNoDelete([record.id]);
      },
      onCancel() {
        // console.log('Cancel');
      },
    });
  };

  return (
    <PageContainer>
      {/* 操作栏 */}
      <Flex align="center" justify="space-between" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', width: '80%' }}>
          <Input
            value={showSearchGoodsNameText}
            placeholder="搜索商品名称..."
            prefix={<SearchOutlined style={{ color: '#737373' }} />}
            style={{ marginRight: 16 }}
            onChange={(e) => handleSearchGoodsNameText(e.target.value)}
          />
          <Input
            value={showSearchU9NoText}
            placeholder="搜索U9编号..."
            prefix={<SearchOutlined style={{ color: '#737373' }} />}
            style={{ marginRight: 16 }}
            onChange={(e) => handleSearchU9NoText(e.target.value)}
          />
          <Input
            value={showSearchTaxNoText}
            placeholder="搜索税收编码..."
            prefix={<SearchOutlined style={{ color: '#737373' }} />}
            style={{ marginRight: 16 }}
            onChange={(e) => handleSearchTaxNoText(e.target.value)}
          />
        </div>

        {/* <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => taxNoModalRef.current?.showModal('add')}
        >
          新增税收编码
        </Button> */}
      </Flex>
      <Table
        columns={columns}
        dataSource={tableData}
        size="small"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          pageSizeOptions: [10],
          total: total,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: handlePaginationChange,
        }}
      />

      <TaxNoModal ref={taxNoModalRef} onOk={postInvoiceTaxNoNew} onEdit={postInvoiceTaxNoUpdate} />
    </PageContainer>
  );
};

export default TaxNo;
