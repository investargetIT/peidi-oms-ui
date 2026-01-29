import {
  ClearOutlined,
  DownloadOutlined,
  ExclamationCircleFilled,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  TableColumnsType,
  TableProps,
  Tooltip,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import InvoiceModal from './Modal';
import type { InvoiceModalRef } from './Modal';
import InvoiceApi from '@/services/invoiceApi';
import type { PageParams } from '@/services/invoiceApi';
import { useDebounceSearch } from '@/hooks/useDebounce';
import dayjs from 'dayjs';
// 添加导出工具导入
import { exportInvoiceDataToExcel, exportSelectedRowsToExcel } from './utils';
// 导入localStorage配置管理
import configManager, { ConfigKeys } from '@/utils/localStorageConfig';

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
  /** 不含税合计 */
  taxExcludedAmount: number;
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
    title: '不含税合计',
    dataIndex: 'taxExcludedAmount',
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
  {
    title: '组织',
    dataIndex: 'organizationName',
  },
];

const data: DataType[] = [];

const Invoice: React.FC = () => {
  const invoiceModalRef = useRef<InvoiceModalRef>(null);

  // 是否显示提示栏
  const [showTip, setShowTip] = useState(false);
  // 表格数据
  const [tableData, setTableData] = useState<DataType[]>([]);

  //#region 时间选择逻辑
  // 默认当月
  const [dateRange, setDateRange] = useState<any>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  // 处理时间选择变化
  const handleDateRangeChange = (value: any) => {
    // console.log('dateRange', value);
    setDateRange(value);
  };
  useEffect(() => {
    // 时间选择变化时需要重置选中项;
    setSelectedRows([]);
    setTotalTaxExcludedAmount(0);
    setTotalPrice(0);
    setTotalQuantity(0);
    // console.log('selectedRowKeys', selectedRowKeys);
    setSelectedRowKeys([]);
    setShowTip(false);
  }, [dateRange]);
  //#endregion

  //#region 筛选逻辑
  // 精确筛选  客户编码
  // 客户编码筛选列表
  const [searchCustomerCodeList, setSearchCustomerCodeList] = useState<any[]>([]);
  const [searchCustomerCodeSelect, setSearchCustomerCodeSelect] = useState();

  // Input搜索使用通用防抖钩子
  const [searchDocumentNumberText, showSearchDocumentNumberText, handleSearchDocumentNumberText] =
    useDebounceSearch('');
  const [searchCustomerCodeText, showSearchCustomerCodeText, handleSearchCustomerCodeText] =
    useDebounceSearch('');
  const [searchMaterialNameText, showSearchMaterialNameText, handleSearchMaterialNameText] =
    useDebounceSearch('');
  const [searchSourceDocumentText, showSearchSourceDocumentText, handleSearchSourceDocumentText] =
    useDebounceSearch('');
  const [searchOrganizationText, showSearchOrganizationText, handleSearchOrganizationText] =
    useDebounceSearch('');
  // const [type, setType] = useState('全部类型');
  // const [custom, setCustom] = useState('全部客户');

  // 处理筛选参数方法
  const getSearchStr = () => {
    // 默认添加时间选择参数
    const searchParams = [
      {
        searchName: 'date',
        searchType: 'betweenStr',
        searchValue: dateRange.map((item: dayjs.Dayjs) => item.format('YYYY-MM-DD')).join(','),
      },
    ];
    if (searchDocumentNumberText) {
      searchParams.push({
        searchName: 'documentNumber',
        searchType: 'equals',
        searchValue: `\"${searchDocumentNumberText}\"`,
      });
    }
    if (searchCustomerCodeSelect) {
      searchParams.push({
        searchName: 'customerCode',
        searchType: 'equals',
        searchValue: `\"${searchCustomerCodeSelect}\"`,
      });
    }
    // if (searchCustomerCodeText) {
    //   searchParams.push({
    //     searchName: 'customerCode',
    //     searchType: 'like',
    //     searchValue: `${searchCustomerCodeText}`,
    //   });
    // }
    // if (searchMaterialNameText) {
    //   searchParams.push({
    //     searchName: 'materialName',
    //     searchType: 'like',
    //     searchValue: `${searchMaterialNameText}`,
    //   });
    // }
    if (searchSourceDocumentText) {
      searchParams.push({
        searchName: 'sourceDocument',
        searchType: 'like',
        searchValue: `${searchSourceDocumentText}`,
      });
    }
    if (searchOrganizationText) {
      searchParams.push({
        searchName: 'organizationName',
        searchType: 'like',
        searchValue: `${searchOrganizationText}`,
      });
    }
    return JSON.stringify(searchParams);
  };
  //#endregion

  //#region 表格状态逻辑
  // 用于存储选中的行Key 和selectedRows不同， selectedRows存的是数据，要读取使用的，而selectedRowKeys用于来清空表格记录的历史选择项，因为提交表单后我不要再记录选中项了
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // 已经选择的项 -历史选择项 包含翻页后的数据
  const [selectedRows, setSelectedRows] = useState<DataType[]>([]);
  // 已经选择的项的不含税合计合计
  const [totalTaxExcludedAmount, setTotalTaxExcludedAmount] = useState(0);
  // 已经选择的项的金额合计
  const [totalPrice, setTotalPrice] = useState(0);
  // 已经选择的项的数量合计
  const [totalQuantity, setTotalQuantity] = useState(0);

  // 金额和数量合计统计
  useEffect(() => {
    const totalTaxExcludedAmount = selectedRows.reduce(
      (acc, cur) => acc + Number(cur.taxExcludedAmount),
      0,
    );
    setTotalTaxExcludedAmount(totalTaxExcludedAmount);
    const total = selectedRows.reduce((acc, cur) => acc + Number(cur.totalTaxAmount), 0);
    setTotalPrice(total);
    const totalQuantity = selectedRows.reduce((acc, cur) => acc + Number(cur.outboundQty), 0);
    setTotalQuantity(totalQuantity);
  }, [selectedRows]);
  //#endregion

  // rowSelection object indicates the need for row selection
  const rowSelection: TableProps<DataType>['rowSelection'] = {
    onChange: useCallback(
      (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
        console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
        setSelectedRows(selectedRows);
        setSelectedRowKeys(selectedRowKeys);

        // 检查是否有多个客户
        // const uniqueCustomers = new Set(selectedRows.map((item) => item.customerCode));
        // setShowTip(uniqueCustomers.size > 1);

        // 优化客户检查逻辑，使用更高效的方法
        let hasMultipleCustomers = false;
        let firstCustomerCode = '';

        for (let i = 0; i < selectedRows.length; i++) {
          const customerCode = selectedRows[i].customerCode;
          if (i === 0) {
            firstCustomerCode = customerCode;
          } else if (customerCode !== firstCustomerCode) {
            hasMultipleCustomers = true;
            break; // 发现多个客户立即退出循环
          }
        }

        setShowTip(hasMultipleCustomers);
      },
      [setSelectedRows, setSelectedRowKeys, setShowTip],
    ),
    getCheckboxProps: (record: DataType) => ({
      // disabled: record.key === 'Disabled User', // Column configuration not to be checked
      name: record.date,
    }),
    preserveSelectedRowKeys: true, // 当数据被删除时仍然保留选项的 key
    selectedRowKeys: selectedRowKeys,
  };

  //#region 分页逻辑
  const initialPageSize =
    configManager.get<{ pageSize: number }>(ConfigKeys.INVOICE_PAGINATION)?.pageSize || 15;
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: initialPageSize,
  });
  const [total, setTotal] = useState(0);

  const handlePaginationChange = (page: number, pageSize: number) => {
    // 保存新的pageSize到localStorage
    configManager.set(ConfigKeys.INVOICE_PAGINATION, { pageSize });

    setPagination({
      current: page,
      pageSize,
    });
  };
  //#endregion

  //#region 请求逻辑
  // 客户编码筛选列表 初始化时获取
  useEffect(() => {
    getInvoiceNoAppFieldList('customerCode');
  }, []);
  // 筛选触发时查询  页面变化时查询
  useEffect(() => {
    refreshPagination();
  }, [
    pagination,
    searchDocumentNumberText,
    searchCustomerCodeSelect,
    // searchCustomerCodeText,
    // searchMaterialNameText,
    searchSourceDocumentText,
    searchOrganizationText,
    dateRange,
  ]);

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
      // 重置选中项 因为要记录历史选中信息，这里不重置
      // setSelectedRows([]);
      // setTotalPrice(0);
      // setTotalQuantity(0);
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
      // 重置选中项
      setSelectedRows([]);
      setTotalTaxExcludedAmount(0);
      setTotalPrice(0);
      setTotalQuantity(0);
      setSelectedRowKeys([]);
    }
  };

  // 获取字段列表
  const getInvoiceNoAppFieldList = async (field: string) => {
    const res = await InvoiceApi.getInvoiceNoAppFieldList({ field });
    if (res.code === 200) {
      // console.log('字段列表', res.data || []);
      // 根据field做个筛选 只要field为customerCode的
      const fieldList =
        res.data.map((item: any) => ({ value: item[field], label: item[field] })) || [];
      // console.log('customerCode字段列表', fieldList);
      setSearchCustomerCodeList(fieldList);
    }
  };
  //#endregion

  //#region 导出功能
  // 导出所有数据
  const handleExportAllData = async () => {
    const temp = [
      {
        searchName: 'date',
        searchType: 'betweenStr',
        searchValue: dateRange.map((item: dayjs.Dayjs) => item.format('YYYY-MM-DD')).join(','),
      },
    ];

    await exportInvoiceDataToExcel(JSON.stringify(temp));
  };
  //#endregion

  // 清空所有选择项
  const handleClearSelection = () => {
    setSelectedRows([]);
    // setTotalTaxExcludedAmount(0);
    // setTotalPrice(0);
    // setTotalQuantity(0);
    setSelectedRowKeys([]);
    setShowTip(false);
    // 注意：totalTaxExcludedAmount、totalPrice、totalQuantity 会通过 useEffect 自动重置
    // 因为它们依赖于 selectedRows，当 selectedRows 为空时，计算结果为 0
  };

  //#region 提交开票申请逻辑
  const [submitInvoiceAppLoading, setSubmitInvoiceAppLoading] = useState(false);
  // 提交开票申请
  const handleSubmitInvoiceApp = async () => {
    setSubmitInvoiceAppLoading(true);
    try {
      const documentNumbers: string[] = [];
      const documentNumbersDetail: Record<string, number> = {};
      const invoiceNoAppPageDetail: Record<string, number> = {};
      const invoiceAppPageDetail: Record<string, any[]> = {};
      // 遍历selectedRows  记录documentNumber和customerCode
      selectedRows.forEach((item) => {
        if (!documentNumbersDetail[item.documentNumber]) {
          documentNumbers.push(item.documentNumber);
          documentNumbersDetail[item.documentNumber] = 1;
        } else {
          documentNumbersDetail[item.documentNumber]++;
        }
      });

      //#region 判断开票申请里是否有相同的单据编号
      const noAppParams = {
        pageNo: 1,
        pageSize: 1000,
        searchStr: JSON.stringify([
          {
            searchName: 'documentNumber',
            searchType: 'like',
            searchValue: documentNumbers.join('&#&'),
          },
        ]),
      };
      const resGetInvoiceNoAppPage = await InvoiceApi.getInvoiceNoAppPage(noAppParams);
      if (checkInvoiceNoAppPage()) return;

      function checkInvoiceNoAppPage() {
        if (resGetInvoiceNoAppPage.data?.records?.length > 0) {
          console.log('判断开票申请里是否有相同的单据编号:', resGetInvoiceNoAppPage.data.records);

          resGetInvoiceNoAppPage.data.records.forEach((item) => {
            if (!invoiceNoAppPageDetail[item.documentNumber]) {
              invoiceNoAppPageDetail[item.documentNumber] = 1;
            } else {
              invoiceNoAppPageDetail[item.documentNumber]++;
            }
          });

          for (const documentNumber of documentNumbers) {
            if (invoiceNoAppPageDetail[documentNumber] > documentNumbersDetail[documentNumber]) {
              message.error(`单据编号${documentNumber}还存在没勾选的数据，请全部勾选后再提交`);
              setSubmitInvoiceAppLoading(false);
              return true;
            }
          }
          return false;
        }
        return false;
      }
      //#endregion

      //#region 判断开票审核里是否有当前选中的单据编号
      const appParams = {
        pageNo: 1,
        pageSize: 1000,
        searchStr: JSON.stringify([
          {
            searchName: 'documentNumber',
            searchType: 'like',
            searchValue: documentNumbers.join('&#&'),
          },
          { searchName: 'status', searchType: 'equals', searchValue: '1' },
        ]),
      };
      const resGetInvoiceAppPage = await InvoiceApi.getInvoiceAppPage(appParams);
      await checkInvoiceAppPage();

      async function checkInvoiceAppPage() {
        if (resGetInvoiceAppPage.data?.records?.length > 0) {
          // console.log('判断开票申请里是否有相同的单据编号:', resGetInvoiceAppPage.data.records);

          resGetInvoiceAppPage.data.records.forEach((item) => {
            if (!invoiceAppPageDetail[item.documentNumber]) {
              invoiceAppPageDetail[item.documentNumber] = [];
            }
            invoiceAppPageDetail[item.documentNumber].push(item);
          });
        }

        for (const documentNumber of documentNumbers) {
          if (invoiceAppPageDetail[documentNumber]?.length > 0) {
            // message.error(`单据编号${documentNumber}已存在开票申请`);

            Modal.confirm({
              title: `已存在未审核的开票审核`,
              icon: <ExclamationCircleFilled />,
              content: `开票审核中已经存在单据编号${documentNumber}未审核的数据，是否需要一键撤回所有未审核的单据编号为${documentNumber}的数据？`,
              async onOk() {
                return new Promise((resolve, reject) => {
                  InvoiceApi.postInvoiceApp(
                    invoiceAppPageDetail[documentNumber].map((item) => ({
                      ...item,
                      status: 0,
                      appUser: '',
                      appNo: '',
                      appTime: '',
                    })),
                  )
                    .then((res) => {
                      if (res.code === 200) {
                        resolve(true);
                        message.success(`已成功撤回所有未审核的单据编号为${documentNumber}的数据`);
                        refreshPagination();
                        return;
                      } else {
                        message.error(`单据编号${documentNumber}撤回失败：${res.msg}`);
                        reject(res.msg);
                      }
                    })
                    .catch((error) => {
                      console.error('撤回开票审核失败:', error);
                      message.error(`单据编号${documentNumber}撤回失败：${error}`);
                      reject(error);
                    });
                })
                  .catch(() => {})
                  .finally(() => {
                    setSubmitInvoiceAppLoading(false);
                  });
              },
              onCancel() {
                // console.log('Cancel');
                setSubmitInvoiceAppLoading(false);
              },
            });
            return;
          }
        }

        invoiceModalRef.current?.showModal();
        setSubmitInvoiceAppLoading(false);
      }
      //#endregion
    } catch (error) {
    } finally {
      setSubmitInvoiceAppLoading(false);
    }
  };
  //#endregion

  return (
    <PageContainer>
      {/* 数据日期范围 */}
      <div>
        <DatePicker.RangePicker
          style={{ marginBottom: 12 }}
          allowClear={false}
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>
      {/* 筛选栏 */}
      <div
        style={{
          marginBottom: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <Select
          value={searchCustomerCodeSelect}
          onChange={(value) => setSearchCustomerCodeSelect(value)}
          showSearch
          placeholder="搜索客户..."
          options={searchCustomerCodeList}
          allowClear
        />
        <Input
          value={showSearchDocumentNumberText}
          placeholder="搜索单据编号..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          onChange={(e) => handleSearchDocumentNumberText(e.target.value)}
        />
        {/* <Input
          value={showSearchCustomerCodeText}
          placeholder="搜索客户..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => handleSearchCustomerCodeText(e.target.value)}
        /> */}
        {/* <Input
          value={showSearchMaterialNameText}
          placeholder="搜索料品名称..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          style={{ marginRight: 16 }}
          onChange={(e) => handleSearchMaterialNameText(e.target.value)}
        /> */}
        <Input
          value={showSearchSourceDocumentText}
          placeholder="搜索来源单据号..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          onChange={(e) => handleSearchSourceDocumentText(e.target.value)}
        />
        <Input
          value={showSearchOrganizationText}
          placeholder="搜索组织..."
          prefix={<SearchOutlined style={{ color: '#737373' }} />}
          onChange={(e) => handleSearchOrganizationText(e.target.value)}
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
            marginBottom: 12,
          }}
        >
          <ExclamationCircleOutlined color="#e7000b" style={{ marginRight: 8 }} />
          您选择的订单涉及多个不同客户，无法提交开票申请。系统要求只能为同一客户的订单开票，请重新选择订单。
        </div>
      )}
      {/* 表格状态栏 */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <div style={{ color: '#737373' }}>
          <span>
            已选择
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {selectedRows.length}
            </span>
            项
          </span>
          {selectedRows.length > 0 && (
            <Tooltip title="清空所有选择项">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearSelection}
                style={{ color: '#ff4d4f', border: '1px solid #ff4d4f', marginLeft: 12 }}
              ></Button>
            </Tooltip>
          )}
          <span style={{ marginLeft: 16 }}>
            不含税合计：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              ¥
              {totalTaxExcludedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </span>
          <span style={{ marginLeft: 16 }}>
            价税合计：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              ¥
              {totalPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </span>
          <span style={{ marginLeft: 16 }}>
            合计出库数量：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {totalQuantity.toLocaleString()}
            </span>
          </span>
        </div>
        <Space size={24}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            style={{ background: '#217346', borderColor: '#217346' }}
            onClick={handleExportAllData}
          >
            导出未开票数据
          </Button>
          <Button
            disabled={showTip || selectedRows.length === 0}
            type="primary"
            icon={<FileTextOutlined />}
            onClick={handleSubmitInvoiceApp}
            loading={submitInvoiceAppLoading}
          >
            提交开票申请
          </Button>
        </Space>
      </Flex>
      {/* 表格 */}
      <Table<DataType>
        rowSelection={{ type: 'checkbox', ...rowSelection, fixed: true }}
        columns={columns}
        dataSource={tableData}
        scroll={{ x: 'max-content' }}
        size="small"
        pagination={{
          showTotal: (total, range) => `共 ${total} 条`,
          current: pagination.current,
          total,
          pageSize: pagination.pageSize,
          pageSizeOptions: [15, 50, 100, 300],
          onChange: (page, pageSize) => handlePaginationChange(page, pageSize),
          showSizeChanger: true,
        }}
      />
      {/* 开票申请弹窗 */}
      <InvoiceModal ref={invoiceModalRef} selectedRows={selectedRows} onOk={postInvoiceApp} />
    </PageContainer>
  );
};

export default Invoice;
