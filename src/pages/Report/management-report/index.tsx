import React, { useState } from 'react';
import { Button, DatePicker, Select, Space, Table, message } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import ManagementReportApi, {
  type ManagementReportQueryReq,
  type FinanceGoodsSalesSummaryAllCostVo,
  type SalesOutDetailsCostVo,
  type WalmartRebateQueryVo,
} from '@/services/managementReportApi';

const ManagementReportTab: React.FC = () => {
  // 数据类型：1-线上 2-线下 3-沃尔玛
  const [mrType, setMrType] = useState<number>(1);
  // 销售月份（单月选择，起止都用同一个值）
  const [mrStartMonth, setMrStartMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );
  const [mrEndMonth, setMrEndMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );
  const [mrLoading, setMrLoading] = useState(false);
  const [mrOnlineList, setMrOnlineList] = useState<FinanceGoodsSalesSummaryAllCostVo[]>([]);
  const [mrOfflineList, setMrOfflineList] = useState<SalesOutDetailsCostVo[]>([]);
  const [mrWalmartList, setMrWalmartList] = useState<WalmartRebateQueryVo[]>([]);

  // 管报数据查询
  const fetchManagementReport = async (overrides?: {
    type?: number;
    startMonth?: Dayjs | null;
    endMonth?: Dayjs | null;
  }) => {
    const _type = overrides?.type !== undefined ? overrides.type : mrType;
    const _startMonth = overrides?.startMonth !== undefined ? overrides.startMonth : mrStartMonth;
    const _endMonth = overrides?.endMonth !== undefined ? overrides.endMonth : mrEndMonth;

    if (!_startMonth || !_endMonth) {
      message.error('请选择销售月份');
      return;
    }

    const params: ManagementReportQueryReq = {
      type: _type,
      startDate: _startMonth.startOf('month').format('YYYY-MM-DD'),
      endDate: _endMonth.endOf('month').format('YYYY-MM-DD'),
    };

    setMrLoading(true);
    try {
      const res = await ManagementReportApi.query(params);
      if (res.code === 200) {
        const data = res.data || ({} as any);
        setMrOnlineList(data.onlineList || []);
        setMrOfflineList(data.offlineList || []);
        setMrWalmartList(data.walmartList || []);
        message.success('查询成功');
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询管报数据失败:', error);
      message.error('查询管报数据失败');
    } finally {
      setMrLoading(false);
    }
  };

  // 管报数据查询 - 下载当月全量数据（原封不动）
  const handleMrDownload = async () => {
    let dataList: any[] = [];
    let columns: any[] = [];

    if (mrType === 1) {
      dataList = mrOnlineList;
      columns = mrOnlineColumns;
    } else if (mrType === 2) {
      dataList = mrOfflineList;
      columns = mrOfflineColumns;
    } else if (mrType === 3) {
      dataList = mrWalmartList;
      columns = mrWalmartColumns;
    }

    if (!dataList.length) {
      message.warning('当前没有可下载的数据，请先查询');
      return;
    }

    const typeLabel = mrType === 1 ? '线上' : mrType === 2 ? '线下' : '沃尔玛';
    const monthLabel = (mrStartMonth || dayjs().subtract(1, 'month')).format('YYYY-MM');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Peidi OMS';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('管报数据');

      // 表头
      const headers = columns.map((col) => col.title);
      sheet.addRow(headers);
      // 数据（原封不动，仅取列对应的 dataIndex 字段）
      dataList.forEach((record) => {
        const rowValues = columns.map((col) => {
          // 若列有 render，用 render 的展示值；否则直接用原始字段值
          if (typeof col.render === 'function') {
            return col.render(record[col.dataIndex], record, 0);
          }
          return record[col.dataIndex] ?? '';
        });
        sheet.addRow(rowValues);
      });

      // 简易列宽
      sheet.columns = headers.map((h, idx) => ({
        width: Math.max(12, (h as string).length * 2 + 4),
        key: String(idx),
      }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `管报数据-${typeLabel}-${monthLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      message.success('下载成功');
    } catch (error) {
      console.error('下载管报数据失败:', error);
      message.error('下载管报数据失败');
    }
  };

  // 重置管报数据查询条件
  const handleMrReset = () => {
    const defaults = {
      type: 1 as number,
      startMonth: dayjs().subtract(1, 'month'),
      endMonth: dayjs().subtract(1, 'month'),
    };
    setMrType(defaults.type);
    setMrStartMonth(defaults.startMonth);
    setMrEndMonth(defaults.endMonth);
    setMrOnlineList([]);
    setMrOfflineList([]);
    setMrWalmartList([]);
    fetchManagementReport(defaults);
  };

  // 管报数据查询 - 线上表格列（type=1）
  const mrOnlineColumns = [
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '成本匹配来源',
      dataIndex: 'costMatchSource',
      key: 'costMatchSource',
      width: 140,
    },
  ];

  // 管报数据查询 - 线下表格列（type=2）
  const mrOfflineColumns = [
    {
      title: '创建时间',
      dataIndex: 'created',
      key: 'created',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '规格编码',
      dataIndex: 'specNo',
      key: 'specNo',
      width: 140,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '店铺名称',
      dataIndex: 'shopName',
      key: 'shopName',
      width: 180,
    },
  ];

  // 管报数据查询 - 沃尔玛/山姆表格列（type=3）
  const mrWalmartColumns = [
    {
      title: '创建时间',
      dataIndex: 'created',
      key: 'created',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '规格编码',
      dataIndex: 'specNo',
      key: 'specNo',
      width: 140,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '店铺品牌',
      dataIndex: 'shopBrand',
      key: 'shopBrand',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '返利率',
      dataIndex: 'rebateRate',
      key: 'rebateRate',
      width: 80,
    },
  ];

  return (
    <>
      {/* 搜索栏 */}
      <div
        style={{
          marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              {/* 数据类型 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>数据类型</span>
                <Select
                  style={{ width: 150 }}
                  value={mrType}
                  onChange={(value) => setMrType(value)}
                  options={[
                    { label: '线上', value: 1 },
                    { label: '线下', value: 2 },
                    { label: '沃尔玛', value: 3 },
                  ]}
                />
              </div>

              {/* 销售月份（不跟数据类型联动，统一用月份选择器） */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>
                  销售月份 <span style={{ color: 'red' }}>*</span>
                </span>
                <DatePicker.MonthPicker
                  style={{ width: 180 }}
                  value={mrStartMonth}
                  onChange={(date) => {
                    setMrStartMonth(date);
                    setMrEndMonth(date);
                  }}
                  format="YYYY-MM"
                  placeholder="请选择月份"
                  allowClear
                />
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
                <Space>
                  <Button
                    type="primary"
                    onClick={() => fetchManagementReport()}
                    icon={<SearchOutlined />}
                    loading={mrLoading}
                  >
                    查询
                  </Button>
                  <Button
                    type="primary"
                    style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                    icon={<DownloadOutlined />}
                    onClick={handleMrDownload}
                  >
                    下载
                  </Button>
                  <Button onClick={handleMrReset}>重置</Button>
                </Space>
              </div>
            </div>
          </div>

          {/* 表格 - 根据类型展示对应列表 */}
          {mrType === 1 && (
            <Table
              columns={mrOnlineColumns}
              dataSource={mrOnlineList}
              rowKey={(_record, index) => `online-${index ?? 0}`}
              loading={mrLoading}
              size="small"
              scroll={{ x: 2000 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          )}
          {mrType === 2 && (
            <Table
              columns={mrOfflineColumns}
              dataSource={mrOfflineList}
              rowKey={(_record, index) => `offline-${index ?? 0}`}
              loading={mrLoading}
              size="small"
              scroll={{ x: 2200 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          )}
          {mrType === 3 && (
            <Table
              columns={mrWalmartColumns}
              dataSource={mrWalmartList}
              rowKey={(_record, index) => `walmart-${index ?? 0}`}
              loading={mrLoading}
              size="small"
              scroll={{ x: 2600 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          )}
        </>
  );
};

export default ManagementReportTab;
