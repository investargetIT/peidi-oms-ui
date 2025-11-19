import React, { useEffect, useState } from 'react';
import InvoiceAuditCard from './InvoiceAuditCard';
import {
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Flex, Input, message, Select, Spin } from 'antd';
import InvoiceAuditModal from './Modal';
import type { InvoiceModalRef } from './Modal';
import InvoiceApi from '@/services/invoiceApi';
import type { PageParams } from '@/services/invoiceApi';
import type { DataType as InvoiceDataType } from '@/pages/Invoice/index';
import { useDebounceSearch } from '@/hooks/useDebounce';
import { handleFormData } from './utils/excel';
import dayjs from 'dayjs';

export interface InvoiceAuditItem {
  /** 已核算金额 */
  accountedAmount: number;

  /** 已核算数量 */
  accountedQty: number;

  /** 核算日期 */
  accountingDate: string;

  /** 实际出库数量 */
  actualOutQty: number;

  /** 申请编号 */
  appNo: string;

  /** 申请时间 */
  appTime: string;

  /** 申请人 */
  appUser: string | null;

  /** 批次号 */
  batchNumber: string;

  /** 品牌名称 */
  brandName: string;

  /** 成本单位 */
  costUnit: number;

  /** 创建人 */
  createdBy: string;

  /** 客户代码 */
  customerCode: string;

  /** 日期 */
  date: string;

  /** 单据编号 */
  documentNumber: string;

  /** 单据类型 */
  documentType: string;

  /** 最终价格 */
  finalPrice: number;

  /** 唯一标识ID */
  id: number;

  /** 库存单位 */
  inventoryUnit: string;

  /** 物料代码 */
  materialCode: string;

  /** 物料形式 */
  materialForm: string;

  /** 物料名称 */
  materialName: string;

  /** 商家SKU */
  merchantSku: string;

  /** 组织名称 */
  organizationName: string;

  /** 出库数量 */
  outboundQty: number;

  /** 采购类别 */
  procurementCategory: string;

  /** 产品代码 */
  productCode: string;

  /** 记录列表 */
  recordList: InvoiceDataType[];

  /** 销售单位 */
  salesUnit: string;

  /** 源单据 */
  sourceDocument: string;

  /** 状态 (1: 待审核, 其他状态根据实际情况定义) */
  status: number;

  /** 出库数量 */
  stockOutQty: number;

  /** 存储位置 */
  storageLocation: string;

  /** 总税额 */
  totalTaxAmount: number;
}

