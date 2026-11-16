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
  Tag,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import { SearchOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
  type FinanceZfbBillGenerateVo,
  type FinanceZfbBillGenerateAccountVo,
  type FinanceChannelExtendCostImportVo,
} from '@/services/managementReportApi';
import { channelBillColumns } from '../columns';
import { useUploadTasks } from '../common/uploadTaskStore';
import ExportAllBillsButton from '../common/ExportAllBillsButton';

/** 账单生成状态展示 */
const GENERATE_STATUS_META: Record<number, { color: string; text: string }> = {
  0: { color: 'default', text: '待生成' },
  1: { color: 'processing', text: '生成中' },
  2: { color: 'success', text: '生成成功' },
  3: { color: 'error', text: '生成失败' },
  5: { color: 'warning', text: '无业务数据' },
  6: { color: 'error', text: '未知错误' },
};

const renderGenerateStatus = (status?: number | null) => {
  if (status === null || status === undefined) return <Tag>未生成</Tag>;
  const meta = GENERATE_STATUS_META[status];
  return meta ? <Tag color={meta.color}>{meta.text}</Tag> : <Tag>{status}</Tag>;
};

const ZfbBillPanel: React.FC = () => {
  const { addTask, updateTask } = useUploadTasks();
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
  // 生成账单：账户选择弹窗 + 触发状态
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountList, setAccountList] = useState<FinanceZfbBillGenerateAccountVo[]>([]);
  const [selectedConfigIds, setSelectedConfigIds] = useState<number[]>([]);
  const [generateInfo, setGenerateInfo] = useState<FinanceZfbBillGenerateVo | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FinanceZfbBillInfoVo[]>([]);
  const [batchExportLoading, setBatchExportLoading] = useState(false);

  // 缺货赔付账单上传相关
  const [stockoutModalOpen, setStockoutModalOpen] = useState(false);
  const [stockoutDate, setStockoutDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [stockoutList, setStockoutList] = useState<FinanceZfbBillInfoVo[]>([]);
  const [stockoutLoading, setStockoutLoading] = useState(false);
  const [selectedStockoutId, setSelectedStockoutId] = useState<number | undefined>(undefined);
  const [stockoutFile, setStockoutFile] = useState<File | null>(null);

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
      const res: {
        code: number;
        data?: IPageFinanceZfbBillInfoVo;
        msg?: string;
        success?: boolean;
      } = await ManagementReportApi.getZfbBillPage(searchParams);
      if (res.code === 200) {
        const data = res.data || ({} as IPageFinanceZfbBillInfoVo);
        setBillData(data.records || []);
        setBillPagination({
          current: data.current || 1,
          pageSize: data.size || 10,
          total: data.total || 0,
        });
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

  const startGenerateCooldown = (seconds: number) => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    const safe = Math.max(0, Math.floor(seconds || 0));
    setGenerateCooldown(safe);
    if (safe <= 0) return;
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

  const formatCooldown = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const stopGeneratePolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // 触发后每 30 秒刷新一次，直到没有「生成中」的账号（最多轮询 30 分钟）
  const startGeneratePolling = () => {
    stopGeneratePolling();
    const yearMonth = billDate ? billDate.format('YYYY-MM') : '';
    if (!yearMonth) return;
    let ticks = 0;
    pollTimerRef.current = setInterval(async () => {
      ticks += 1;
      try {
        // 刷新当前可见列表
        fetchBill({ pageNum: billPagination.current });
        // 用不带筛选条件的全量查询判断是否还有「生成中」
        const res = await ManagementReportApi.getZfbBillPage({
          pageNum: 1,
          pageSize: 500,
          billDate: yearMonth,
          platform: '支付宝',
        });
        const records = res.data?.records || [];
        const stillGenerating = records.some((r) => r.generateStatus === 1);
        // 刚触发时记录可能还没落库，至少轮询 2 次再判断结束
        if ((!stillGenerating && ticks >= 2) || ticks >= 60) stopGeneratePolling();
      } catch (error) {
        console.warn('轮询支付宝账单生成状态失败', error);
      }
    }, 30000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const applyGenerateInfo = (data: FinanceZfbBillGenerateVo) => {
    setGenerateInfo(data);
    startGenerateCooldown(data.cooldownRemainingSeconds || 0);
  };

  // 默认勾选：已配置 token 且该月未成功（null / 3 / 5 / 6）的账号
  const pickDefaultConfigIds = (accounts: FinanceZfbBillGenerateAccountVo[]) =>
    accounts
      .filter(
        (a) =>
          a.tokenConfigured !== false &&
          (a.generateStatus === null ||
            a.generateStatus === undefined ||
            [3, 5, 6].includes(a.generateStatus)),
      )
      .map((a) => a.configId);

  // 第一步：列表模式（只传 billDate），拉取可选账户
  const handleGenerate = async () => {
    if (!billDate) {
      message.error('请先选择账单日期');
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await ManagementReportApi.generateZfbBill({
        billDate: billDate.format('YYYY-MM'),
      });
      if (res.code !== 200 || !res.data) {
        message.error(res.msg || (typeof res.data === 'string' ? res.data : '获取账户列表失败'));
        return;
      }
      const data = res.data;
      applyGenerateInfo(data);
      const accounts = data.accounts || [];
      setAccountList(accounts);
      setSelectedConfigIds(pickDefaultConfigIds(accounts));
      setAccountModalOpen(true);
    } catch (error) {
      console.error('获取支付宝账户列表失败:', error);
      message.error('获取支付宝账户列表失败');
    } finally {
      setGenerateLoading(false);
    }
  };

  // 第二步：触发模式（billDate + configIds）
  const handleTriggerGenerate = async () => {
    if (!billDate) {
      message.error('请先选择账单日期');
      return;
    }
    if (!generateInfo?.canTrigger) {
      message.warning(generateInfo?.message || '当前不可触发生成');
      return;
    }
    if (selectedConfigIds.length === 0) {
      message.warning('请至少选择一个账户');
      return;
    }
    setTriggerLoading(true);
    try {
      const res = await ManagementReportApi.generateZfbBill({
        billDate: billDate.format('YYYY-MM'),
        configIds: selectedConfigIds,
      });
      if (res.code !== 200 || !res.data) {
        message.error(res.msg || (typeof res.data === 'string' ? res.data : '生成失败'));
        return;
      }
      const data = res.data;
      applyGenerateInfo(data);
      if (data.triggered) {
        message.success(data.message || '生成任务已提交，请稍后刷新查看');
        setAccountModalOpen(false);
        startGeneratePolling();
        fetchBill({ pageNum: 1 });
      } else {
        message.warning(data.message || '当前不可触发生成');
      }
    } catch (error) {
      console.error('触发生成支付宝账单失败:', error);
      message.error('触发生成支付宝账单失败');
    } finally {
      setTriggerLoading(false);
    }
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

  /**
   * 拉取"指定月份"的账单记录（不分页），用作缺货赔付账单上传的店铺下拉选项。
   * 通过把 pageSize 调大 + billDate 过滤，拿到所选月份的全量数据。
   */
  const fetchStockoutList = async (dateStr: string) => {
    setStockoutLoading(true);
    try {
      const res: {
        code: number;
        data?: IPageFinanceZfbBillInfoVo;
        msg?: string;
        success?: boolean;
      } = await ManagementReportApi.getZfbBillPage({
        pageNum: 1,
        pageSize: 9999,
        platform: '支付宝',
        billDate: dateStr,
      });
      if (res.code === 200) {
        setStockoutList(res.data?.records || []);
      } else {
        message.error(res.msg || '获取店铺列表失败');
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      message.error('获取店铺列表失败');
    } finally {
      setStockoutLoading(false);
    }
  };

  const openStockoutModal = async () => {
    setStockoutModalOpen(true);
    setStockoutDate(dayjs().subtract(1, 'month'));
    setSelectedStockoutId(undefined);
    setStockoutFile(null);
    setStockoutList([]);
    // 拉取由下面的 useEffect 触发（依赖 stockoutDate + stockoutModalOpen）
  };

  /**
   * 弹窗打开 或 账单日期变化时，重新拉取该月对应的店铺列表。
   * 同时清空之前选中的店铺 id（换月后原选项已不适用）。
   */
  useEffect(() => {
    if (stockoutModalOpen && stockoutDate) {
      setSelectedStockoutId(undefined);
      fetchStockoutList(stockoutDate.format('YYYY-MM'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockoutDate, stockoutModalOpen]);

  const stockoutUploadProps: UploadProps = {
    beforeUpload: (file) => {
      setStockoutFile(file);
      return false; // 阻止自动上传
    },
    fileList: stockoutFile ? [{ uid: '1', name: stockoutFile.name, status: 'done' }] : [],
    onRemove: () => {
      setStockoutFile(null);
    },
    // accept: '.zip,.csv,.xlsx,.xls',  # 放开文件类型限制(可选所有文件)
  };

  const handleStockoutUpload = async () => {
    if (!stockoutDate) {
      message.error('请选择账单日期');
      return;
    }
    if (selectedStockoutId === undefined || selectedStockoutId === null) {
      message.error('请选择店铺');
      return;
    }
    if (!stockoutFile) {
      message.error('请选择要上传的账单文件');
      return;
    }

    const selectedRow = stockoutList.find((r) => r.financeBillConfigId === selectedStockoutId);
    const shopName = selectedRow?.shopName || `店铺#${selectedStockoutId}`;
    const billDateStr = stockoutDate.format('YYYY-MM');
    const fileName = stockoutFile.name;

    // 1. 立刻关闭弹窗 & 重置表单
    setStockoutModalOpen(false);
    setStockoutFile(null);
    setSelectedStockoutId(undefined);

    // 2. 创建任务（异步进行中，不阻塞 UI）
    const taskId = addTask({
      channel: '支付宝-缺货赔付',
      shopName,
      billDate: billDateStr,
      fileName,
    });
    message.success(`缺货赔付账单上传任务已提交，详见右下角任务卡片`);

    // 3. 异步执行上传
    ManagementReportApi.uploadStockoutBill({
      billDate: billDateStr,
      // 按需求：把选中店铺对应的行 financeBillConfigId 直接作为上传参数
      financeBillConfigId: selectedStockoutId,
      file: stockoutFile,
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
          const fail = result.failCount ?? 0;
          const success = result.successCount ?? 0;
          const total = result.totalCount ?? 0;
          message.success(
            `【${shopName} / ${billDateStr}】上传完成：共 ${total} 条，成功 ${success} 条${
              fail > 0 ? `，失败 ${fail} 条` : ''
            }`,
          );
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
        console.error('上传缺货赔付账单失败:', error);
        const errMsg = (error && (error.msg || error.message)) || '上传失败，请稍后重试';
        updateTask(taskId, {
          status: 'failed',
          finishedAt: Date.now(),
          errorMessage: errMsg,
        });
        message.error(errMsg);
      });
  };
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
              1. 使用{' '}
              <a href="mailto:peidizhichuang2001@163.com" onClick={(e) => e.stopPropagation()}>
                peidizhichuang2001@163.com
              </a>{' '}
              登陆{' '}
              <a
                href="https://auth.alipay.com/login/index.htm?goto=https%3A%2F%2Fopen.alipay.com%2Fdevelop%2Fmanage"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://auth.alipay.com/login/index.htm?goto=https%3A%2F%2Fopen.alipay.com%2Fdevelop%2Fmanage
              </a>
            </div>
            <div>
              2. 控制台点击 "接囗测试模板应用" -&gt; 点击商家授权 -&gt; 授权后返回到上一页面获取
              token（参考文档：
              <a
                href="https://opendocs.alipay.com/isv/0ie70v?pathHash=1b160ce4"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://opendocs.alipay.com/isv/0ie70v?pathHash=1b160ce4
              </a>
              ）
            </div>
            <div>
              3. <strong>生成账单提醒：</strong>月账单格式为 yyyy-MM，最早可下载近 6
              年的月账单。不支持下载当月账单，只能下载上一月账单数据，当月账单一般在次月 3
              日生成，特殊情况可能延迟。
            </div>
            <div>
              4. <strong>生成方式：</strong>
              先选择要生成账单的支付宝账户（可单选/全选），多账户会串行生成、每个成功后间隔 60
              秒；生成接口每 20 分钟只能触发一次。
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
            <Input
              style={{ width: 180 }}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="模糊匹配"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>店铺名称</span>
            <Input
              style={{ width: 180 }}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="模糊匹配"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>授权商家名称</span>
            <Input
              style={{ width: 180 }}
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="模糊匹配"
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>支付宝商户号</span>
            <Input
              style={{ width: 180 }}
              value={alipayMerchantNo}
              onChange={(e) => setAlipayMerchantNo(e.target.value)}
              placeholder="模糊匹配"
              allowClear
            />
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
              <Button
                type="primary"
                onClick={handleSearch}
                icon={<SearchOutlined />}
                loading={billLoading}
              >
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button
                type="primary"
                className="grayblue-btn"
                style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                icon={<FileTextOutlined />}
                onClick={handleGenerate}
                loading={generateLoading}
                disabled={generateLoading}
              >
                生成账单
              </Button>
              <Button
                type="primary"
                className="grayblue-btn"
                style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
                icon={<UploadOutlined />}
                onClick={openStockoutModal}
              >
                上传缺货赔付账单
              </Button>
              {/* 导出所有账单文件：按当前筛选条件导出全量账单 */}
              <ExportAllBillsButton
                platform="支付宝"
                fileNamePrefix="支付宝"
                query={() => ({
                  billDate: billDate ? billDate.format('YYYY-MM') : undefined,
                  shopName: shopName || undefined,
                  companyName: companyName || undefined,
                  alipayMerchantNo: alipayMerchantNo || undefined,
                  merchantName: merchantName || undefined,
                  generateStatus,
                })}
              />
              {/* 批量导出功能暂时关闭
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
              */}
            </Space>
          </div>
        </div>
      </div>
      {/* 多选功能暂时关闭
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
      */}

      <Table
        columns={channelBillColumns}
        dataSource={billData}
        rowKey="id"
        loading={billLoading}
        size="small"
        scroll={{ x: 2400 }}
        // 多选功能暂时关闭
        // rowSelection={{
        //   selectedRowKeys,
        //   preserveSelectedRowKeys: true,
        //   selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        //   onChange: (keys, rows) => {
        //     setSelectedRowKeys(keys);
        //     setSelectedRows(rows as FinanceZfbBillInfoVo[]);
        //   },
        //   getCheckboxProps: (record: FinanceZfbBillInfoVo) => ({
        //     disabled: !record.fileUrl,
        //   }),
        // }}
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

      {/* 选择支付宝账户生成账单 */}
      <Modal
        title={`选择要生成账单的支付宝账户${billDate ? `（${billDate.format('YYYY-MM')}）` : ''}`}
        open={accountModalOpen}
        onCancel={() => setAccountModalOpen(false)}
        onOk={handleTriggerGenerate}
        okText="确认生成"
        cancelText="取消"
        width={1100}
        destroyOnClose
        confirmLoading={triggerLoading}
        okButtonProps={{
          disabled: !generateInfo?.canTrigger || selectedConfigIds.length === 0,
          className: 'grayblue-btn',
          style: { background: '#2f54eb', borderColor: '#2f54eb' },
          title: generateInfo?.nextTriggerTime
            ? `${generateInfo.nextTriggerTime} 后可再次生成`
            : undefined,
        }}
      >
        {generateInfo && (
          <Alert
            type={generateInfo.canTrigger ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 12 }}
            message={
              generateInfo.canTrigger
                ? `已选择 ${selectedConfigIds.length} 个账户；多账户会串行生成，每个成功后间隔 60 秒`
                : generateInfo.message || '当前不可触发生成'
            }
            description={
              !generateInfo.canTrigger
                ? [
                    generateCooldown > 0 ? `冷却剩余 ${formatCooldown(generateCooldown)}` : '',
                    generateInfo.nextTriggerTime
                      ? `下次可触发时间：${generateInfo.nextTriggerTime}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('；') || null
                : null
            }
          />
        )}
        <Table
          rowKey="configId"
          dataSource={accountList}
          size="small"
          pagination={false}
          scroll={{ x: 1000, y: 360 }}
          rowSelection={{
            selectedRowKeys: selectedConfigIds,
            onChange: (keys) => setSelectedConfigIds(keys as number[]),
            getCheckboxProps: (record) => ({ disabled: record.tokenConfigured === false }),
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
          }}
          columns={[
            { title: '店铺名称', dataIndex: 'shopName', width: 180, render: (v) => v || '-' },
            {
              title: '授权商家名称',
              dataIndex: 'merchantName',
              width: 150,
              render: (v) => v || '-',
            },
            { title: '公司名称', dataIndex: 'companyName', width: 220, render: (v) => v || '-' },
            {
              title: '支付宝商户号',
              dataIndex: 'alipayMerchantNo',
              width: 160,
              render: (v) => v || '-',
            },
            { title: '账户名', dataIndex: 'accountName', width: 140, render: (v) => v || '-' },
            { title: '别名', dataIndex: 'alisa', width: 120, render: (v) => v || '-' },
            {
              title: '该月状态',
              dataIndex: 'generateStatus',
              width: 100,
              render: (v) => renderGenerateStatus(v),
            },
            {
              title: 'Token',
              dataIndex: 'tokenConfigured',
              width: 90,
              render: (v) =>
                v === false ? <Tag color="error">未配置</Tag> : <Tag color="success">已配置</Tag>,
            },
          ]}
        />
      </Modal>

      {/* 上传缺货赔付账单弹窗 */}
      <Modal
        title="上传缺货赔付账单"
        open={stockoutModalOpen}
        onCancel={() => setStockoutModalOpen(false)}
        onOk={handleStockoutUpload}
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
              1. 支持 .zip / .csv / .xlsx / .xls 格式（zip 会递归解压）
              <br />
              2. 账单日期格式：yyyy-MM（如 2026-07），不可清空，切换月份会自动刷新店铺列表
              <br />
              3. 关联账单配置ID 取自下方列表所选店铺对应的记录 financeBillConfigId
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
              value={stockoutDate}
              onChange={(date) => setStockoutDate(date)}
              format="YYYY-MM"
              placeholder="请选择月份"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              店铺 <span style={{ color: '#ff4d4f' }}>*</span>
              <span style={{ marginLeft: 8, color: '#999', fontSize: 11 }}>
                （已按上方所选月份过滤后的全量列表）
              </span>
            </span>
            <Select
              style={{ width: '100%' }}
              value={selectedStockoutId}
              onChange={(v) => setSelectedStockoutId(v)}
              placeholder={stockoutLoading ? '加载中...' : '请选择店铺'}
              loading={stockoutLoading}
              allowClear
              showSearch
              optionFilterProp="label"
              options={stockoutList
                .filter(
                  (s) => s.financeBillConfigId !== undefined && s.financeBillConfigId !== null,
                )
                .map((s) => ({
                  label: `${s.shopName || '-'}${s.billDate ? `（${s.billDate}）` : ''}`,
                  value: s.financeBillConfigId as number,
                }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...stockoutUploadProps}>
              <Button icon={<UploadOutlined />} disabled={stockoutLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ZfbBillPanel;
