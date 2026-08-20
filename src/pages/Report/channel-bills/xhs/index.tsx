import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Upload,
  message,
} from 'antd';
import { SearchOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
  type FinanceZfbBillConfig,
  type FinanceChannelExtendCostImportVo,
} from '@/services/managementReportApi';
import { channelBillColumns } from '../columns';
import { useUploadTasks } from '../common/uploadTaskStore';

const XhsBillPanel: React.FC = () => {
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
  // 小红书上传需要 2 个文件：贷款明细(file1) + 订单结算明细(file2)
  const [uploadFile1, setUploadFile1] = useState<File | null>(null);
  const [uploadFile2, setUploadFile2] = useState<File | null>(null);
  // 上传走异步任务模式：弹窗关掉后由 UploadTaskDrawer 跟踪，无需在面板内阻塞 UI

  const fetchBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: billPagination.current,
        pageSize: billPagination.pageSize,
        billDate: billDate ? billDate.format('YYYY-MM') : undefined,
        shopName: shopName || undefined,
        generateStatus,
        platform: '小红书',
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
      console.error('查询小红书账单失败:', error);
      message.error('查询小红书账单失败');
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

  // 小红书目前暂不开放生成账单功能，改为支持手动上传账单
  const fetchConfigList = async () => {
    setConfigLoading(true);
    try {
      const res = await ManagementReportApi.getBillConfigList({ platform: '小红书' });
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
    setUploadFile1(null);
    setUploadFile2(null);
    setConfigList([]);
    await fetchConfigList();
  };

  // 贷款明细文件 (file1)
  const uploadFile1Props: UploadProps = {
    beforeUpload: (file) => {
      setUploadFile1(file);
      return false; // 阻止自动上传
    },
    fileList: uploadFile1 ? [{ uid: '1', name: uploadFile1.name, status: 'done' }] : [],
    onRemove: () => {
      setUploadFile1(null);
    },
    accept: '.xlsx,.xls,.csv',
  };

  // 订单结算明细文件 (file2)
  const uploadFile2Props: UploadProps = {
    beforeUpload: (file) => {
      setUploadFile2(file);
      return false; // 阻止自动上传
    },
    fileList: uploadFile2 ? [{ uid: '2', name: uploadFile2.name, status: 'done' }] : [],
    onRemove: () => {
      setUploadFile2(null);
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
    if (!uploadFile1) {
      message.error('请选择贷款明细文件');
      return;
    }
    if (!uploadFile2) {
      message.error('请选择订单结算明细文件');
      return;
    }

    const billDateStr = uploadDate.format('YYYY-MM');
    // 任务卡片展示：把 2 个文件名拼成 "贷款明细.xlsx + 订单结算明细.xlsx"
    const fileName = `${uploadFile1.name} + ${uploadFile2.name}`;
    const configLabel =
      configList.find((c) => c.id === selectedConfigId)?.merchantName ||
      configList.find((c) => c.id === selectedConfigId)?.shopName ||
      `配置#${selectedConfigId}`;

    // 1. 立刻关闭上传弹窗 & 重置表单
    setUploadModalOpen(false);
    setUploadFile1(null);
    setUploadFile2(null);
    setSelectedConfigId(undefined);

    // 2. 创建任务（后端请求异步进行中，不阻塞 UI）
    const taskId = addTask({
      channel: '小红书',
      shopName: configLabel,
      billDate: billDateStr,
      fileName,
    });
    message.success(`上传任务已提交，详见右下角任务卡片（共 1 项进行中）`);

    // 3. 异步执行上传（不 await 阻塞）
    ManagementReportApi.uploadXhsBill({
      billDate: billDateStr,
      financeBillConfigId: selectedConfigId,
      file1: uploadFile1,
      file2: uploadFile2,
    })
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
        console.error('上传小红书账单失败:', error);
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
        title="上传小红书账单"
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
              2. 小红书一次需要上传 <b>2 个文件</b>：贷款明细（file1，A1为"创建时间"）+ 订单结算明细（file2，A1为"订单号"），缺一不可<br />
              3. 请先在【账单配置】中维护该店铺的小红书账单配置<br />
              4. 账单日期格式：yyyy-MM（如 2026-07）
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
              贷款明细文件（file1，A1为"创建时间"） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadFile1Props}>
              <Button icon={<UploadOutlined />} disabled={configLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              订单结算明细文件（file2，A1为"订单号"） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadFile2Props}>
              <Button icon={<UploadOutlined />} disabled={configLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default XhsBillPanel;
