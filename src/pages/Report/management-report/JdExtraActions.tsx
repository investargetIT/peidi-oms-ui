import React, { useEffect, useRef, useState } from 'react';
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
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
import type { TableColumnsType, UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, {
  U9_RECEIVABLE_ORGS,
  type JdFeeVo,
  type SalesmanChannelUploadResult,
  type U9ReceivableOrg,
  type U9ReceivableUploadResult,
} from '@/services/managementReportApi';

const DEFAULT_U9_ORG: U9ReceivableOrg = '智创';
const FEE_CATEGORIES = ['快递费', '推广费用', '平台费用', '公共费用分摊'];
// 费用 / 管报数据类型统一用数字（4-京东自营 5-天猫超市）
const FEE_TYPE_OPTIONS = [
  { label: '京东自营', value: 4 },
  { label: '天猫超市', value: 5 },
];

interface JdExtraActionsProps {
  /** 当前管报数据类型：4-京东自营 5-天猫超市 9-天猫国际 10-亚马逊 12-线下(U9) */
  reportType: number;
  /** 主页面当前选择的销售月份，用于默认结算日期 / 上传归属月份 */
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

/**
 * 网关会把「接口不存在」的 404 包成 code=200 的响应体：
 *   { code:200, success:true, data:{ status:404, error:'Not Found', path:'...' } }
 * 只看 res.code===200 会误判成上传成功，所以这里单独识别一次。
 * 后端未部署新版时（如 /salesman/upload 还没上），走这个分支给出明确提示。
 */
const isEndpointNotFound = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const status = (data as { status?: unknown }).status;
  return status === 404 || status === '404';
};

const JdExtraActions: React.FC<JdExtraActionsProps> = ({ reportType, month, onChanged }) => {
  const keyRef = useRef(0);
  const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${keyRef.current++}`;

  // 4/9/10/12 → 上传 U9 应收单（按组织上传，自动拆渠道）；4/5 → 费用录入
  const isU9Type = reportType === 4 || reportType === 9 || reportType === 10 || reportType === 12;
  const isFeeType = reportType === 4 || reportType === 5;
  // 12 线下(U9)：额外提供「业务员渠道表」上传（填充 salesman / channel）
  const isOfflineU9Type = reportType === 12;

  /* ---- 上传 U9 应收单（按核算组织：智创 / 瑞驰） ---- */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadOrg, setUploadOrg] = useState<U9ReceivableOrg>(DEFAULT_U9_ORG);
  const [uploadMonth, setUploadMonth] = useState<Dayjs | null>(getDefaultDate(month));
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ---- 上传业务员渠道表（线下 type=12 专用） ---- */
  const [salesmanOpen, setSalesmanOpen] = useState(false);
  const [salesmanFile, setSalesmanFile] = useState<File | null>(null);
  const [salesmanUploading, setSalesmanUploading] = useState(false);

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

  const openUpload = () => {
    setUploadOpen(true);
    setUploadFile(null);
    // 上传按组织（智创 / 瑞驰），与当前管报类型无关；月份默认跟随主页面的销售月份
    setUploadOrg(DEFAULT_U9_ORG);
    setUploadMonth(getDefaultDate(month));
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
      ? [{ uid: 'u9-receivable-file', name: uploadFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setUploadFile(null),
  };

  // 上传结果（按渠道统计的行数）拼成提示文案：京东自营 127 行 / 亚马逊 35 行
  const formatUploadResult = (result?: U9ReceivableUploadResult | null) => {
    const entries = Object.entries(result || {}).filter(([, count]) => typeof count === 'number');
    if (!entries.length) return '';
    return entries.map(([channel, count]) => `${channel} ${count} 行`).join(' / ');
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      message.error('请选择要上传的 U9 应收单文件');
      return;
    }
    if (!uploadMonth) {
      message.error('请选择归属月份');
      return;
    }
    setUploading(true);
    try {
      const res = await ManagementReportApi.uploadU9Receivable({
        org: uploadOrg,
        month: uploadMonth.format('YYYY-MM'),
        file: uploadFile,
      });
      if (res.code === 200 && res.success !== false) {
        if (isEndpointNotFound(res.data)) {
          message.error('上传接口不存在：后端未部署新版（/finance/u9-receivable/upload）', 8);
          return;
        }
        const summary = formatUploadResult(res.data);
        message.success(
          summary ? `${uploadOrg}数据上传成功：${summary}` : `${uploadOrg}数据上传成功`,
          6,
        );
        setUploadOpen(false);
        setUploadFile(null);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传 U9 应收单失败:', error);
      message.error('上传 U9 应收单失败');
    } finally {
      setUploading(false);
    }
  };

  /* ---- 上传业务员渠道表（线下 type=12 专用） ---- */
  // 不传月份：后端按文件里「日期」列自动归月，一次处理文件内出现的所有月份。
  // ⚠️ 覆盖粒度是「月份」：某个月份一旦出现在文件里，该月旧记录会按「日期 + 客户名称」全量对齐，
  //    文件里没有的客户在该月会被删除。所以必须上传整月完整数据。
  const openSalesmanUpload = () => {
    setSalesmanOpen(true);
    setSalesmanFile(null);
  };

  const salesmanUploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式的业务员渠道表');
        return Upload.LIST_IGNORE;
      }
      setSalesmanFile(file);
      // 阻止自动上传，点击弹窗「开始上传」时统一提交
      return false;
    },
    fileList: salesmanFile
      ? [{ uid: 'salesman-channel-file', name: salesmanFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setSalesmanFile(null),
  };

  // 上传结果提示：按月份列出新增 / 更新 / 删除行数（只列非 0 项，避免「新增 0，更新 1，删除 0」这种噪音）
  // 删除不是错误：是该月文件里没出现的客户被对齐清掉了，数字异常大时说明文件传错/被裁剪
  const formatSalesmanResult = (result?: SalesmanChannelUploadResult | null) => {
    if (!result) return '';
    const months = (result.months || []).filter((item) => item.month);
    if (months.length) {
      return months
        .map((item) => {
          const parts: string[] = [];
          if (item.inserted) parts.push(`新增 ${item.inserted}`);
          if (item.updated) parts.push(`更新 ${item.updated}`);
          if (item.deleted) parts.push(`删除 ${item.deleted}`);
          return `${item.month}：${parts.join('，') || '无变化'}`;
        })
        .join('；');
    }
    // 后端未返回 months 时退回总计
    const parts: string[] = [];
    if (result.inserted) parts.push(`新增 ${result.inserted} 行`);
    if (result.updated) parts.push(`更新 ${result.updated} 行`);
    if (result.deleted) parts.push(`删除 ${result.deleted} 行`);
    return parts.join('，');
  };

  // 删除行数异常时额外提醒（覆盖粒度是月份，文件不全就会误删该月其余客户）
  const getSalesmanDeleteWarning = (result?: SalesmanChannelUploadResult | null) => {
    const deleted = result?.deleted ?? 0;
    return typeof deleted === 'number' && deleted > 0
      ? '：文件里没有的客户已从对应月份移除，如非预期请核对是否上传了整月完整数据'
      : '';
  };

  const handleSalesmanUpload = async () => {
    if (!salesmanFile) {
      message.error('请选择要上传的业务员渠道表文件');
      return;
    }
    setSalesmanUploading(true);
    try {
      // 不传 month：处理文件里所有月份
      const res = await ManagementReportApi.uploadSalesmanChannel({
        file: salesmanFile,
      });
      if (res.code === 200 && res.success !== false) {
        if (isEndpointNotFound(res.data)) {
          message.error(
            '上传接口不存在：后端未部署新版（/finance/u9-receivable/salesman/upload），请联系后端',
            8,
          );
          return;
        }
        const summary = formatSalesmanResult(res.data);
        message.success(
          summary ? `业务员渠道表上传成功：${summary}` : '业务员渠道表上传成功',
          8,
        );
        const warning = getSalesmanDeleteWarning(res.data);
        if (warning) {
          message.warning(`提示${warning}`, 8);
        }
        setSalesmanOpen(false);
        setSalesmanFile(null);
        onChanged();
      } else {
        // 同日期同客户出现不同业务员/渠道时后端整批 400，提示文案在 msg / data 里
        message.error(typeof res.data === 'string' ? res.data : res.msg || '上传失败', 8);
      }
    } catch (error) {
      console.error('上传业务员渠道表失败:', error);
      message.error('上传业务员渠道表失败');
    } finally {
      setSalesmanUploading(false);
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
        // 修改价税合计 / 税率时自动重算未税金额（未税金额 = 价税合计 / (1 + 税率)），可再手工修改未税金额
        if (('total' in patch || 'taxRate' in patch) && !('amount' in patch)) {
          const rate = Number(next.taxRate);
          if (
            next.total !== undefined &&
            next.total !== null &&
            next.taxRate !== undefined &&
            next.taxRate !== '' &&
            !Number.isNaN(rate) &&
            1 + rate !== 0
          ) {
            next.amount = Number((next.total / (1 + rate)).toFixed(2));
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
        {isU9Type && (
          <Button type="primary" icon={<UploadOutlined />} onClick={openUpload}>
            上传U9应收单
          </Button>
        )}
        {isOfflineU9Type && (
          <Button type="primary" icon={<UploadOutlined />} onClick={openSalesmanUpload}>
            上传业务员渠道表
          </Button>
        )}
        {reportType === 5 && (
          <Button type="primary" icon={<UploadOutlined />} onClick={openTmcsUpload}>
            上传天猫账单
          </Button>
        )}
        {isFeeType && (
          <Button type="primary" icon={<EditOutlined />} onClick={openFeeModal}>
            费用录入
          </Button>
        )}
      </Space>

      {/* 上传业务员渠道表（线下 type=12 专用）：填充线下行的「业务员」「渠道」 */}
      <Modal
        title="上传业务员渠道表"
        open={salesmanOpen}
        onCancel={() => setSalesmanOpen(false)}
        onOk={handleSalesmanUpload}
        okText="开始上传"
        cancelText="取消"
        width={620}
        destroyOnClose
        confirmLoading={salesmanUploading}
      >
        <Alert
          type="info"
          showIcon
          message="上传说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 请上传财务提供的业务员渠道表（.xlsx / .xls），与 U9 应收单分开上传
              <br />
              2. 表格列：日期 / 客户名称 / 业务员 / 渠道（表头可不在第一行，按列名自动识别）
              <br />
              3. 必需「日期」「客户名称」，业务员 / 渠道至少有一列；按「日期」列自动归月
              <br />
              4. 不用选月份：一次处理文件里出现的所有月份
              <br />
              5. 同一日期同一客户出现不同业务员/渠道时整批失败，需核实后重传
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <Alert
          type="warning"
          showIcon
          message="请上传整月完整数据"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              覆盖粒度是「月份」：某个月份一旦出现在文件里，该月旧记录会按「日期 +
              客户名称」全量对齐，
              <b>文件里没有的客户会在该月被删除</b>
              （线下这些行的「业务员」「渠道」会变回空）。只截取部分客户上传会导致该月其余客户被误删，且无法回滚。
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              业务员渠道表 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...salesmanUploadProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 上传 U9 应收单（按核算组织：智创 / 瑞驰） */}
      <Modal
        title="上传U9应收单"
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
              1. 请上传 U9 应收单导出文件（ARBillHead，.xlsx / .xls）
              <br />
              2. 按「核算组织」上传（智创 / 瑞驰），后端会自动拆成京东自营 / 天猫国际 / 亚马逊 /
              线下 各渠道
              <br />
              3. 每个渠道按「组织 + 渠道 + 月份」整月覆盖：同一组织重传同月份会覆盖，不影响另一组织
              <br />
              4. 归属月份内只要有一行立账日期不属于该月，整份文件会被拒绝（一行都不删不插）
              <br />
              5. 上传完成后会自动刷新当前查询结果
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>
                核算组织 <span style={{ color: '#ff4d4f' }}>*</span>
              </span>
              <Select
                value={uploadOrg}
                style={{ width: '100%' }}
                onChange={(value) => setUploadOrg(value)}
                options={U9_RECEIVABLE_ORGS.map((org) => ({ label: org, value: org }))}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>
                归属月份 <span style={{ color: '#ff4d4f' }}>*</span>
              </span>
              <DatePicker.MonthPicker
                style={{ width: '100%' }}
                value={uploadMonth}
                format="YYYY-MM"
                placeholder="请选择归属月份"
                onChange={(date) => setUploadMonth(date)}
                allowClear
              />
            </div>
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
              3. 修改价税合计或税率时会自动计算未税金额（未税金额 = 价税合计 ÷ (1 + 税率)）
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