const PendingReview: React.FC = () => {
  // 数据请求中
  const [loading, setLoading] = useState(false);

  const modalRef = React.useRef<InvoiceModalRef>(null);
  // 数据列表
  const [dataSource, setDataSource] = useState<InvoiceAuditItem[]>([]);
  //#region 选择已通过申请逻辑
  // 记录已经勾选的数据
  const [selectedDataList, setSelectedDataList] = useState<InvoiceAuditItem[]>([]);
  // 处理勾选事件
  const handleCheckboxChange = (checked: boolean, record: InvoiceAuditItem) => {
    if (checked) {
      setSelectedDataList([...selectedDataList, record]);
    } else {
      setSelectedDataList(selectedDataList.filter((item) => item.id !== record.id));
    }
  };
  // 全选已通过申请
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDataList(dataSource.filter((item) => item.status === 2));
    } else {
      setSelectedDataList([]);
    }
  };
  // 批量下载开票模板
  const handleDownload = () => {
    // 存储客户信息
    const customerInfo: any = [];
    // 存储开票税务信息
    const invoiceTaxInfo: any = [];

    console.log('selectedDataList', selectedDataList);
    // 遍历selectedDataList，获取所有客户编码customerCode进行拼接，用&#&隔开
    const customerCodes = selectedDataList.map((item) => `\"${item.customerCode}\"`).join('&#&');
    console.log('customerCodes', customerCodes);
    // 先请求回来客户信息数据
    InvoiceApi.getInvoiceCustomerPage({
      pageNum: 1,
      pageSize: 1000,
      searchStr: JSON.stringify([
        {
          searchName: 'customerName',
          searchType: 'equals',
          searchValue: `${customerCodes}`,
        },
      ]),
    }).then((res) => {
      if (res.code === 200) {
        console.log('获取客户信息成功', res.data || []);
        customerInfo.push(...res.data.records);
        const dataTemp: InvoiceDataType[] = [];
        selectedDataList.forEach((item: InvoiceAuditItem) => {
          dataTemp.push(...item.recordList);
        });

        const goodsList: any[] = [];
        dataTemp.forEach((item) => {
          goodsList.push({
            u9No: item.materialCode,
          });
        });

        // 再请求回来开票税务信息
        InvoiceApi.postInvoiceAppTax(goodsList).then((res) => {
          if (res.code === 200) {
            console.log('获取开票税务信息成功', res.data || {});
            invoiceTaxInfo.push(...res.data);
            handleFormData(
              dataTemp,
              customerInfo,
              invoiceTaxInfo,
              `发票信息${dayjs().format('YYYYMMDDHHmmss')}`,
            );
            postInvoiceApp(dataTemp, 3);
          } else {
            console.log('获取开票税务信息失败', res.data || {});
            message.error('获取开票税务信息失败');
          }
        });
      } else {
        message.error('获取客户信息失败');
      }
    });
  };
  //#endregion

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
      searchValue: '1&#&2',
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
    setLoading(true);
    const res = await InvoiceApi.getInvoiceAppPage(params);
    if (res.code === 200) {
      console.log('获取开票审核成功', res.data.records || []);
      setDataSource(res.data.records || []);
      // FIXME: 先自己做一遍筛选，只保留status为1或2的
      // setDataSource(
      //   res.data.records.filter((item) => item.status === 1 || item.status === 2) || [],
      // );
      //  清空选中数据列表
      setSelectedDataList([]);
      setLoading(false);
    } else {
      message.error('获取开票审核失败');
      setLoading(false);
    }
  };
  // 刷新分页方法  可复用
  const refreshPagination = () => {
    getInvoiceAppPage({
      pageNo: 1,
      pageSize: 1000,
      searchStr: getSearchStr(),
    });
  };

  // 修改开票状态方法  传入选中的开票申请数据，状态
  const postInvoiceApp = async (data: InvoiceDataType[], status: number) => {
    console.log('开票申请数据', data);
    // 把data里的每个status都设为status
    // return;
    const res = await InvoiceApi.postInvoiceApp(data.map((item) => ({ ...item, status })));
    if (res.code === 200) {
      if (status === 0) {
        message.success('驳回成功');
      }
      if (status === 2) {
        message.success('申请已通过');
      }
      if (status === 3) {
        message.success('开票模板已生成');
      }
      modalRef.current?.handleCancel();
      refreshPagination();
    }
  };
  //#endregion

  return (
    <>
      {/* 操作栏 */}
      <div style={{ marginBottom: 32, display: 'flex' }}>
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
            <Checkbox
              checked={selectedDataList.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />{' '}
            全选已通过申请
          </span>
          <span>
            已选择
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {selectedDataList.length}
            </span>
            个申请
          </span>
          <span style={{ marginLeft: 16 }}>
            合计金额：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {/* 需要算selectedDataList每个recordList的totalTaxAmount */}¥
              {selectedDataList.reduce(
                (acc, cur) =>
                  acc + cur.recordList?.reduce((acc2, cur2) => acc2 + cur2.totalTaxAmount, 0),
                0,
              )}
            </span>
          </span>
          <span style={{ marginLeft: 16 }}>
            合计出库数量：
            <span style={{ color: '#0a0a0a', fontSize: 16, fontWeight: 'bold' }}>
              {selectedDataList.reduce(
                (acc, cur) =>
                  acc + cur.recordList?.reduce((acc2, cur2) => acc2 + cur2.outboundQty, 0),
                0,
              )}
            </span>
          </span>
        </div>
        <Button
          disabled={selectedDataList.length === 0}
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload()}
        >
          批量下载开票模板
        </Button>
      </Flex>
      {/* 卡片 */}
      <div>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spin tip="数据请求中..." size="large">
              <div style={{ padding: 50, background: 'rgba(0, 0, 0, 0.05)', borderRadius: 4 }} />
            </Spin>
          </div>
        ) : null}
        {dataSource.map((item) => (
          <>
            <InvoiceAuditCard
              key={item.id}
              // 1: 待审核 2: 已开票
              type={item.status === 1 ? 'warning' : 'success'}
              modalRef={modalRef}
              dataSource={item}
              // 处理勾选事件
              onCheckboxChange={handleCheckboxChange}
              // 告诉卡片需要勾选状态
              checkedInvoice={selectedDataList.some((selectedItem) => selectedItem.id === item.id)}
              postInvoiceApp={postInvoiceApp}
            />
            <div style={{ marginBottom: 12 }}></div>
          </>
        ))}
      </div>
      <InvoiceAuditModal ref={modalRef} postInvoiceApp={postInvoiceApp} />
    </>
  );
};

export default PendingReview;
