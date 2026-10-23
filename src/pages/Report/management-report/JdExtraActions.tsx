import React, { useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
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
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
import type { TableColumnsType, UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, { type JdFeeVo } from '@/services/managementReportApi';

const DEFAULT_JD_TYPE = '京东自营';
const FEE_CATEGORIES = ['快递费', '推广费用', '平台费用', '公共费用分摊'];

interface JdExtraActionsProps {
  /** 主页面当前选择的销售月份，用于默认结算日期 */
  month: Dayjs | null;
  /** 上传 / 保存成功后刷新主表 */
  onChanged: () => void;
}

interface FeeItemRow {
  key: string;
  category: string;
  name?: string;
  amount?: number | null;
  taxRate?: string;
  total?: number | null;
}

const getDefaultDate = (month: Dayjs | null) =>
  (month || dayjs().subtract(1, 'month')).endOf('month');

const JdExtraActions: React.FC<JdExtraActionsProps> = ({ month, onChanged }) => {
  const keyRef = useRef(0);
  const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${keyRef.current++}`;

  const [types, setTypes] = useState<string[]>([DEFAULT_JD_TYPE]);
  const [typesLoading, setTypesLoading] = useState(false);

  /* ---- 上传京东自营数据 ---- */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState(DEFAULT_JD_TYPE);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ---- 费用录入 ---- */
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeType, setFeeType] = useState(DEFAULT_JD_TYPE);
  const [feeDate, setFeeDate] = useState<Dayjs | null>(getDefaultDate(month));
  const [feeItems, setFeeItems] = useState<FeeItemRow[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);

  // 拉取已有数据类型（失败时回退到「京东自营」）
  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const res = await ManagementReportApi.getJdRawTypes();
      if (res.code === 200) {
        const list = (res.data || []).filter(Boolean);
        if (list.length) {
          setTypes(list);
          return list;
        }
      }
    } catch (error) {
      console.error('获取京东自营数据类型失败:', error);
    } finally {
      setTypesLoading(false);
    }
    return types.length ? types : [DEFAULT_JD_TYPE];
  };

  const openUpload = async () => {
    setUploadOpen(true);
    setUploadFile(null);
    await loadTypes();
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式的 U9 应收单');
        return Upload.LIST_IGNORE;
      }
      setUploadFile(file);
      // 阻止自动上传，点击弹窗「开始上传」时统一提交
      return false;
    },
    fileList: uploadFile
      ? [{ uid: 'jd-raw-file', name: uploadFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setUploadFile(null),
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      message.error('请选择要上传的 U9 应收单文件');
      return;
    }
    setUploading(true);
    try {
      const res = await ManagementReportApi.uploadJdRaw({
        type: uploadType.trim() || DEFAULT_JD_TYPE,
        file: uploadFile,
      });
      if (res.code === 200 && res.success !== false) {
        message.success('京东自营数据上传成功');
        setUploadOpen(false);
        setUploadFile(null);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传京东自营数据失败:', error);
      message.error('上传京东自营数据失败');
    } finally {
      setUploading(false);
    }
  };

  /* ---- 费用录入 ---- */
  const loadFeeItems = async (type: string, date: Dayjs | null) => {
    if (!type || !date) {
      return;
    }
    setFeeLoading(true);
    try {
      const res = await ManagementReportApi.queryJdFee({
        type,
        dataDate: date.format('YYYY-MM-DD'),
      });
      if (res.code === 200) {
        const list: JdFeeVo[] = res.data || [];
        setFeeItems(
          list.map((fee) => ({
            key: nextKey('fee'),
            category: fee.category || FEE_CATEGORIES[0],
            name: fee.name,
            amount: fee.amount,
            taxRate: fee.taxRate,
            total: fee.total,
          })),
        );
      } else {
        message.error(res.msg || '查询京东自营费用失败');
      }
    } catch (error) {
      console.error('查询京东自营费用失败:', error);
      message.error('查询京东自营费用失败');
    } finally {
      setFeeLoading(false);
    }
  };

  const openFeeModal = async () => {
    const defaultDate = getDefaultDate(month);
    setFeeOpen(true);
    setFeeDate(defaultDate);
    setFeeItems([]);
    const list = await loadTypes();
    const nextType = list.includes(feeType) ? feeType : list[0] || DEFAULT_JD_TYPE;
    setFeeType(nextType);
    await loadFeeItems(nextType, defaultDate);
  };

  const handleFeeTypeChange = (value: string) => {
    setFeeType(value);
    loadFeeItems(value, feeDate);
  };

  const handleFeeDateChange = (value: Dayjs | null) => {
    setFeeDate(value);
    if (value) {
      loadFeeItems(feeType, value);
    }
  };

  const updateFeeItem = (key: string, patch: Partial<FeeItemRow>) => {
    setFeeItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) {
          return item;
        }
        const next = { ...item, ...patch };
        // 修改未税金额 / 税率时自动重算价税合计（可再手工修改 total）
        if (('amount' in patch || 'taxRate' in patch) && !('total' in patch)) {
          const rate = Number(next.taxRate);
          if (
            next.amount !== undefined &&
            next.amount !== null &&
            next.taxRate !== undefined &&
            next.taxRate !== '' &&
            !Number.isNaN(rate)
          ) {
            next.total = Number((next.amount * (1 + rate)).toFixed(2));
          }
        }
        return next;
      }),
    );
  };

  const addFeeItem = () => {
    setFeeItems((prev) => [...prev, { key: nextKey('fee'), category: FEE_CATEGORIES[0] }]);
  };

  const removeFeeItem = (key: string) => {
    setFeeItems((prev) => prev.filter((item) => item.key !== key));
  };

  const feeColumns: TableColumnsType<FeeItemRow> = [
    {
      title: '费用类别',
      dataIndex: 'category',
      width: 150,
      render: (value: string, record) => (
        <Select
          value={value}
          style={{ width: '100%' }}
          options={FEE_CATEGORIES.map((category) => ({ label: category, value: category }))}
          onChange={(next) => updateFeeItem(record.key, { category: next })}
        />
      ),
    },
    {
      title: '子分类名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, record) => (
        <Input
          value={value}
          placeholder="如 TC运费 / 京准通"
          onChange={(e) => updateFeeItem(record.key, { name: e.target.value })}
        />
      ),
    },
    {
      title: '未税金额',
      dataIndex: 'amount',
      width: 140,
      render: (value: number | null, record) => (
        <InputNumber
          value={value}
          precision={2}
          style={{ width: '100%' }}
          placeholder="未税金额"
          onChange={(next) => updateFeeItem(record.key, { amount: next })}
        />
      ),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      width: 110,
      render: (value: string, record) => (
        <Input
          value={value}
          placeholder="如 0.09"
          onChange={(e) => updateFeeItem(record.key, { taxRate: e.target.value })}
        />
      ),
    },
    {
      title: '价税合计',
      dataIndex: 'total',
      width: 140,
      render: (value: number | null, record) => (
        <InputNumber
          value={value}
          precision={2}
          style={{ width: '100%' }}
          placeholder="价税合计"
          onChange={(next) => updateFeeItem(record.key, { total: next })}
        />
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_value, record) => (
        <Button type="link" danger size="small" onClick={() => removeFeeItem(record.key)}>
          删除
        </Button>
      ),
    },
  ];

  const handleSaveFee = async () => {
    if (!feeType) {
      message.error('请选择数据类型');
      return;
    }
    if (!feeDate) {
      message.error('请选择结算日期');
      return;
    }

    const items = feeItems
      .map((item) => ({
        category: item.category,
        name: item.name?.trim() || undefined,
        amount: item.amount === undefined || item.amount === null ? null : Number(item.amount),
        taxRate: item.taxRate?.trim() || null,
        total: item.total === undefined || item.total === null ? null : Number(item.total),
      }))
      .filter((item) => item.name || item.amount !== null || item.total !== null);

    setFeeSaving(true);
    try {
      const res = await ManagementReportApi.saveJdFee({
        type: feeType,
        dataDate: feeDate.format('YYYY-MM-DD'),
        items,
      });
      if (res.code === 200 && res.success !== false) {
        message.success('京东自营费用保存成功');
        setFeeOpen(false);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '保存失败');
      }
    } catch (error) {
      console.error('保存京东自营费用失败:', error);
      message.error('保存京东自营费用失败');
    } finally {
      setFeeSaving(false);
    }
  };

  return (
    <>
      <Space>
        <Button type="primary" icon={<UploadOutlined />} onClick={openUpload}>
          上传京东数据
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={openFeeModal}>
          费用录入
        </Button>
      </Space>

      {/* 上传京东自营原始数据 */}
      <Modal
        title="上传京东自营数据"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={handleUpload}
        okText="开始上传"
        cancelText="取消"
        width={620}
        destroyOnClose
        confirmLoading={uploading}
      >
        <Alert
          type="info"
          showIcon
          message="上传说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 请上传 U9 应收单导出文件（.xlsx / .xls）
              <br />
              2. 服务端仅取「摘要备注 = 销售商品（京东自营店）」且货号非空的行
              <br />
              3. 重新上传同月份会覆盖该月份旧数据
              <br />
              4. 上传完成后会自动刷新当前查询结果
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>数据类型</span>
            <AutoComplete
              value={uploadType}
              onChange={(value) => setUploadType(value)}
              options={types.map((type) => ({ label: type, value: type }))}
              placeholder="默认京东自营，可输入新的平行平台名称"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              U9 应收单文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 京东自营费用录入 */}
      <Modal
        title="京东自营费用录入"
        open={feeOpen}
        onCancel={() => setFeeOpen(false)}
        onOk={handleSaveFee}
        okText="保存"
        cancelText="取消"
        width={920}
        destroyOnClose
        confirmLoading={feeSaving}
      >
        <Alert
          type="warning"
          showIcon
          message="保存时会按「数据类型 + 结算日期」整份覆盖该日期的费用明细"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              费用类别可选：快递费 / 推广费用 / 平台费用 / 公共费用分摊；同一类别可添加多行子分类。
              <br />
              修改未税金额或税率时会自动计算价税合计（价税合计 = 未税金额 × (1 + 税率)）。
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              数据类型 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Select
              value={feeType}
              style={{ width: '100%' }}
              loading={typesLoading}
              placeholder="请选择数据类型"
              options={types.map((type) => ({ label: type, value: type }))}
              onChange={handleFeeTypeChange}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              结算日期 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker
              style={{ width: '100%' }}
              value={feeDate}
              format="YYYY-MM-DD"
              placeholder="请选择结算日期"
              onChange={handleFeeDateChange}
            />
          </div>
        </div>

        <Table
          columns={feeColumns}
          dataSource={feeItems}
          rowKey="key"
          loading={feeLoading}
          size="small"
          pagination={false}
          scroll={{ x: 880 }}
          locale={{ emptyText: '暂无费用明细，点击下方「新增费用」添加' }}
        />

        <Button
          type="dashed"
          block
          style={{ marginTop: 12 }}
          onClick={addFeeItem}
          icon={<EditOutlined />}
        >
          新增费用
        </Button>
      </Modal>
    </>
  );
};

export default JdExtraActions;
