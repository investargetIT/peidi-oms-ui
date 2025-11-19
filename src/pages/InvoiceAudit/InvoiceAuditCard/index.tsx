import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  CheckboxChangeEvent,
  Flex,
  message,
  Table,
  TableColumnsType,
  Tag,
} from 'antd';
import React, { useState } from 'react';
import type { DataType } from '@/pages/Invoice/index';
import type { InvoiceModalRef } from '../Modal';
import type { InvoiceAuditItem } from '../PendingReview';
import dayjs from 'dayjs';
import { handleFormData } from '@/pages/InvoiceAudit/utils/excel';
import InvoiceApi from '@/services/invoiceApi';

const columns: TableColumnsType<DataType> = [
  {
    title: ' 序号 ',
    render: (text, record, index) => `${index + 1}`, //每一页都从1开始
    fixed: 'left', // 固定在左侧
  },
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

// props 定义
interface InvoiceAuditCardProps {
  // 类型 -枚举：待审核warning 已通过success 已下载info
  type: 'warning' | 'success' | 'info';
  // 父组件传递的 ref
  modalRef?: React.RefObject<InvoiceModalRef>;
  // 内容数据
  dataSource: InvoiceAuditItem;
  // 处理勾选事件
  onCheckboxChange?: (checked: boolean, record: InvoiceAuditItem) => void;
  // 告诉卡片需要勾选状态
  checkedInvoice?: boolean;
  // 修改开票状态方法
  postInvoiceApp?: (data: any[], status: number) => void;
}

//#region 权限逻辑
const ddUserInfo = JSON.parse(localStorage.getItem('ddUserInfo') || '{}');
const ddDeptIds = ddUserInfo?.dept_id_list || [];
const canInvoiceAudit = ddDeptIds.length > 0 && ddDeptIds[0] !== 934791329; // 销售综合部
//#endregion

const InvoiceAuditCard: React.FC<InvoiceAuditCardProps> = ({
  type,
  modalRef,
  dataSource,
  onCheckboxChange,
  checkedInvoice,
  postInvoiceApp,
}) => {
  // 审核通过
  const handleOk = () => {
    if (!modalRef) return;
    if (modalRef.current) {
      modalRef.current.initData(dataSource);
      modalRef.current.showModal('approve');
    }
  };
  // 审核驳回
  const handleCancel = () => {
    if (!modalRef) return;
    if (modalRef.current) {
      modalRef.current.initData(dataSource);
      modalRef.current.showModal('reject');
    }
  };
  // 勾选事件
  const handleCheck = (checked: CheckboxChangeEvent) => {
    if (!onCheckboxChange) return;
    // console.log('勾选事件', checked.target.checked, dataSource);
    onCheckboxChange(checked.target.checked, dataSource);
  };
  // 下载开票模板
  const handleDownload = () => {
    console.log('下载开票模板', dataSource);
    // 存储客户信息
    const customerInfo: any = [];
    // 存储开票税务信息
    const invoiceTaxInfo: any = [];

    // 先请求回来客户信息数据
    InvoiceApi.getInvoiceCustomerPage({
      pageNo: 1,
      pageSize: 1000,
      searchStr: JSON.stringify([
        {
          searchName: 'customerName',
          searchType: 'equals',
          searchValue: `\"${dataSource.customerCode}\"`,
        },
      ]),
    }).then((res) => {
      if (res.code === 200) {
        console.log('获取客户信息成功', res.data || {});
        customerInfo.push(...res.data.records);

        const goodsList: any[] = [];
        dataSource.recordList.forEach((item) => {
          goodsList.push({
            u9No: item.materialCode,
          });
        });

        console.log('料号列表', goodsList);
        // 再请求回来开票税务信息
        InvoiceApi.postInvoiceAppTax(goodsList).then((res) => {
          if (res.code === 200) {
            console.log('获取开票税务信息成功', res.data || {});
            invoiceTaxInfo.push(...res.data);
            handleFormData(
              dataSource.recordList,
              customerInfo,
              invoiceTaxInfo,
              `发票信息${dayjs().format('YYYYMMDDHHmmss')}`,
            );
            if (!postInvoiceApp) return;
            postInvoiceApp(dataSource.recordList, 3);
          } else {
            console.log('获取开票税务信息失败', res.data || {});
            message.error('获取开票税务信息失败');
          }
        });
      } else {
        console.log('获取客户信息失败', res.data || {});
        message.error('获取客户信息失败');
      }
    });
  };
  return (
    <Card>
      {/* 头部信息 */}
      <Flex align="center" justify="space-between">
        {/* 左侧 */}
        <Flex align="flex-start">
          <Checkbox
            checked={checkedInvoice}
            disabled={type === 'warning' || type === 'info'}
            style={{ marginTop: 2, marginRight: 15 }}
            onChange={(checked) => handleCheck(checked)}
          ></Checkbox>
          <div>
            <Flex align="center">
              <div
                style={{ color: '#0a0a0a', fontSize: '18px', fontWeight: 'bold', marginRight: 10 }}
              >
                申请编号: {dataSource.appNo}
              </div>
              <div>
                {type === 'warning' && (
                  <>
                    <Tag icon={<ClockCircleOutlined />} color="warning">
                      待审核
                    </Tag>
                    <span style={{ color: '#737373' }}>(需审核通过后才能开票)</span>
                  </>
                )}
                {type === 'success' && (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已通过
                  </Tag>
                )}
                {type === 'info' && <Tag icon={<DownloadOutlined />}>已下载</Tag>}
              </div>
            </Flex>
            <div style={{ color: '#737373', marginTop: 5 }}>
              提交时间: {dayjs(dataSource.appTime).format('YYYY-MM-DD HH:mm:ss')} | 提交人:{' '}
              {dataSource.appUser}
            </div>
          </div>
        </Flex>
        {/* 右侧 */}
        <Flex justify="flex-end" align="flex-end" vertical>
          <div style={{ color: '#737373' }}>开票客户</div>
          <div style={{ color: '#0a0a0a', fontSize: '18px', fontWeight: 'bold' }}>
            {dataSource.customerCode}
          </div>
        </Flex>
      </Flex>
      {/* 表格状态 */}
      <Flex style={{ marginTop: 16, marginBottom: 16 }} justify="flex-start" align="center">
        <div style={{ color: '#737373', marginRight: 5 }}>订单数量:</div>
        <div style={{ color: '#0a0a0a', fontSize: '16px', fontWeight: 'bold', marginRight: 18 }}>
          {dataSource.recordList?.length || 0} 个
        </div>
        <div style={{ color: '#737373', marginRight: 5 }}>合计金额:</div>
        <div style={{ color: '#0a0a0a', fontSize: '16px', fontWeight: 'bold', marginRight: 18 }}>
          ¥
          {dataSource.recordList
            ?.reduce((acc, cur) => acc + cur.totalTaxAmount, 0)
            .toLocaleString()}
        </div>
        <div style={{ color: '#737373', marginRight: 5 }}>合计出库数量:</div>
        <div style={{ color: '#0a0a0a', fontSize: '16px', fontWeight: 'bold' }}>
          {dataSource.recordList?.reduce((acc, cur) => acc + cur.outboundQty, 0)} 个
        </div>
      </Flex>
      {/* 表格 */}
      <Table<DataType>
        columns={columns}
        dataSource={dataSource.recordList || []}
        scroll={{ x: 'max-content', y: 55 * 6 }}
        pagination={{ position: ['none'], defaultPageSize: 1000 }}
        size="small"
        style={{ border: '1px solid #e8e8e8', borderRadius: 8 }}
      />
      {/* 操作按钮 */}
      <Flex justify="flex-end" align="center" style={{ marginTop: 24 }}>
        {(type === 'success' || type === 'info') && (
          <Button icon={<DownloadOutlined />} onClick={() => handleDownload()}>
            下载开票模板
          </Button>
        )}

        {type === 'warning' && (
          <>
            <Button
              icon={<CloseCircleOutlined />}
              style={{ marginRight: 12 }}
              onClick={() => handleCancel()}
              disabled={!canInvoiceAudit}
            >
              驳回
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              type="primary"
              onClick={() => handleOk()}
              disabled={!canInvoiceAudit}
            >
              通过
            </Button>
          </>
        )}
      </Flex>
    </Card>
  );
};

export default InvoiceAuditCard;
