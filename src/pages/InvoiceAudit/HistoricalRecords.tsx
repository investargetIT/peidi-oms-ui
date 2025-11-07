import React, { useEffect, useState } from 'react';
import InvoiceAuditCard from './InvoiceAuditCard';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { InvoiceAuditItem } from './PendingReview';
import { InvoiceApi, type PageParams } from '@/services/invoiceApi';
import { useDebounceSearch } from '@/hooks/useDebounce';

const HistoricalRecords: React.FC = () => {
  // 数据列表
  const [dataSource, setDataSource] = useState<InvoiceAuditItem[]>([]);

  //#region 筛选逻辑
  // Input搜索使用通用防抖钩子
  const [searchAppNoText, showSearchAppNoText, handleSearchAppNoText] = useDebounceSearch('');
  const [searchCustomerCodeText, showSearchCustomerCodeText, handleSearchCustomerCodeText] =
    useDebounceSearch('');
  const [searchAppUserText, showSearchAppUserText, handleSearchAppUserText] = useDebounceSearch('');

  // 处理筛选参数方法
  const getSearchStr = () => {
    const searchParams = [];
    searchParams.push({
      searchName: 'status',
      searchType: 'equals',
      searchValue: '3',
    });
    if (searchAppNoText) {
      searchParams.push({
        searchName: 'appNo',
        searchType: 'like',
        searchValue: searchAppNoText,
      });
    }
    if (searchCustomerCodeText) {
      searchParams.push({
        searchName: 'customerCode',
        searchType: 'like',
        searchValue: searchCustomerCodeText,
      });
    }
    if (searchAppUserText) {
      searchParams.push({
        searchName: 'appUser',
        searchType: 'like',
        searchValue: searchAppUserText,
      });
    }

    return JSON.stringify(searchParams);
  };
  //#endregion

  //#region 请求逻辑
  // 筛选触发时查询
  useEffect(() => {
    refreshPagination();
  }, [searchAppNoText, searchCustomerCodeText, searchAppUserText]);
  // 分页获取开票审核
  const getInvoiceAppPage = async (params: PageParams) => {
    const res = await InvoiceApi.getInvoiceAppPage(params);
    if (res.code === 200) {
      console.log('获取开票审核成功', res.data.records || []);
      // setDataSource(res.data.records || []);
      // FIXME: 先自己做一遍筛选，只保留status为3的
      setDataSource(res.data.records.filter((item) => item.status === 3) || []);
    }
  };
  // 刷新分页方法  可复用
  const refreshPagination = () => {
    getInvoiceAppPage({
      pageNo: 1,
      pageSize: 1000,
      search: getSearchStr(),
    });
  };
  //#endregion
  return (
    <>
      {/* 操作栏 */}
      <div style={{ marginBottom: 12, display: 'flex' }}>
        <Input
          value={showSearchAppNoText}
          onChange={(e) => handleSearchAppNoText(e.target.value)}
          placeholder="搜索申请编号..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
        />
        <Input
          value={showSearchCustomerCodeText}
          onChange={(e) => handleSearchCustomerCodeText(e.target.value)}
          placeholder="搜索客户..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
        />
        <Input
          value={showSearchAppUserText}
          onChange={(e) => handleSearchAppUserText(e.target.value)}
          placeholder="搜索提交人..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
        />
        {/* <Select
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
        /> */}
      </div>
      {/* 卡片 */}
      <div>
        {dataSource.map((item) => (
          <>
            <InvoiceAuditCard key={item.id} type="info" dataSource={item} />
            <div style={{ marginBottom: 12 }}></div>
          </>
        ))}
      </div>
    </>
  );
};

export default HistoricalRecords;
