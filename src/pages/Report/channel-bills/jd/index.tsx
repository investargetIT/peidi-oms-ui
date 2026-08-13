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
import ChannelExtendCostApi, {
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { channelBillColumns } from '../columns';
import { useUploadTasks } from '../common/uploadTaskStore';

const JdBillPanel: React.FC = () => {
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
  const [selectedShopId, setSelectedShopId] = useState<number | undefined>(undefined);
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  // 京东上传需要 2 个文件：账单明细(file1) + 财务汇总(file2)
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
        platform: '京东',
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
      console.error('查询京东账单失败:', error);
      message.error('查询京东账单失败');
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

  // 京东目前暂不开放生成账单功能，改为支持手动上传账单
  const fetchConfigList = async () => {
    setConfigLoading(true);
    try {
      const res = await ManagementReportApi.getBillConfigList({ platform: '京东' });
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

  const fetchShopList = async () => {
    setShopLoading(true);
    try {
      // 与 channel-extend-cost 保持一致：通过 searchStr JSON 过滤 platform
      const params = {
        sortStr: '',
        searchStr: JSON.stringify({
          searchName: 'platform',
          searchValue: '京东',
          searchType: 'like',
        }),
      };
      const res = await ChannelExtendCostApi.getShops(params);
      if (res.code === 200) {
        setShopList(res.data || []);
      } else {
        message.error(res.msg || '获取店铺列表失败');
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      message.error('获取店铺列表失败');
    } finally {
      setShopLoading(false);
    }
  };

  const openUploadModal = async () => {
    setUploadModalOpen(true);
    setUploadDate(dayjs().subtract(1, 'month'));
    setSelectedConfigId(undefined);
    setSelectedShopId(undefined);
    setUploadFile1(null);
    setUploadFile2(null);
    setConfigList([]);
    setShopList([]);
    await Promise.all([fetchConfigList(), fetchShopList()]);
  };

  // 账单明细文件 (file1)
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

  // 财务汇总表文件 (file2)
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
    if (selectedShopId === undefined || selectedShopId === null) {
      message.error('请选择店铺');
      return;
    }
    if (!uploadFile1) {
      message.error('请选择账单明细文件');
      return;
    }
    if (!uploadFile2) {
      message.error('请选择财务汇总表文件');
      return;
    }

    // 取下店铺名用于任务卡片展示
    const selectedShop = shopList.find((s) => s.id === selectedShopId);
    const shopName = selectedShop?.shopName || `店铺#${selectedShopId}`;
    const billDateStr = uploadDate.format('YYYY-MM');
    // 任务卡片展示：把 2 个文件名拼成 "明细.xlsx + 汇总.xlsx"
    const fileName = `${uploadFile1.name} + ${uploadFile2.name}`;

    // 1. 立刻关闭上传弹窗 & 重置表单
    setUploadModalOpen(false);
    setUploadFile1(null);
    setUploadFile2(null);
    setSelectedConfigId(undefined);
    setSelectedShopId(undefined);

    // 2. 创建任务（后端请求异步进行中，不阻塞 UI）
    const taskId = addTask({
      channel: '京东',
      shopName,
      billDate: billDateStr,
      fileName,
    });
    message.success(`上传任务已提交，详见右下角任务卡片（共 1 项进行中）`);

    // 3. 异步执行上传（不 await 阻塞）
    ManagementReportApi.uploadJdBill({
      channel: 'jd',
      date: billDateStr,
      financeBillConfigId: selectedConfigId,
      shopId: selectedShopId,
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
            `【${shopName} / ${billDateStr}】上传完成：共 ${total} 条，成功 ${success} 条${fail > 0 ? `，失败 ${fail} 条` : ''}`,
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
        console.error('上传京东账单失败:', error);
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
        title="上传京东账单"
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
              2. 京东一次需要上传 <b>2 个文件</b>：账单明细（file1）+ 财务汇总表（file2），缺一不可<br />
              3. 请先在【账单配置】中维护该店铺的京东账单配置（accessToken、appId 等）<br />
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
              店铺 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Select
              style={{ width: '100%' }}
              value={selectedShopId}
              onChange={(v) => setSelectedShopId(v)}
              placeholder={shopLoading ? '加载中...' : '请选择店铺（来自 /oms/orders/shopTarget，平台=京东）'}
              loading={shopLoading}
              allowClear
              showSearch
              optionFilterProp="label"
              options={shopList
                .filter((s) => s.platform === '京东' && s.id !== undefined && s.id !== null)
                .map((s) => ({
                  label: s.shopName || '-',
                  value: s.id as number,
                }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单明细文件（file1） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadFile1Props}>
              <Button icon={<UploadOutlined />} disabled={shopLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              财务汇总表文件（file2） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadFile2Props}>
              <Button icon={<UploadOutlined />} disabled={shopLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default JdBillPanel;
