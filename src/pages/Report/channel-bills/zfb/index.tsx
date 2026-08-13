import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
  type FinanceZfbBillGenerateReq,
} from '@/services/managementReportApi';
import { channelBillColumns } from '../columns';

const ZfbBillPanel: React.FC = () => {
  const [billDate, setBillDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [shopName, setShopName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [alipayMerchantNo, setAlipayMerchantNo] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [generateStatus, setGenerateStatus] = useState<number | undefined>(undefined);
  const [billLoading, setBillLoading] = useState(false);
  const [billData, setBillData] = useState<FinanceZfbBillInfoVo[]>([]);
  const [billPagination, setBillPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateCooldown, setGenerateCooldown] = useState<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FinanceZfbBillInfoVo[]>([]);
  const [batchExportLoading, setBatchExportLoading] = useState(false);

  const fetchBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: billPagination.current,
        pageSize: billPagination.pageSize,
        billDate: billDate ? billDate.format('YYYY-MM') : undefined,
        shopName: shopName || undefined,
        companyName: companyName || undefined,
        alipayMerchantNo: alipayMerchantNo || undefined,
        merchantName: merchantName || undefined,
        generateStatus,
        platform: '支付宝',
        ...params,
      };
      const res: { code: number; data?: IPageFinanceZfbBillInfoVo; msg?: string; success?: boolean } =
        await ManagementReportApi.getZfbBillPage(searchParams);
      if (res.code === 200) {
        const data = res.data || ({} as IPageFinanceZfbBillInfoVo);
        setBillData(data.records || []);
        setBillPagination({ current: data.current || 1, pageSize: data.size || 10, total: data.total || 0 });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询支付宝账单失败:', error);
      message.error('查询支付宝账单失败');
    } finally {
      setBillLoading(false);
    }
  };

  const handleSearch = () => {
    setBillPagination((prev) => ({ ...prev, current: 1 }));
    fetchBill({ pageNum: 1 });
  };

  const handleReset = () => {
    setBillDate(null);
    setShopName('');
    setCompanyName('');
    setAlipayMerchantNo('');
    setMerchantName('');
    setGenerateStatus(undefined);
    setBillPagination({ current: 1, pageSize: 10, total: 0 });
    setSelectedRowKeys([]);
    setSelectedRows([]);
    fetchBill({ pageNum: 1 });
  };

  const startGenerateCooldown = () => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setGenerateCooldown(60);
    cooldownTimerRef.current = setInterval(() => {
      setGenerateCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (generateCooldown > 0) {
      message.warning(`操作过于频繁，请 ${generateCooldown} 秒后再试`);
      return;
    }
    if (!billDate) {
      message.error('请先选择账单日期');
      return;
    }
    const params: FinanceZfbBillGenerateReq = { billDate: billDate.format('YYYY-MM') };
    Modal.confirm({
      title: '生成支付宝月账单',
      content: `确定要生成 ${params.billDate} 的支付宝月账单吗？`,
      okText: '确认生成',
      cancelText: '取消',
      okButtonProps: {
        className: 'grayblue-btn',
        style: { background: '#2f54eb', borderColor: '#2f54eb' },
      },
      onOk: async () => {
        // 只有用户点了"确认生成"才启动 60 秒倒计时，避免取消后仍然处于冷却
        startGenerateCooldown();
        setGenerateLoading(true);
        try {
          const res = await ManagementReportApi.generateZfbBill(params);
          if (res.code === 200 || res.success) {
            message.success('生成任务已提交，请稍后刷新查看');
            fetchBill({ pageNum: 1 });
          } else if (res.code === 500) {
            message.error(typeof res.data === 'string' ? res.data : res.msg || '生成失败');
          } else {
            message.error(res.msg || '生成失败');
          }
        } catch (error) {
          console.error('生成支付宝账单失败:', error);
          message.error('生成支付宝账单失败');
        } finally {
          setGenerateLoading(false);
        }
      },
    });
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleBatchExport = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先勾选要导出的账单');
      return;
    }
    const validRows = selectedRows.filter((r) => r.id && r.fileUrl && r.fileUrl.trim() !== '');
    if (validRows.length === 0) {
      message.error('所选记录中没有可下载的账单文件');
      return;
    }
    setBatchExportLoading(true);
    let progressClose: (() => void) | null = null;
    const closeProgress = () => {
      if (progressClose) {
        progressClose();
        progressClose = null;
      }
    };
    const updateProgress = (text: string) => {
      closeProgress();
      progressClose = message.loading(text, 0) as unknown as () => void;
    };
    try {
      updateProgress(`正在打包 ${validRows.length} 个账单，请稍候...`);
      // 走后端代理：前端把选中的账单 id 列表发给后端，
      // 后端到 OSS 拉文件（服务端之间无 CORS），打包成 zip 流式返回，
      // 前端只需 saveAs 一个包，避免了"挨个开页面"和"fetch 跨域"两个问题。
      const zipBlob = await ManagementReportApi.batchDownloadZfbBill({
        ids: validRows.map((r) => r.id as number),
        platform: '支付宝',
      });
      const zipName = `支付宝账单批量导出_${dayjs().format('YYYYMMDD_HHmmss')}.zip`;
      saveAs(zipBlob, zipName);
      message.success(`已成功导出 ${validRows.length} 个账单`);
      clearSelection();
    } catch (error: any) {
      console.error('批量导出失败:', error);
      const errMsg =
        error?.response?.data?.msg ||
        error?.response?.data?.message ||
        error?.message ||
        '批量导出失败，请确认后端 /zfb-bill/batch-download 接口已实现';
      message.error(errMsg);
    } finally {
      closeProgress();
      setBatchExportLoading(false);
    }
  };

  useEffect(() => {
    fetchBill({ pageNum: 1 });
  }, []);
  return (
    <>
      <style>{`
        .grayblue-btn.ant-btn-primary[disabled],
        .grayblue-btn.ant-btn-primary[disabled]:hover,
        .grayblue-btn.ant-btn-primary[disabled]:focus,
        .grayblue-btn.ant-btn-primary[disabled]:active {
          background: #d9d9d9 !important;
          border-color: #d9d9d9 !important;
          color: #ffffff !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
        }
      `}</style>

      <Alert
        type="info"
        showIcon
        message="支付宝提示信息"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div>
              1. 使用 <a href="mailto:peidizhichuang2001@163.com" onClick={(e) => e.stopPropagation()}>peidizhichuang2001@163.com</a> 登陆 <a href="https://auth.alipay.com/login/index.htm?goto=https%3A%2F%2Fopen.alipay.com%2Fdevelop%2Fmanage" target="_blank" rel="noopener noreferrer">https://auth.alipay.com/login/index.htm?goto=https%3A%2F%2Fopen.alipay.com%2Fdevelop%2Fmanage</a>
            </div>
            <div>
              2. 控制台点击 "接囗测试模板应用" -&gt; 点击商家授权 -&gt; 授权后返回到上一页面获取 token（参考文档：<a href="https://opendocs.alipay.com/isv/0ie70v?pathHash=1b160ce4" target="_blank" rel="noopener noreferrer">https://opendocs.alipay.com/isv/0ie70v?pathHash=1b160ce4</a>）
            </div>
            <div>
              3. <strong>生成账单提醒：</strong>月账单格式为 yyyy-MM，最早可下载近 6 年的月账单。不支持下载当月账单，只能下载上一月账单数据，当月账单一般在次月 3 日生成，特殊情况可能延迟。
            </div>
          </div>
        }
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>账单日期</span>
            <DatePicker.MonthPicker
              style={{ width: 160 }}
              value={billDate}
              onChange={(date) => setBillDate(date)}
              format="YYYY-MM"
              placeholder="请选择月份"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>公司名称</span>
            <Input style={{ width: 180 }} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="模糊匹配" allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>店铺名称</span>
            <Input style={{ width: 180 }} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="模糊匹配" allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>授权商家名称</span>
            <Input style={{ width: 180 }} value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="模糊匹配" allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>支付宝商户号</span>
            <Input style={{ width: 180 }} value={alipayMerchantNo} onChange={(e) => setAlipayMerchantNo(e.target.value)} placeholder="模糊匹配" allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>生成状态</span>
            <Select
              style={{ width: 140 }}
              value={generateStatus}
              onChange={(v) => setGenerateStatus(v)}
              placeholder="请选择"
              allowClear
              options={[
                { label: '待生成', value: 0 },
                { label: '生成中', value: 1 },
                { label: '生成成功', value: 2 },
                { label: '生成失败', value: 3 },
                { label: '无业务数据', value: 5 },
                { label: '未知错误', value: 6 },
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
            <Space>
              <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />} loading={billLoading}>搜索</Button>
              <Button onClick={handleReset}>重置</Button>
              <Button
                type="primary"
                className="grayblue-btn"
                style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                icon={<FileTextOutlined />}
                onClick={handleGenerate}
                loading={generateLoading}
                disabled={generateCooldown > 0}
              >
                {generateCooldown > 0 ? `生成账单 (${generateCooldown}s)` : '生成账单'}
              </Button>
              <Button
                type="primary"
                className="grayblue-btn"
                style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                icon={<FileTextOutlined />}
                onClick={handleBatchExport}
                loading={batchExportLoading}
                disabled={selectedRowKeys.length === 0}
              >
                批量导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
              </Button>
            </Space>
          </div>
        </div>
      </div>
      <div
        style={{
          marginBottom: 8,
          padding: '6px 12px',
          background: selectedRowKeys.length > 0 ? '#e6f4ff' : 'transparent',
          border: selectedRowKeys.length > 0 ? '1px solid #91caff' : 'none',
          borderRadius: 4,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 32,
        }}
      >
        {selectedRowKeys.length > 0 ? (
          <>
            <span>已选 <strong style={{ color: '#2f54eb', fontSize: 14 }}>{selectedRowKeys.length}</strong> 条账单（可跨页继续勾选）</span>
            <Button type="link" size="small" onClick={clearSelection}>清空选择</Button>
          </>
        ) : (
          <span style={{ color: '#999' }}>未勾选任何账单</span>
        )}
      </div>

      <Table
        columns={channelBillColumns}
        dataSource={billData}
        rowKey="id"
        loading={billLoading}
        size="small"
        scroll={{ x: 1800 }}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows as FinanceZfbBillInfoVo[]);
          },
          getCheckboxProps: (record: FinanceZfbBillInfoVo) => ({
            disabled: !record.fileUrl,
          }),
        }}
        pagination={{
          ...billPagination,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setBillPagination((prev) => ({ ...prev, current: page, pageSize: pageSize || 10 }));
            fetchBill({ pageNum: page, pageSize });
          },
        }}
      />
    </>
  );
};

export default ZfbBillPanel;
