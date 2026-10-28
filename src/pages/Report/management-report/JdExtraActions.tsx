import React, { useEffect, useRef, useState } from 'react';
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
// 费用 / 管报数据类型统一用数字（4-京东自营 5-天猫超市）
const FEE_TYPE_OPTIONS = [
  { label: '京东自营', value: 4 },
  { label: '天猫超市', value: 5 },
];

interface JdExtraActionsProps {
  /** 当前管报数据类型：4-京东自营 5-天猫超市 */
  reportType: number;
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

const JdExtraActions: React.FC<JdExtraActionsProps> = ({ reportType, month, onChanged }) => {
  const keyRef = useRef(0);
  const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${keyRef.current++}`;

  const isJd = reportType === 4;

  const [types, setTypes] = useState<string[]>([DEFAULT_JD_TYPE]);

  /* ---- 上传京东自营数据 ---- */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState(DEFAULT_JD_TYPE);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ---- 上传天猫超市账单 ---- */
  const [tmcsOpen, setTmcsOpen] = useState(false);
  const [tmcsMonth, setTmcsMonth] = useState<Dayjs | null>(getDefaultDate(month));
  const [tmcsBillFile, setTmcsBillFile] = useState<File | null>(null);
  const [tmcsGoodsFile, setTmcsGoodsFile] = useState<File | null>(null);
  const [tmcsUploading, setTmcsUploading] = useState(false);

  /* ---- 费用录入 ---- */
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeType, setFeeType] = useState<number>(reportType);
  const [feeDate, setFeeDate] = useState<Dayjs | null>(getDefaultDate(month));
  const [feeItems, setFeeItems] = useState<FeeItemRow[]>([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);

  // 主页面切换数据类型时，费用弹窗的默认类型跟着走
  useEffect(() => {
    setFeeType(reportType);
  }, [reportType]);

  // 拉取已有数据类型（失败时回退到「京东自营」）
  const loadTypes = async () => {
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

  /* ---- 上传天猫超市账单 ---- */
  const openTmcsUpload = () => {
    setTmcsOpen(true);
    setTmcsMonth(getDefaultDate(month));
    setTmcsBillFile(null);
    setTmcsGoodsFile(null);
  };

  const tmcsBillProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式的天猫账单明细');
        return Upload.LIST_IGNORE;
      }
      setTmcsBillFile(file);
      return false;
    },
    fileList: tmcsBillFile
      ? [{ uid: 'tmcs-bill-file', name: tmcsBillFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setTmcsBillFile(null),
  };

  const tmcsGoodsProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式的货品数据');
        return Upload.LIST_IGNORE;
      }
      setTmcsGoodsFile(file);
      return false;
    },
    fileList: tmcsGoodsFile
      ? [{ uid: 'tmcs-goods-file', name: tmcsGoodsFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setTmcsGoodsFile(null),
  };

  const handleTmcsUpload = async () => {
    if (!tmcsBillFile) {
      message.error('请选择天猫账单明细文件');
      return;
    }
    if (!tmcsMonth) {
      message.error('请选择账单月份');
      return;
    }
    setTmcsUploading(true);
    try {
      const res = await ManagementReportApi.uploadTmcs({
        billFile: tmcsBillFile,
        goodsFile: tmcsGoodsFile || undefined,
        type: 5,
        month: tmcsMonth.format('YYYY-MM'),
      });
      if (res.code === 200 && res.success !== false) {
        message.success('天猫超市账单上传成功');
        setTmcsOpen(false);
        setTmcsBillFile(null);
        setTmcsGoodsFile(null);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传天猫超市账单失败:', error);
      message.error('上传天猫超市账单失败');
    } finally {
      setTmcsUploading(false);
    }
  };

  /* ---- 费用录入 ---- */
  const loadFeeItems = async (type: number, date: Dayjs | null) => {
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
    setFeeType(reportType);
    await loadFeeItems(reportType, defaultDate);
  };

  const handleFeeTypeChange = (value: number) => {
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

    // 逐条新增 / 更新（同 type+日期+类别+名称 覆盖），不会删除该日期下的其它费用
    const items = feeItems.filter((item) => (item.name || '').trim());

    if (!items.length) {
      message.error('请至少填写一条费用（子分类名称必填）');
      return;
    }

    setFeeSaving(true);
    let saved = 0;
    try {
      for (const item of items) {
        const res = await ManagementReportApi.addJdFee({
          type: feeType,
          dataDate: feeDate.format('YYYY-MM-DD'),
          category: item.category,
          name: (item.name || '').trim(),
          amount: item.amount === undefined || item.amount === null ? null : Number(item.amount),
          taxRate: item.taxRate?.trim() || null,
          total: item.total === undefined || item.total === null ? null : Number(item.total),
        });
        if (res.code === 200 && res.success !== false) {
          saved += 1;
        } else {
          message.error(
            `「${item.name}」保存失败：${
              typeof res.data === 'string' ? res.data : res.msg || '保存失败'
            }`,
          );
        }
      }
      if (saved > 0) {
        message.success(`已保存 ${saved} 条费用`);
        setFeeOpen(false);
        onChanged();
      }
    } catch (error) {
      console.error('保存费用失败:', error);
      message.error('保存费用失败');
    } finally {
      setFeeSaving(false);
    }
  };

  return (
    <>
      <Space>
        {isJd ? (
          <Button type="primary" icon={<UploadOutlined />} onClick={openUpload}>
            上传京东数据
          </Button>
        ) : (
          <Button type="primary" icon={<UploadOutlined />} onClick={openTmcsUpload}>
            上传天猫账单
          </Button>
        )}
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

      {/* 上传天猫超市账单 */}
      <Modal
        title="上传天猫超市账单"
        open={tmcsOpen}
        onCancel={() => setTmcsOpen(false)}
        onOk={handleTmcsUpload}
        okText="开始上传"
        cancelText="取消"
        width={620}
        destroyOnClose
        confirmLoading={tmcsUploading}
      >
        <Alert
          type="info"
          showIcon
          message="上传说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 账单明细：批量账单明细-*.xlsx，需包含 sheet「账单明细-寄售」
              <br />
              2. 货品数据：货品数据*.xlsx（可选，用于补充货号 / 品名 / 后端商品编码）
              <br />
              3. 同一账单月份重传会覆盖该月份旧数据
              <br />
              4. 上传时会自动把「供应商违规处罚、消费者退款赔付」写入其他费用（平台费用）
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单月份 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={tmcsMonth}
              format="YYYY-MM"
              placeholder="请选择账单月份"
              onChange={(date) => setTmcsMonth(date)}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              账单明细文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...tmcsBillProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>货品数据文件（可选）</span>
            <Upload {...tmcsGoodsProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 费用录入（京东自营 / 天猫超市共用） */}
      <Modal
        title="费用录入"
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
          message="保存时按「数据类型 + 结算日期 + 费用类别 + 子分类名称」逐条新增或更新"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 只影响本次填写的费用，不会删除该日期下其它已存在的费用（如上传自动生成的平台费用）
              <br />
              2. 费用类别可选：快递费 / 推广费用 / 平台费用 / 公共费用分摊；同一类别可添加多行子分类
              <br />
              3. 修改未税金额或税率时会自动计算价税合计（价税合计 = 未税金额 × (1 + 税率)）
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
              placeholder="请选择数据类型"
              options={FEE_TYPE_OPTIONS}
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
