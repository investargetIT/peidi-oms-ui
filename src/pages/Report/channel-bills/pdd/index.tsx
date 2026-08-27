import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Upload,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
  type FinanceZfbBillConfig,
  type FinanceChannelExtendCostImportVo,
  type FinancePddBillUploadReq,
  type FinancePddPromotionAddReq,
} from '@/services/managementReportApi';
import { channelBillColumns } from '../columns';
import { useUploadTasks } from '../common/uploadTaskStore';

const PddBillPanel: React.FC = () => {
  const { addTask, updateTask } = useUploadTasks();
  const [billDate, setBillDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [shopName, setShopName] = useState<string>('');
  const [generateStatus, setGenerateStatus] = useState<number | undefined>(undefined);
  const [billLoading, setBillLoading] = useState(false);
  const [billData, setBillData] = useState<FinanceZfbBillInfoVo[]>([]);
  const [billPagination, setBillPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 上传账单相关
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDate, setUploadDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [configList, setConfigList] = useState<FinanceZfbBillConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | undefined>(undefined);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  // 上传走异步任务模式：弹窗关掉后由 UploadTaskDrawer 跟踪，无需在面板内阻塞 UI

  // 新增拼多多推广费相关
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedPromotionConfigId, setSelectedPromotionConfigId] = useState<number | undefined>(undefined);
  const [promotionAmount, setPromotionAmount] = useState<number | null>(null);
  const [promotionDate, setPromotionDate] = useState<Dayjs | null>(null);
  const [promotionSubmitting, setPromotionSubmitting] = useState(false);

  // 下拉框数据来源于外层 Table（billData），取 financeBillConfigId 去重
  const promotionConfigOptions = Array.from(
    new Map(
      billData
        .filter((r) => r.financeBillConfigId != null)
        .map((r) => [r.financeBillConfigId, r] as const),
    ).values(),
  ).map((r) => ({
    label: `${r.shopName || r.merchantName || '-'}（${r.billDate || '-'}）`,
    value: r.financeBillConfigId!,
  }));

  const fetchBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: billPagination.current,
        pageSize: billPagination.pageSize,
        billDate: billDate ? billDate.format('YYYY-MM') : undefined,
        shopName: shopName || undefined,
        generateStatus,
        platform: '拼多多',
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
      console.error('查询拼多多账单失败:', error);
      message.error('查询拼多多账单失败');
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
    setGenerateStatus(undefined);
    setBillPagination({ current: 1, pageSize: 10, total: 0 });
    fetchBill({ pageNum: 1 });
  };

  const fetchConfigList = async () => {
    setConfigLoading(true);
    try {
      const res = await ManagementReportApi.getBillConfigList({ platform: '拼多多' });
      if (res.code === 200) {
        // 过滤掉已删除的
        const list = (res.data || []).filter((c) => c.isDel !== 1);
        setConfigList(list);
      } else {
        message.error(res.msg || '获取账单配置失败');
      }
    } catch (error) {
      console.error('获取账单配置失败:', error);
      message.error('获取账单配置失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const openUploadModal = async () => {
    setUploadModalOpen(true);
    setUploadDate(dayjs().subtract(1, 'month'));
    setSelectedConfigId(undefined);
    setUploadFile(null);
    setConfigList([]);
    await fetchConfigList();
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setUploadFile(file);
      return false; // 阻止自动上传
    },
    fileList: uploadFile ? [{ uid: '1', name: uploadFile.name, status: 'done' }] : [],
    onRemove: () => {
      setUploadFile(null);
    },
    accept: '.xlsx,.xls,.csv',
  };

  const handleUpload = async () => {
    if (!uploadDate) {
      message.error('请选择账单日期');
      return;
    }
    if (!selectedConfigId) {
      message.error('请选择账单配置');
      return;
    }
    if (!uploadFile) {
      message.error('请选择要上传的账单文件');
      return;
    }

    const billDateStr = uploadDate.format('YYYY-MM');
    const fileName = uploadFile.name;
    const configLabel =
      configList.find((c) => c.id === selectedConfigId)?.merchantName ||
      configList.find((c) => c.id === selectedConfigId)?.shopName ||
      `配置#${selectedConfigId}`;

    // 1. 立刻关闭上传弹窗 & 重置表单
    setUploadModalOpen(false);
    setUploadFile(null);
    setSelectedConfigId(undefined);

    // 2. 创建任务（后端请求异步进行中，不阻塞 UI）
    const taskId = addTask({
      channel: '拼多多',
      shopName: configLabel,
      billDate: billDateStr,
      fileName,
    });
    message.success(`上传任务已提交，详见右下角任务卡片（共 1 项进行中）`);

    // 3. 异步执行上传（不 await 阻塞）
    ManagementReportApi.uploadPddBill({
      channel: 'pdd',
      date: billDateStr,
      financeBillConfigId: selectedConfigId,
      file: uploadFile,
    } as FinancePddBillUploadReq)
      .then((res) => {
        const result: FinanceChannelExtendCostImportVo =
          (res.data as FinanceChannelExtendCostImportVo) ||
          ({} as FinanceChannelExtendCostImportVo);
        if (res.code === 200 || res.success) {
          updateTask(taskId, {
            status: 'success',
            finishedAt: Date.now(),
            result,
          });
          // 任务完成：右下角卡片已展示详细结果，这里只弹一个简洁提示
          const fail = result.failCount ?? 0;
          const success = result.successCount ?? 0;
          const total = result.totalCount ?? 0;
          message.success(
            `【${configLabel} / ${billDateStr}】上传完成：共 ${total} 条，成功 ${success} 条${fail > 0 ? `，失败 ${fail} 条` : ''}`,
          );
          // 刷新列表
          fetchBill({ pageNum: 1 });
        } else {
          updateTask(taskId, {
            status: 'failed',
            finishedAt: Date.now(),
            errorMessage: res.msg || '上传失败',
          });
          message.error(res.msg || '上传失败');
        }
      })
      .catch((error) => {
        console.error('上传拼多多账单失败:', error);
        const errMsg =
          (error && (error.msg || error.message)) || '上传失败，请稍后重试';
        updateTask(taskId, {
          status: 'failed',
          finishedAt: Date.now(),
          errorMessage: errMsg,
        });
        message.error(errMsg);
      });
  };

  const handleAddPromotion = async () => {
    if (!selectedPromotionConfigId) {
      message.error('请选择账单配置');
      return;
    }
    if (!promotionAmount || Number(promotionAmount) <= 0) {
      message.error('请输入正确的推广金额');
      return;
    }
    if (!promotionDate) {
      message.error('请选择日期');
      return;
    }
    setPromotionSubmitting(true);
    try {
      const res = await ManagementReportApi.addPddPromotion({
        date: promotionDate.format('YYYY-MM-DD'),
        financeBillConfigId: selectedPromotionConfigId,
        promotionAmount: Number(promotionAmount),
      });
      if (res.code === 200 || res.success) {
        message.success('拼多多推广费上传成功');
        setPromotionModalOpen(false);
        setSelectedPromotionConfigId(undefined);
        setPromotionAmount(null);
        setPromotionDate(null);
        // 刷新列表
        fetchBill({ pageNum: 1 });
      } else {
        message.error(res.msg || '上传失败');
      }
    } catch (error) {
      console.error('新增拼多多推广费失败:', error);
      message.error('新增拼多多推广费失败');
    } finally {
      setPromotionSubmitting(false);
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
            <span style={{ fontSize: 12, color: '#666' }}>店铺名称</span>
            <Input style={{ width: 180 }} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="模糊匹配" allowClear />
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
                icon={<UploadOutlined />}
                onClick={openUploadModal}
              >
                上传账单
              </Button>
              <Button
                type="primary"
                className="grayblue-btn"
                style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectedPromotionConfigId(undefined);
                  setPromotionAmount(null);
                  setPromotionDate(null);
                  setPromotionModalOpen(true);
                }}
              >
                上传拼多多推广费
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <Table
        columns={channelBillColumns}
        dataSource={billData}
        rowKey="id"
        loading={billLoading}
        size="small"
        scroll={{ x: 1800 }}
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

      {/* 上传账单弹窗 */}
      <Modal
        title="上传拼多多账单"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        onOk={handleUpload}
        okText="开始上传"
        cancelText="取消"
        width={640}
        destroyOnClose
        okButtonProps={{
          className: 'grayblue-btn',
          style: { background: '#2f54eb', borderColor: '#2f54eb' },
        }}
      >
        <Alert
          type="info"
          showIcon
          message="上传说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 支持 .xlsx / .xls / .csv 格式<br />
              2. 请先在【账单配置】中维护该店铺的拼多多账单配置（accessToken、appId 等）<br />
              3. 账单日期格式：yyyy-MM（如 2026-07）
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单日期 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={uploadDate}
              onChange={(date) => setUploadDate(date)}
              format="YYYY-MM"
              placeholder="请选择月份"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单配置 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Select
              style={{ width: '100%' }}
              value={selectedConfigId}
              onChange={(v) => setSelectedConfigId(v)}
              placeholder={configLoading ? '加载中...' : '请选择账单配置（来自 /oms/finance/bill-config/list）'}
              loading={configLoading}
              allowClear
              showSearch
              optionFilterProp="label"
              options={configList.map((c) => ({
                label: `${c.merchantName || c.shopName || '-'}${c.appId ? `（AppId: ${c.appId}）` : ''}`,
                value: c.id,
              }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} disabled={configLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 新增拼多多推广费弹窗 */}
      <Modal
        title="新增拼多多推广费"
        open={promotionModalOpen}
        onCancel={() => setPromotionModalOpen(false)}
        onOk={handleAddPromotion}
        confirmLoading={promotionSubmitting}
        okText="确定"
        cancelText="取消"
        width={520}
        destroyOnClose
        okButtonProps={{
          className: 'grayblue-btn',
          style: { background: '#2f54eb', borderColor: '#2f54eb' },
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单配置 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Select
              style={{ width: '100%' }}
              value={selectedPromotionConfigId}
              onChange={(v) => setSelectedPromotionConfigId(v)}
              placeholder="请选择账单配置（来自下方账单列表）"
              allowClear
              showSearch
              optionFilterProp="label"
              options={promotionConfigOptions}
              notFoundContent="暂无账单配置，请先查询账单列表"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              推广金额（元） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <InputNumber
              style={{ width: '100%' }}
              value={promotionAmount}
              onChange={(v) => setPromotionAmount(v)}
              placeholder="请输入推广金额"
              min={0}
              precision={2}
              addonAfter="元"
              controls={false}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              日期 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker
              style={{ width: '100%' }}
              value={promotionDate}
              onChange={(date) => setPromotionDate(date)}
              format="YYYY-MM-DD"
              placeholder="请选择日期"
              allowClear
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PddBillPanel;
