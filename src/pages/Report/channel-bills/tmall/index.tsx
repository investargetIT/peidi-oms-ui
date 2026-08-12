import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Upload,
  message,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
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

const TmallBillPanel: React.FC = () => {
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<FinanceChannelExtendCostImportVo | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const fetchBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: billPagination.current,
        pageSize: billPagination.pageSize,
        billDate: billDate ? billDate.format('YYYY-MM') : undefined,
        shopName: shopName || undefined,
        generateStatus,
        platform: '天猫',
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
      console.error('查询天猫账单失败:', error);
      message.error('查询天猫账单失败');
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

  // 天猫目前暂不开放生成账单功能，改为支持手动上传账单
  const fetchConfigList = async () => {
    setConfigLoading(true);
    try {
      const res = await ManagementReportApi.getBillConfigList({ platform: '天猫' });
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
          searchValue: '天猫',
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
    setUploadFile(null);
    setImportResult(null);
    setConfigList([]);
    setShopList([]);
    await Promise.all([fetchConfigList(), fetchShopList()]);
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
    if (selectedShopId === undefined || selectedShopId === null) {
      message.error('请选择店铺');
      return;
    }
    if (!uploadFile) {
      message.error('请选择要上传的账单文件');
      return;
    }
    setUploading(true);
    try {
      const res = await ManagementReportApi.uploadTmallBill({
        channel: 'tm',
        date: uploadDate.format('YYYY-MM'),
        financeBillConfigId: selectedConfigId,
        shopId: selectedShopId,
        file: uploadFile,
      });
      const result: FinanceChannelExtendCostImportVo =
        (res.data as FinanceChannelExtendCostImportVo) ||
        ({} as FinanceChannelExtendCostImportVo);
      if (res.code === 200 || res.success) {
        setImportResult(result);
        setResultModalOpen(true);
        // 关闭上传弹窗并刷新列表
        setUploadModalOpen(false);
        setUploadFile(null);
        setSelectedConfigId(undefined);
        setSelectedShopId(undefined);
        fetchBill({ pageNum: 1 });
      } else {
        message.error(res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传天猫账单失败:', error);
      message.error('上传天猫账单失败');
    } finally {
      setUploading(false);
    }
  };

  // 解析后端可能返回的 "new ArrayList<>()" 这种字符串
  const normalizeMessageList = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
    }
    if (typeof raw === 'string' && raw && raw !== 'new ArrayList<>()') {
      return [raw];
    }
    return [];
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
        title="上传天猫账单"
        open={uploadModalOpen}
        onCancel={() => {
          if (uploading) return;
          setUploadModalOpen(false);
        }}
        onOk={handleUpload}
        confirmLoading={uploading}
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
              2. 请先在【账单配置】中维护该店铺的天猫账单配置（accessToken、appId 等）<br />
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
              店铺 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Select
              style={{ width: '100%' }}
              value={selectedShopId}
              onChange={(v) => setSelectedShopId(v)}
              placeholder={shopLoading ? '加载中...' : '请选择店铺（来自 /oms/orders/shopTarget，平台=天猫）'}
              loading={shopLoading}
              allowClear
              showSearch
              optionFilterProp="label"
              options={shopList
                .filter((s) => s.platform === '天猫' && s.id !== undefined && s.id !== null)
                .map((s) => ({
                  label: s.shopName || '-',
                  value: s.id as number,
                }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} disabled={uploading || shopLoading}>
                选择文件
              </Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 上传结果弹窗 */}
      <Modal
        title={
          <Space>
            {importResult && (importResult.failCount || 0) > 0 ? (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            ) : (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            )}
            <span>上传结果</span>
          </Space>
        }
        open={resultModalOpen}
        onOk={() => setResultModalOpen(false)}
        onCancel={() => setResultModalOpen(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={640}
      >
        {importResult && (
          <div>
            <Descriptions
              size="small"
              column={3}
              bordered
              items={[
                { key: 'total', label: '总记录数', children: importResult.totalCount ?? 0 },
                { key: 'success', label: '成功', children: importResult.successCount ?? 0 },
                { key: 'fail', label: '失败', children: importResult.failCount ?? 0 },
              ]}
            />
            {(() => {
              const errors = normalizeMessageList(importResult.errorMessages);
              const logs = normalizeMessageList(importResult.logs);
              if (errors.length === 0 && logs.length === 0) return null;
              return (
                <div style={{ marginTop: 16 }}>
                  {errors.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 500, marginBottom: 6, color: '#ff4d4f' }}>
                        错误信息（{errors.length}）
                      </div>
                      <div
                        style={{
                          background: '#fff2f0',
                          border: '1px solid #ffccc7',
                          borderRadius: 4,
                          padding: 8,
                          maxHeight: 200,
                          overflow: 'auto',
                          fontSize: 12,
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {errors.map((m, i) => (
                          <div key={i}>• {m}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {logs.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6, color: '#666' }}>
                        处理日志（{logs.length}）
                      </div>
                      <div
                        style={{
                          background: '#fafafa',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          padding: 8,
                          maxHeight: 200,
                          overflow: 'auto',
                          fontSize: 12,
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {logs.map((m, i) => (
                          <div key={i}>• {m}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </>
  );
};

export default TmallBillPanel;
