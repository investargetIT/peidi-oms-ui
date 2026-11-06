import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Spin,
  Upload,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { TableColumnsType, UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ManagementReportApi, { type WalmartCostVo } from '@/services/managementReportApi';

const CHANNEL_OPTIONS = [
  { label: '山姆', value: '山姆' },
  { label: '沃尔玛', value: '沃尔玛' },
];

const KIND_OPTIONS = [
  { label: '成本单价', value: '成本单价' },
  { label: '物流费', value: '物流费' },
];

const formatMoney = (v?: number | null) =>
  v === null || v === undefined ? '-' : Number(v).toFixed(2);

interface WalmartExtraActionsProps {
  /** 主页面当前选择的销售月份，用于默认月份 */
  month: Dayjs | null;
  /** 上传 / 保存成功后刷新主表 */
  onChanged: () => void;
}

const getDefaultMonth = (month: Dayjs | null) => month || dayjs().subtract(1, 'month');

const WalmartExtraActions: React.FC<WalmartExtraActionsProps> = ({ month, onChanged }) => {
  /* ---- 成本单价 / 物流费配置抽屉 ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [costMonth, setCostMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [keyword, setKeyword] = useState('');
  const [costList, setCostList] = useState<WalmartCostVo[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 导入成本单价（独立月份，不复用抽屉的查询月份）
  const [importOpen, setImportOpen] = useState(false);
  const [importMonth, setImportMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [importFile, setImportFile] = useState<File | null>(null);
  // 物流费弹窗（独立月份）
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [logisticsMonth, setLogisticsMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  // 物流费快捷录入（山姆 / 沃尔玛）
  const [samLogistics, setSamLogistics] = useState<number | null>(null);
  const [walmartLogistics, setWalmartLogistics] = useState<number | null>(null);
  const [logisticsSaving, setLogisticsSaving] = useState(false);

  /* ---- 新增 / 编辑配置项弹窗 ---- */
  const [configOpen, setConfigOpen] = useState(false);
  // 配置项所属月份（弹窗内单独选择）
  const [configMonth, setConfigMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [configSaving, setConfigSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WalmartCostVo | null>(null);
  const [form] = Form.useForm();
  const formKind = Form.useWatch('kind', form);

  // 批量复制到新月份
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [copyTargetMonth, setCopyTargetMonth] = useState<Dayjs | null>(
    getDefaultMonth(month).add(1, 'month'),
  );
  const [copySaving, setCopySaving] = useState(false);

  /* ---- 上传原始单弹窗 ---- */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMonth, setUploadMonth] = useState<Dayjs | null>(getDefaultMonth(month));
  const [chuhuoFile, setChuhuoFile] = useState<File | null>(null);
  const [tuihuiFile, setTuihuiFile] = useState<File | null>(null);
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [uploadingRaw, setUploadingRaw] = useState(false);

  // 从成本单价列表里回填物流费（物流费行 materialNo 为空，按渠道取 costPrice）
  const fillLogisticsFromList = (list: WalmartCostVo[]) => {
    const logistics = list.filter((item) => item.kind === '物流费');
    setSamLogistics(logistics.find((item) => item.channel === '山姆')?.costPrice ?? null);
    setWalmartLogistics(logistics.find((item) => item.channel === '沃尔玛')?.costPrice ?? null);
  };

  const loadCostList = async (m: Dayjs | null = costMonth, kw: string = keyword) => {
    if (!m) {
      message.error('请选择月份');
      return;
    }
    setCostLoading(true);
    try {
      const res = await ManagementReportApi.getWalmartCostList({
        month: m.format('YYYY-MM'),
        keyword: kw.trim() || undefined,
      });
      if (res.code === 200) {
        // 后端 /list 正常返回数组；兼容分页结构 { records: [] }
        const raw: any = res.data;
        const list: WalmartCostVo[] = Array.isArray(raw) ? raw : raw?.records || [];
        setCostList(list);
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询沃尔玛山姆成本单价失败:', error);
      message.error('查询沃尔玛山姆成本单价失败');
    } finally {
      setCostLoading(false);
    }
  };

  // 查询某月成本单价行（只取数据，不改变抽屉当前列表）
  const fetchCostRows = async (m: Dayjs): Promise<WalmartCostVo[]> => {
    const res = await ManagementReportApi.getWalmartCostList({ month: m.format('YYYY-MM') });
    if (res.code !== 200) return [];
    const raw: any = res.data;
    return Array.isArray(raw) ? raw : raw?.records || [];
  };

  // 打开抽屉时自动加载一次；切换月份 / 输入关键字后需点「查询」才重新加载
  useEffect(() => {
    if (drawerOpen) {
      loadCostList(costMonth, keyword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // 主页面切换月份时，同步配置抽屉默认月份（仅在未打开时）
  useEffect(() => {
    if (!drawerOpen) {
      setCostMonth(getDefaultMonth(month));
      setUploadMonth(getDefaultMonth(month));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const openDrawer = () => {
    setKeyword('');
    setCostMonth(getDefaultMonth(month));
    setDrawerOpen(true);
  };

  /* ---- 导入成本单价 Excel（弹窗内单独选择月份） ---- */
  const openImport = () => {
    setImportMonth(costMonth || getDefaultMonth(month));
    setImportFile(null);
    setImportOpen(true);
  };

  // 打开批量复制：默认「当前搜索月份 → 下个月」
  const openCopy = () => {
    const source = costMonth || getDefaultMonth(month);
    setCopySourceMonth(source);
    setCopyTargetMonth(source.add(1, 'month'));
    setCopyOpen(true);
  };

  const handleCopyMonthChange = (value: Dayjs | null, type: 'source' | 'target') => {
    if (type === 'source') {
      setCopySourceMonth(value);
      // 源月份变化时，目标月份跟着顺延一个月，减少手填
      if (value) setCopyTargetMonth(value.add(1, 'month'));
    } else {
      setCopyTargetMonth(value);
    }
  };

  const handleCopyConfig = async () => {
    if (!copySourceMonth || !copyTargetMonth) {
      message.error('请选择源月份和目标月份');
      return;
    }
    const source = copySourceMonth.format('YYYY-MM');
    const target = copyTargetMonth.format('YYYY-MM');
    if (source === target) {
      message.error('源月份与目标月份不能相同');
      return;
    }
    setCopySaving(true);
    try {
      const res = await ManagementReportApi.copyWalmartCost({
        sourceMonth: source,
        targetMonth: target,
      });
      if (res.code === 200) {
        const count = typeof res.data === 'number' ? res.data : 0;
        message.success(`复制完成：${source} → ${target}，新增 ${count} 条`);
        setCopyOpen(false);
        // 切到目标月份查看结果
        const targetDayjs = copyTargetMonth;
        setCostMonth(targetDayjs);
        setKeyword('');
        await loadCostList(targetDayjs, '');
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '复制失败');
      }
    } catch (error) {
      console.error('批量复制成本单价失败:', error);
    } finally {
      setCopySaving(false);
    }
  };

  const importFileProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式的成本单价文件');
        return Upload.LIST_IGNORE;
      }
      setImportFile(file);
      // 阻止自动上传，点击弹窗「开始导入」时统一提交
      return false;
    },
    fileList: importFile
      ? [{ uid: 'walmart-cost-file', name: importFile.name, status: 'done' as const }]
      : [],
    onRemove: () => setImportFile(null),
  };

  const handleImportCost = async () => {
    if (!importMonth) {
      message.error('请选择月份');
      return;
    }
    if (!importFile) {
      message.error('请选择成本单价 Excel');
      return;
    }
    setUploading(true);
    try {
      const res = await ManagementReportApi.uploadWalmartCost({
        month: importMonth.format('YYYY-MM'),
        file: importFile,
      });
      if (res.code === 200 && res.success !== false) {
        message.success(`成本单价导入成功，共 ${res.data ?? 0} 行`);
        setImportOpen(false);
        // 导入后切到导入月份，方便直接查看结果
        setCostMonth(importMonth);
        await loadCostList(importMonth);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '导入失败');
      }
    } catch (error) {
      console.error('导入沃尔玛山姆成本单价失败:', error);
      message.error('导入沃尔玛山姆成本单价失败');
    } finally {
      setUploading(false);
    }
  };

  /* ---- 新增 / 编辑配置项 ---- */
  const openAddConfig = () => {
    setEditingRecord(null);
    form.resetFields();
    // 只默认填月份，其余字段留空由用户填写
    setConfigMonth(costMonth || getDefaultMonth(month));
    setConfigOpen(true);
  };

  // 新增弹窗内切换月份：只切换所属月份，不自动带出模板
  const handleConfigMonthChange = (value: Dayjs | null) => {
    setConfigMonth(value);
  };

  const openEditConfig = (record: WalmartCostVo) => {
    setEditingRecord(record);
    setConfigMonth(costMonth);
    form.resetFields();
    form.setFieldsValue({
      kind: record.kind || '成本单价',
      channel: record.channel || undefined,
      materialNo: record.materialNo || undefined,
      goodsName: record.goodsName || undefined,
      costPrice: record.costPrice ?? undefined,
    });
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configMonth) {
      message.error('请选择月份');
      return;
    }
    let values: any;
    try {
      values = await form.validateFields();
    } catch (error) {
      return;
    }
    const kind = values.kind || '成本单价';
    const targetMonth = configMonth;
    setConfigSaving(true);
    try {
      let res;
      if (kind === '物流费') {
        res = await ManagementReportApi.saveWalmartLogistics({
          month: targetMonth.format('YYYY-MM'),
          channel: values.channel,
          amount: Number(values.costPrice ?? 0),
        });
      } else {
        res = await ManagementReportApi.saveWalmartCost({
          month: targetMonth.format('YYYY-MM'),
          materialNo: (values.materialNo || '').trim(),
          goodsName: (values.goodsName || '').trim() || null,
          channel: values.channel,
          costPrice:
            values.costPrice === undefined || values.costPrice === null
              ? null
              : Number(values.costPrice),
        });
      }
      if (res.code === 200 && res.success !== false) {
        message.success(editingRecord ? '保存成功' : '新增成功');
        setConfigOpen(false);
        // 切到保存的月份并刷新列表，方便直接看到结果
        setCostMonth(targetMonth);
        await loadCostList(targetMonth);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '保存失败');
      }
    } catch (error) {
      console.error('保存沃尔玛山姆配置项失败:', error);
      message.error('保存沃尔玛山姆配置项失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleDelete = async (record: WalmartCostVo) => {
    if (!costMonth) {
      message.error('请选择月份');
      return;
    }
    try {
      const res = await ManagementReportApi.deleteWalmartCost({
        id: record.id,
        month: costMonth.format('YYYY-MM'),
        materialNo: record.materialNo || undefined,
      });
      if (res.code === 200 && res.success !== false) {
        message.success('删除成功');
        await loadCostList();
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除沃尔玛山姆配置项失败:', error);
      message.error('删除沃尔玛山姆配置项失败');
    }
  };

  /* ---- 物流费快捷录入（弹窗内单独选择月份） ---- */
  const openLogistics = async () => {
    const m = costMonth || getDefaultMonth(month);
    setLogisticsMonth(m);
    setLogisticsOpen(true);
    setLogisticsLoading(true);
    try {
      fillLogisticsFromList(await fetchCostRows(m));
    } catch (error) {
      console.error('读取物流费失败:', error);
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleLogisticsMonthChange = async (value: Dayjs | null) => {
    setLogisticsMonth(value);
    if (!value) return;
    setLogisticsLoading(true);
    try {
      fillLogisticsFromList(await fetchCostRows(value));
    } catch (error) {
      console.error('读取物流费失败:', error);
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleSaveLogistics = async () => {
    if (!logisticsMonth) {
      message.error('请选择月份');
      return;
    }
    const targetMonth = logisticsMonth;
    const tasks: Array<{ channel: string; amount: number | null }> = [
      { channel: '山姆', amount: samLogistics },
      { channel: '沃尔玛', amount: walmartLogistics },
    ];
    const valid = tasks.filter(
      (item) => item.amount !== null && item.amount !== undefined && !Number.isNaN(item.amount),
    );
    if (!valid.length) {
      message.error('请至少填写一个渠道的物流费');
      return;
    }
    setLogisticsSaving(true);
    let failed = 0;
    try {
      for (const item of valid) {
        const res = await ManagementReportApi.saveWalmartLogistics({
          month: targetMonth.format('YYYY-MM'),
          channel: item.channel,
          amount: Number(item.amount),
        });
        if (res.code !== 200 || res.success === false) {
          failed += 1;
          message.error(
            `${item.channel}物流费保存失败：${
              typeof res.data === 'string' ? res.data : res.msg || '保存失败'
            }`,
          );
        }
      }
      if (!failed) {
        message.success('物流费保存成功');
      }
      setLogisticsOpen(false);
      // 切到保存的月份并刷新列表
      setCostMonth(targetMonth);
      await loadCostList(targetMonth);
      onChanged();
    } catch (error) {
      console.error('保存物流费失败:', error);
      message.error('保存物流费失败');
    } finally {
      setLogisticsSaving(false);
    }
  };

  const costColumns: TableColumnsType<WalmartCostVo> = [
    {
      title: '类型',
      dataIndex: 'kind',
      width: 96,
      render: (value: string) => (
        <Tag color={value === '物流费' ? 'orange' : 'blue'}>{value || '成本单价'}</Tag>
      ),
    },
    {
      title: '料号',
      dataIndex: 'materialNo',
      width: 150,
      render: (value: string | null) => value || '-',
    },
    {
      title: '品名',
      dataIndex: 'goodsName',
      width: 240,
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 100,
      render: (value: string | null) => value || '-',
    },
    {
      title: '成本单价 / 含税物流费',
      dataIndex: 'costPrice',
      width: 170,
      align: 'right',
      render: formatMoney,
    },
    {
      title: '包材',
      dataIndex: 'packagingPrice',
      width: 100,
      align: 'right',
      render: formatMoney,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_value, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditConfig(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除该配置项？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ---- 上传三份原始单 ---- */
  const openUploadRaw = () => {
    setUploadMonth(getDefaultMonth(month));
    setChuhuoFile(null);
    setTuihuiFile(null);
    setOrderFile(null);
    setUploadOpen(true);
  };

  const makeFileProps = (
    type: 'chuhuo' | 'tuihui' | 'order',
    setter: (file: File | null) => void,
    current: File | null,
  ): UploadProps => ({
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error('请上传 .xlsx / .xls 格式文件');
        return Upload.LIST_IGNORE;
      }
      setter(file);
      return false;
    },
    fileList: current
      ? [{ uid: `walmart-sam-${type}`, name: current.name, status: 'done' as const }]
      : [],
    onRemove: () => setter(null),
  });

  const handleUploadRaw = async () => {
    if (!uploadMonth) {
      message.error('请选择账单月份');
      return;
    }
    if (!chuhuoFile && !tuihuiFile && !orderFile) {
      message.error('请至少选择一个要上传的文件');
      return;
    }
    setUploadingRaw(true);
    try {
      const res = await ManagementReportApi.uploadWalmartSamFiles({
        month: uploadMonth.format('YYYY-MM'),
        chuhuoFile: chuhuoFile || undefined,
        tuihuiFile: tuihuiFile || undefined,
        orderFile: orderFile || undefined,
      });
      if (res.code === 200 && res.success !== false) {
        message.success(`原始单上传成功，共入库 ${res.data ?? 0} 行`);
        setUploadOpen(false);
        setChuhuoFile(null);
        setTuihuiFile(null);
        setOrderFile(null);
        onChanged();
      } else {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '上传失败');
      }
    } catch (error) {
      console.error('上传沃尔玛山姆原始单失败:', error);
      message.error('上传沃尔玛山姆原始单失败');
    } finally {
      setUploadingRaw(false);
    }
  };

  return (
    <>
      <Space>
        <Button type="primary" icon={<SettingOutlined />} onClick={openDrawer}>
          成本单价配置
        </Button>
        <Button type="primary" icon={<UploadOutlined />} onClick={openUploadRaw}>
          上传原始单
        </Button>
      </Space>

      {/* 成本单价 / 物流费配置抽屉 */}
      <Drawer
        title="沃尔玛山姆成本单价 / 物流费配置"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={1080}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="成本单价同时维护渠道（山姆 / 沃尔玛）"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 成本单价来源：「山姆、沃尔玛利润」工作簿「25年成本单价」sheet 的 2026
              列（已含包材），包材列仅展示不参与计算
              <br />
              2. 导入 Excel 需含「料号」「2026」「包材」「渠道」列，同月覆盖
              <br />
              3. 物流费按渠道录入当月含税金额，管报计算时 ÷ 1.06
              <br />
              4. 上传出货 / 退回单时，服务端按料号取当月成本单价表的渠道
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 操作栏：导入成本单价 / 新增配置项 / 物流费 */}
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            background: '#fafafa',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Space wrap>
            <Button icon={<UploadOutlined />} onClick={openImport}>
              导入成本单价 Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddConfig}>
              新增配置项
            </Button>
            <Button icon={<EditOutlined />} onClick={openLogistics}>
              录入物流费
            </Button>
            <Button icon={<CopyOutlined />} onClick={openCopy}>
              批量复制到新月份
            </Button>
          </Space>
        </div>

        {/* 搜索栏 */}
        <Space wrap style={{ display: 'flex', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#666' }}>月份</span>
          <DatePicker.MonthPicker
            style={{ width: 160 }}
            value={costMonth}
            format="YYYY-MM"
            placeholder="请选择月份"
            onChange={(date) => setCostMonth(date)}
            allowClear
          />
          <Input
            style={{ width: 220 }}
            placeholder="料号 / 品名关键字"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => loadCostList()}
            allowClear
          />
          <Button icon={<SearchOutlined />} onClick={() => loadCostList()}>
            查询
          </Button>
        </Space>

        <Table
          columns={costColumns}
          dataSource={costList}
          rowKey={(record) =>
            String(record.id ?? `${record.kind}-${record.materialNo}-${record.channel}`)
          }
          loading={costLoading}
          size="small"
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{ emptyText: '暂无数据，可导入 Excel 或新增配置项' }}
        />
      </Drawer>

      {/* 导入成本单价（弹窗内单独选择月份） */}
      <Modal
        title="导入成本单价"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImportCost}
        okText="开始导入"
        cancelText="取消"
        width={560}
        destroyOnClose
        confirmLoading={uploading}
      >
        <Alert
          type="info"
          showIcon
          message="同月覆盖导入"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. Excel 需含「料号」「2026」「包材」「渠道」列
              <br />
              2. 选择月份后导入，会覆盖该月已存在的成本单价
              <br />
              3. 导入完成后自动切换到该月份的列表
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              所属月份 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={importMonth}
              format="YYYY-MM"
              placeholder="请选择月份"
              onChange={(date) => setImportMonth(date)}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              成本单价文件 <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <Upload {...importFileProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* 录入物流费（弹窗内单独选择月份） */}
      <Modal
        title="录入物流费"
        open={logisticsOpen}
        onCancel={() => setLogisticsOpen(false)}
        onOk={handleSaveLogistics}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnClose
        confirmLoading={logisticsSaving}
      >
        <Alert
          type="info"
          showIcon
          message="按渠道录入当月物流费（含税）"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 填含税金额，管报计算时 ÷ 1.06 换算为不含税
              <br />
              2. 同月同渠道重复保存会覆盖
              <br />
              3. 至少填写一个渠道
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={logisticsLoading}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>
                所属月份 <span style={{ color: '#ff4d4f' }}>*</span>
              </span>
              <DatePicker.MonthPicker
                style={{ width: '100%' }}
                value={logisticsMonth}
                format="YYYY-MM"
                placeholder="请选择月份"
                onChange={handleLogisticsMonthChange}
                allowClear
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>山姆物流费（含税）</span>
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                value={samLogistics}
                placeholder="0.00"
                onChange={(value) => setSamLogistics(value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>沃尔玛物流费（含税）</span>
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                value={walmartLogistics}
                placeholder="0.00"
                onChange={(value) => setWalmartLogistics(value)}
              />
            </div>
          </div>
        </Spin>
      </Modal>

      {/* 批量复制到新月份 */}
      <Modal
        title="批量复制到新月份"
        open={copyOpen}
        onCancel={() => setCopyOpen(false)}
        onOk={handleCopyConfig}
        okText="开始复制"
        cancelText="取消"
        width={520}
        destroyOnClose
        confirmLoading={copySaving}
      >
        <Alert
          type="info"
          showIcon
          message="把源月份的成本单价整批复制到新月份"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 只复制「成本单价」行（料号、渠道、成品单价、包材单价）
              <br />
              2. 目标月份已存在的料号会跳过，不覆盖
              <br />
              3. 物流费不复制，需用「录入物流费」单独录
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              源月份（被复制） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={copySourceMonth}
              format="YYYY-MM"
              placeholder="请选择源月份"
              onChange={(date) => handleCopyMonthChange(date, 'source')}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              目标月份（新配置） <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={copyTargetMonth}
              format="YYYY-MM"
              placeholder="请选择目标月份"
              onChange={(date) => handleCopyMonthChange(date, 'target')}
              allowClear
            />
          </div>
        </div>
      </Modal>

      {/* 新增 / 编辑配置项 */}
      <Modal
        title={editingRecord ? '编辑配置项' : '新增配置项'}
        open={configOpen}
        onCancel={() => setConfigOpen(false)}
        onOk={handleSaveConfig}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnClose
        confirmLoading={configSaving}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="所属月份" required>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={configMonth}
              format="YYYY-MM"
              placeholder="请选择月份"
              onChange={handleConfigMonthChange}
              disabled={!!editingRecord}
              allowClear
            />
          </Form.Item>

          <Form.Item name="kind" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select options={KIND_OPTIONS} disabled={!!editingRecord} />
          </Form.Item>

          {formKind !== '物流费' && (
            <Form.Item
              name="materialNo"
              label="料号"
              rules={[{ required: true, message: '请输入料号' }]}
            >
              <Input placeholder="请输入料号" disabled={!!editingRecord} />
            </Form.Item>
          )}

          {formKind !== '物流费' && (
            <Form.Item name="goodsName" label="品名">
              <Input placeholder="请输入品名" />
            </Form.Item>
          )}

          <Form.Item
            name="channel"
            label="渠道"
            rules={[{ required: true, message: '请选择渠道' }]}
          >
            <Select options={CHANNEL_OPTIONS} placeholder="请选择渠道" />
          </Form.Item>

          <Form.Item
            name="costPrice"
            label={formKind === '物流费' ? '当月物流费（含税）' : '成本单价（2026 成品单价）'}
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber style={{ width: '100%' }} precision={4} placeholder="0.0000" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 上传三份原始单 */}
      <Modal
        title="上传沃尔玛山姆原始单"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={handleUploadRaw}
        okText="开始上传"
        cancelText="取消"
        width={620}
        destroyOnClose
        confirmLoading={uploadingRaw}
      >
        <Alert
          type="info"
          showIcon
          message="三个文件均可选，同类型同月覆盖重传"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              1. 出货单：出库明细（含料号 / 数量 / 单价 / 价税合计等）
              <br />
              2. 退回单：不是每月都有，有则上传
              <br />
              3. 销售订单：用于统计订单金额
              <br />
              4. 服务端按表头名定位列、按料号匹配渠道；自有/外采固定「自有」
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
              value={uploadMonth}
              format="YYYY-MM"
              placeholder="请选择账单月份"
              onChange={(date) => setUploadMonth(date)}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>出货单（可选）</span>
            <Upload {...makeFileProps('chuhuo', setChuhuoFile, chuhuoFile)}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>退回单（可选）</span>
            <Upload {...makeFileProps('tuihui', setTuihuiFile, tuihuiFile)}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>销售订单（可选）</span>
            <Upload {...makeFileProps('order', setOrderFile, orderFile)}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WalmartExtraActions;
