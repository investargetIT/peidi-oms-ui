import { ExclamationCircleOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  message,
  Row,
  Select,
  Table,
  TableColumnsType,
  TableProps,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import InvoiceModal from './Modal';
import type { InvoiceModalRef } from './Modal';
import InvoiceApi from '@/services/invoiceApi';
import type { PageParams } from '@/services/invoiceApi';
import { useDebounceSearch } from '@/hooks/useDebounce';

export interface DataType {
  /** 主键ID */
  id: number;
  /** 单据日期 */
  date: string;
  /** 组织名称 */
  organizationName: string;
  /** 单据编号 */
  documentNumber: string;
  /** 单据类型 */
  documentType: string;
  /** 客户编码 */
  customerCode: string;
  /** 料号 */
  materialCode: string;
  /** 货号 */
  productCode: string;
  /** 商家编码 */
  merchantSku: string;
  /** 料品名称 */
  materialName: string;
  /** 料品形态 */
  materialForm: string;
  /** 品牌 */
  brandName: string;
  /** 采购分类 */
  procurementCategory: string;
  /** 出库数量 */
  outboundQty: number;
  /** 销售单位 */
  salesUnit: string;
  /** 最终价 */
  finalPrice: number;
  /** 价税合计(本币) */
  totalTaxAmount: number;
  /** 批号 */
  batchNumber: string;
  /** 创建人 */
  createdBy: string;
  /** 来源单据号 */
  sourceDocument: string;
  /** 出货量(库存单位) */
  stockOutQty: number;
  /** 库存单位 */
  inventoryUnit: string;
  /** 存储地点 */
  storageLocation: string;
  /** 累计立账数量(计价单位) */
  accountedQty: number;
  /** 累计立账金额 */
  accountedAmount: number;
  /** 出货单行信息.立账日 */
  accountingDate: string;
  /** 实际出货量(成本单位) */
  actualOutQty: number;
  /** 成本单位 */
  costUnit: number;
  /** 状态:0待提交；1待审核；2已审核；3已下载 */
  status: number;
  /** 申请编号 */
  appNo: string | null;
  /** 申请时间 */
  appTime: string | null;
  /** 申请人 */
  appUser: string | null;
  /** 记录列表 */
  recordList: any[] | null;
}

const columns: TableColumnsType<DataType> = [
  {
    title: '单据日期',
    dataIndex: 'date',
  },
  {
    title: '单据编号',
    dataIndex: 'documentNumber',
  },
  {
    title: '单据类型',
    dataIndex: 'documentType',
  },
  {
    title: '客户编码',
    dataIndex: 'customerCode',
  },
  {
    title: '料号',
    dataIndex: 'materialCode',
  },
  {
    title: '货号',
    dataIndex: 'productCode',
  },
  {
    title: '商家编码',
    dataIndex: 'merchantSku',
  },
  {
    title: '料品名称',
    dataIndex: 'materialName',
  },
  {
    title: '料品形态',
    dataIndex: 'materialForm',
  },
  {
    title: '品牌',
    dataIndex: 'brandName',
  },
  {
    title: '采购分类',
    dataIndex: 'procurementCategory',
  },
  {
    title: '出库数量',
    dataIndex: 'outboundQty',
  },
  {
    title: '销售单位',
    dataIndex: 'salesUnit',
  },
  {
    title: '最终价',
    dataIndex: 'finalPrice',
  },
  {
    title: '价税合计',
    dataIndex: 'totalTaxAmount',
  },
  {
    title: '批号',
    dataIndex: 'batchNumber',
  },
  {
    title: '创建人',
    dataIndex: 'createdBy',
  },
  {
    title: '来源单据号',
    dataIndex: 'sourceDocument',
  },
];

const data: DataType[] = [];

const Invoice: React.FC = () => {
  const invoiceModalRef = useRef<InvoiceModalRef>(null);

  // 是否显示提示栏
  const [showTip, setShowTip] = useState(false);
  // 表格数据
  const [tableData, setTableData] = useState<DataType[]>([]);

  //#region 筛选逻辑
  // Input搜索使用通用防抖钩子
  const [searchDocumentNumberText, showSearchDocumentNumberText, handleSearchDocumentNumberText] =
    useDebounceSearch('');
  const [searchCustomerCodeText, showSearchCustomerCodeText, handleSearchCustomerCodeText] =
    useDebounceSearch('');
  const [searchMaterialNameText, showSearchMaterialNameText, handleSearchMaterialNameText] =
    useDebounceSearch('');
  // const [type, setType] = useState('全部类型');
  // const [custom, setCustom] = useState('全部客户');

  // 处理筛选参数方法
  const getSearchStr = () => {
    const searchParams = [];
    if (searchDocumentNumberText) {
      searchParams.push({
        searchName: 'documentNumber',
        searchType: 'like',
        searchValue: `${searchDocumentNumberText}`,
      });
    }
    if (searchCustomerCodeText) {
      searchParams.push({
        searchName: 'customerCode',
        searchType: 'like',
        searchValue: `${searchCustomerCodeText}`,
      });
    }
    if (searchMaterialNameText) {
      searchParams.push({
        searchName: 'materialName',
        searchType: 'like',
        searchValue: `${searchMaterialNameText}`,
      });
    }
    return JSON.stringify(searchParams);
  };
  //#endregion

  //#region 表格状态逻辑
  // 已经选择的项
  const [selectedRows, setSelectedRows] = useState<DataType[]>([]);
  // 已经选择的项的金额合计
  const [totalPrice, setTotalPrice] = useState('0');

  // 金额统计
  useEffect(() => {
    const total = selectedRows.reduce((acc, cur) => acc + Number(cur.totalTaxAmount), 0);
    setTotalPrice(total.toString());
  }, [selectedRows]);
  //#endregion

  // rowSelection object indicates the need for row selection
  const rowSelection: TableProps<DataType>['rowSelection'] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
      setSelectedRows(selectedRows);
      // 检查是否有多个客户
      const uniqueCustomers = new Set(selectedRows.map((item) => item.customerCode));
      setShowTip(uniqueCustomers.size > 1);
    },
    getCheckboxProps: (record: DataType) => ({
      // disabled: record.key === 'Disabled User', // Column configuration not to be checked
      name: record.date,
    }),
  };

  //#region 分页逻辑
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
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
  }, [pagination, searchDocumentNumberText, searchCustomerCodeText, searchMaterialNameText]);
  // 分页获取开票申请方法
  const getInvoiceNoAppPage = async (params: PageParams) => {
    const res = await InvoiceApi.getInvoiceNoAppPage(params);
    if (res.code === 200) {
      // 如果当前页大于总页数，重置为第一页 排除总页数为0的情况
      if (res.data?.current > res.data?.pages && res.data?.total !== 0) {
        setPagination({
          current: res.data?.pages,
          pageSize: pagination.pageSize,
        });
        return;
      }
      // 为数据添加key字段，使用id作为key
      const dataWithKey = (res.data?.records || []).map((item) => ({
        ...item,
        key: item.id, // 使用id作为key
      }));
      setTableData(dataWithKey);
      setTotal(res.data?.total || 0);
      // 重置选中项
      setSelectedRows([]);
      setTotalPrice('0');
    }
  };
  // 刷新分页方法  可复用
  const refreshPagination = () => {
    getInvoiceNoAppPage({
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
      searchStr: getSearchStr(),
    });
  };

  // 修改开票状态方法
  const postInvoiceApp = async (data: any[]) => {
    console.log('开票申请数据', data);
    // 遍历data修改status为1
    const res = await InvoiceApi.postInvoiceApp(
      data.map((item) => ({
        ...item,
        status: 1,
        appUser: JSON.parse(localStorage.getItem('user-check') || '{}')?.username,
      })),
    );
    if (res.code === 200) {
      message.success('开票申请成功');
      invoiceModalRef.current?.handleCancel();
      // 刷新分页
      refreshPagination();
    }
  };
  //#endregion

  return (
    <PageContainer>
      {/* 操作栏 */}
      <div style={{ marginBottom: 24, display: 'flex' }}>
        <Input
          value={showSearchDocumentNumberText}
          placeholder="搜索单据编号..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => handleSearchDocumentNumberText(e.target.value)}
        />
        <Input
          value={showSearchCustomerCodeText}
          placeholder="搜索客户..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => handleSearchCustomerCodeText(e.target.value)}
        />
        <Input
          value={showSearchMaterialNameText}
          placeholder="搜索料品名称..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => handleSearchMaterialNameText(e.target.value)}
        />
        {/* <Select
          defaultValue="全部类型"
          style={{ width: 150, marginRight: 16 }}
          options={[
            { value: '全部类型', label: '全部类型' },
            { value: '内陆出货', label: '内陆出货' },
            { value: '跨境出货', label: '跨境出货' },
          ]}
          onChange={(value) => setType(value)}
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
          onChange={(value) => setCustom(value)}
        /> */}
      </div>
      {/* 提示栏 */}
      {!showTip ? null : (
        <div
          style={{
            color: '#e7000b',
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <ExclamationCircleOutlined color="#e7000b" style={{ marginRight: 8 }} />
          您选择的订单涉及多个不同客户，无法提交开票申请。系统要求只能为同一客户的订单开票，请重新选择订单。
        </div>
      )}
      {/* 表格状态栏 */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div style={{ color: '#737373' }}>
          <span>
            已选择
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {selectedRows.length}
            </span>
            项
          </span>
          <span style={{ marginLeft: 16 }}>
            合计金额：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              ¥{totalPrice}
            </span>
          </span>
        </div>
        <Button
          disabled={showTip || selectedRows.length === 0}
          type="primary"
          icon={<FileTextOutlined />}
          onClick={() => invoiceModalRef.current?.showModal()}
        >
          提交开票申请
        </Button>
      </Flex>
      {/* 表格 */}
      <Table<DataType>
        rowSelection={{ type: 'checkbox', ...rowSelection }}
        columns={columns}
        dataSource={tableData}
        scroll={{ x: 'max-content' }}
        size="small"
        pagination={{
          showTotal: (total, range) => `共 ${total} 条`,
          current: pagination.current,
          total,
          defaultPageSize: 15,
          pageSizeOptions: [15, 50, 100],
          onChange: (page, pageSize) => handlePaginationChange(page, pageSize),
        }}
      />
      {/* 开票申请弹窗 */}
      <InvoiceModal ref={invoiceModalRef} selectedRows={selectedRows} onOk={postInvoiceApp} />
    </PageContainer>
  );
};

export default Invoice;
