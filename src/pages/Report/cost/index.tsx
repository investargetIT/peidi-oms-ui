import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Select,
  Table,
  Space,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Upload,
  Tag,
  message,
} from 'antd';
import { SearchOutlined, EditOutlined, UploadOutlined, FileTextOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { UploadProps } from 'antd';
import FinanceUnitCostApi, {
  type FinanceUnitCostVo,
  type FinanceUnitCostPageReq,
  type FinanceUnitCostUpdateReq,
  type FinanceUnitCostTempReq,
} from '@/services/financeUnitCostApi';
import { toRawText, type RawNumber } from '../utils/numberText';

// Excel 单元格细边框（导出用）
function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

/**
 * 成本核算页
 *
 * initialMerchantCode：外部系统跳转时带的商家编码（如 BI 周报「缺失成本 → 补录成本」），
 * 进入页面后自动按该编码搜索，并打开「临时成本录入」弹窗预填该编码。
 * 该值只消费一次，消费后通过 onMerchantCodeConsumed 通知父级清空，
 * 避免在 tab 之间来回切换时反复弹窗。
 */
interface CostTabProps {
  initialMerchantCode?: string;
  onMerchantCodeConsumed?: () => void;
}

const CostTab: React.FC<CostTabProps> = ({ initialMerchantCode, onMerchantCodeConsumed }) => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<FinanceUnitCostVo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceUnitCostVo | null>(null);
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importDate, setImportDate] = useState<string>(dayjs().format('YYYY-MM'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  // 导出全部数据 loading
  const [exporting, setExporting] = useState(false);
  // 导入结果详情弹窗
  const [importResult, setImportResult] = useState<{
    addCount: number;
    updateCount: number;
    skipCount: number;
    /** 本次导入时后端清除的该月临时成本条数（文档 §2：正式表导入会物理删除该月 isTemp=1） */
    clearedTempCount: number;
    skippedLines: string[];
  } | null>(null);

  /* ---- 临时成本录入（周报缺失成本时补录） ---- */
  const [tempModalVisible, setTempModalVisible] = useState(false);
  const [tempForm] = Form.useForm();
  const [tempSubmitting, setTempSubmitting] = useState(false);
  // 临时成本筛选：all = 不过滤，temp = 只看临时成本（后端暂不支持按 isTemp 查询，这里只过滤当前页）
  const [tempFilter, setTempFilter] = useState<'all' | 'temp'>('all');

  const parseImportResult = (raw: unknown) => {
    const text = typeof raw === 'string' ? raw : '';
    const summary =
      text.match(
        /导入完成[：:]\s*新增\s*(\d+)\s*条[，,]\s*更新\s*(\d+)\s*条[，,]\s*跳过\s*(\d+)\s*条/,
      );
    const addCount = summary ? Number(summary[1]) : 0;
    const updateCount = summary ? Number(summary[2]) : 0;
    const skipCount = summary ? Number(summary[3]) : 0;
    // 正式成本表导入后，后端会在结果串末尾追加「; 已清除该月临时成本 N 条」
    const cleared = text.match(/已清除该月临时成本\s*(\d+)\s*条/);
    const clearedTempCount = cleared ? Number(cleared[1]) : 0;
    const detailIndex = text.indexOf('跳过详情');
    const skippedLines =
      detailIndex >= 0
        ? text
            .slice(detailIndex)
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => /^第\d+行/.test(s))
        : [];
    return { addCount, updateCount, skipCount, clearedTempCount, skippedLines };
  };

  const [searchBrandName, setSearchBrandName] = useState<string>('');
  const [searchMerchantCode, setSearchMerchantCode] = useState<string>('');
  const [searchProductNo, setSearchProductNo] = useState<string>('');
  const [searchU9No, setSearchU9No] = useState<string>('');
  const [searchIsNewProduct, setSearchIsNewProduct] = useState<string | undefined>(undefined);
  const [searchMonth, setSearchMonth] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [searchGroup, setSearchGroup] = useState<string>('');

  // 分页查询
  const fetchData = async (params: FinanceUnitCostPageReq = {}) => {
    setLoading(true);
    try {
      // 处理月份搜索 - 将月份格式转换为createdAt格式
      let searchParams: any = {
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        brandName: searchBrandName || undefined,
        merchantCode: searchMerchantCode || undefined,
        productNo: searchProductNo || undefined,
        u9No: searchU9No || undefined,
        isNewProduct: searchIsNewProduct || undefined,
        group: searchGroup || undefined,
        ...params,
      };

      // 如果有月份搜索条件，添加到参数中
      if (searchMonth) {
        // 将Dayjs格式的月份转换为所需的格式：2026-01-01 00:00:00
        searchParams.createdAt = searchMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      }

      const res = await FinanceUnitCostApi.getPage(searchParams);
      if (res.code === 200) {
        setDataSource(res.data.records || []);
        setPagination({
          current: res.data.current || 1,
          pageSize: res.data.size || 10,
          total: res.data.total || 0,
        });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : '获取数据失败');
      } else {
        message.error('获取数据失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 点击搜索
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchData({ pageNum: 1 });
  };

  useEffect(() => {
    if (initialMerchantCode) {
      // 外部跳转带了商家编码：按该编码筛选并自动打开「临时成本录入」预填，
      // 省去用户在列表里再找一遍（BI 周报「缺失成本 → 补录成本」链路）
      setSearchMerchantCode(initialMerchantCode);
      setPagination((prev) => ({ ...prev, current: 1 }));
      fetchData({ pageNum: 1, merchantCode: initialMerchantCode });
      setTempModalVisible(true);
      // 只消费一次：通知父级清空，避免切换 tab 回来时重复弹窗
      onMerchantCodeConsumed?.();
      return;
    }
    fetchData();
  }, []);

  // 重置搜索
  const handleReset = () => {
    setSearchBrandName('');
    setSearchMerchantCode('');
    setSearchProductNo('');
    setSearchU9No('');
    setSearchIsNewProduct(undefined);
    setSearchMonth(null);
    setSearchGroup('');
    setTempFilter('all');
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // 导出表格所有数据：按当前筛选条件拉全量（不分页），生成 Excel 下载
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const searchParams: FinanceUnitCostPageReq = {
        pageNum: 1,
        pageSize: 9999,
        brandName: searchBrandName || undefined,
        merchantCode: searchMerchantCode || undefined,
        productNo: searchProductNo || undefined,
        u9No: searchU9No || undefined,
        isNewProduct: searchIsNewProduct || undefined,
        group: searchGroup || undefined,
      };
      // 与列表查询一致：有月份时转成 createdAt 起点时间
      if (searchMonth) {
        searchParams.createdAt = searchMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss');
      }

      const res = await FinanceUnitCostApi.getPage(searchParams);
      if (res.code !== 200) {
        message.error(res.msg || '导出失败');
        return;
      }
      const records = res.data.records || [];
      if (records.length === 0) {
        message.warning('当前筛选条件下没有可导出的数据');
        return;
      }

      // 表头与页面表格一致（不含「操作」列）
      const HEADERS: { name: string; align: 'left' | 'right' }[] = [
        { name: '组织', align: 'left' },
        { name: '品牌', align: 'left' },
        { name: '系列分类', align: 'left' },
        { name: '料号', align: 'left' },
        { name: '条码', align: 'left' },
        { name: '货号', align: 'left' },
        { name: '品名', align: 'left' },
        { name: '财务单位成本', align: 'right' },
        { name: '内部转移单价', align: 'right' },
        { name: '备注', align: 'left' },
        { name: '自有/外采', align: 'left' },
        { name: '是否新品', align: 'left' },
        { name: '成本类型', align: 'left' },
      ];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'peidi-oms-ui';
      workbook.created = new Date();
      const ws = workbook.addWorksheet('成本核算');

      // 列宽（索引对齐 HEADERS）
      const COL_WIDTHS = [12, 16, 14, 12, 16, 16, 28, 14, 14, 16, 12, 12, 12];
      ws.columns = HEADERS.map((h, i) => ({
        header: h.name,
        key: `c${i}`,
        width: COL_WIDTHS[i],
      }));

      // 表头样式：灰底加粗居中
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, size: 12 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        cell.border = thinBorder();
      });

      // 数据行（数字一律按后端返回的文本原样写入，不设小数位格式，避免 Excel 二次截断）
      records.forEach((r: FinanceUnitCostVo) => {
        const values: string[] = [
          r.group || '',
          r.brandName || '',
          r.spu || '',
          r.u9No || '',
          r.merchantCode || '',
          r.productNo || '',
          r.goodsName || '',
          toRawText(r.financeCost as RawNumber),
          toRawText(r.internalPrice as RawNumber),
          r.remark || '',
          r.own || '',
          r.isNewProduct === '1' ? '是' : r.isNewProduct === '0' ? '否' : r.isNewProduct || '',
          // 老版本后端不返回 isTemp：留空，不要写成「正式」误导财务
          r.isTemp === 1 ? '临时' : r.isTemp === 0 ? '正式' : '',
        ];
        const row = ws.addRow(values);
        row.eachCell((cell, colIndex) => {
          cell.border = thinBorder();
          cell.font = { size: 12 };
          cell.alignment = {
            horizontal: (HEADERS[colIndex - 1]?.align || 'left') as 'left' | 'right',
            vertical: 'middle',
          };
          // 料号：参考财务「销售单文件上传 - 处理后文件导出」中的料号逻辑，
          // 直接以文本写入并设置 numFmt='@'，确保后置0不被 Excel 当数字取消掉
          const key = HEADERS[colIndex - 1]?.name;
          if (key === '料号') {
            cell.value =
              r.u9No === null || r.u9No === undefined ? '' : String(r.u9No).trim();
            cell.numFmt = '@';
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const monthLabel = searchMonth ? searchMonth.format('YYYY-MM') : '全部';
      const fileName = `成本核算_${monthLabel}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        fileName,
      );
      message.success(`导出成功：共 ${records.length} 条数据`);
    } catch (error) {
      console.error('导出成本核算数据失败:', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    fileList: selectedFile ? [{ uid: '1', name: selectedFile.name, status: 'done' }] : [],
    onRemove: () => {
      setSelectedFile(null);
    },
    accept: '.xlsx,.xls,.csv',
  };

  // 提交导入
  const handleImport = async () => {
    if (!selectedFile) {
      message.error('请选择文件');
      return;
    }
    if (!importDate) {
      message.error('请选择日期');
      return;
    }

    setImporting(true);
    try {
      const res = await FinanceUnitCostApi.import({
        createDate: importDate,
        file: selectedFile,
      });
      if (res.code === 200 || res.success) {
        const result = parseImportResult(res.data);
        // 临时成本被清除时一并告知（文档 §2：导入该月正式表会清掉该月全部 isTemp=1）
        const clearedText =
          result.clearedTempCount > 0 ? `，已清除该月临时成本 ${result.clearedTempCount} 条` : '';

        // 全部成功（无跳过）→ 顶部简短提示
        if (result.skipCount === 0) {
          message.success(
            `导入成功：新增 ${result.addCount} 条，更新 ${result.updateCount} 条${clearedText}`,
            clearedText ? 6 : 3,
          );
          setImportModalVisible(false);
          setSelectedFile(null);
          fetchData({ pageNum: 1 });
        } else {
          // 含跳过数据 → 弹出结果详情弹窗，并刷新列表
          setImportResult(result);
          setImportModalVisible(false);
          setSelectedFile(null);
          fetchData({ pageNum: 1 });
        }
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '导入失败');
      } else {
        message.error(res.msg || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  /* ---- 临时成本录入 ---- */
  const openTempModal = () => {
    setTempModalVisible(true);
  };

  // 弹窗打开后再回填默认值：Modal 默认懒渲染，弹窗未打开时 Form 还没挂载，
  // 提前 setFieldsValue 会告警「Instance created by useForm is not connected」
  useEffect(() => {
    if (!tempModalVisible) return;
    tempForm.resetFields();
    tempForm.setFieldsValue({
      // 默认取当前搜索的月份，没有就取上个月（周报一般查上周，落在上个月或本月）
      month: searchMonth || dayjs().subtract(1, 'month'),
      own: '外采',
      // 带过来 / 正在筛选的商家编码直接预填，减少手输
      merchantCode: searchMerchantCode || undefined,
    });
  }, [tempModalVisible]);

  const handleSubmitTemp = async () => {
    let values: any;
    try {
      values = await tempForm.validateFields();
    } catch (error) {
      // 表单校验失败，antd 已在字段下方给出提示
      return;
    }

    const merchantCode = String(values.merchantCode ?? '').trim();
    // 文档 §5：后端参数校验失败统一返回 500 Internal server error，所以这里先自查
    if (!merchantCode) {
      message.error('请填写商家编码');
      return;
    }
    if (!values.month || !dayjs.isDayjs(values.month)) {
      message.error('请选择成本所属月份');
      return;
    }
    if (values.matchedCost === undefined || values.matchedCost === null) {
      message.error('请填写匹配成本单价');
      return;
    }

    const params: FinanceUnitCostTempReq = {
      merchantCode,
      month: values.month.format('YYYY-MM'),
      matchedCost: Number(values.matchedCost),
      financeCost:
        values.financeCost === undefined || values.financeCost === null
          ? undefined
          : Number(values.financeCost),
      internalPrice:
        values.internalPrice === undefined || values.internalPrice === null
          ? undefined
          : Number(values.internalPrice),
      productNo: values.productNo?.trim() || undefined,
      u9: values.u9?.trim() || undefined,
      brandName: values.brandName?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
      own: values.own || undefined,
      // group 不传：后端默认智创，报表按智创取数（文档 §2）
    };

    setTempSubmitting(true);
    try {
      const res = await FinanceUnitCostApi.createTemp(params);
      if (res.code === 200 && res.success !== false) {
        const isTemp = res.data?.isTemp;
        message.success(
          isTemp === 1
            ? `临时成本已录入：${merchantCode}（${params.month}）`
            : `成本已保存：${merchantCode}（${params.month}）`,
          6,
        );
        setTempModalVisible(false);
        tempForm.resetFields();
        // 回到第一页刷新，确保新录入的记录可见（按条码搜索时尤为需要）
        setPagination((prev) => ({ ...prev, current: 1 }));
        fetchData({ pageNum: 1 });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '录入失败');
      } else {
        message.error(res.msg || '录入失败');
      }
    } catch (error) {
      console.error('录入临时成本失败:', error);
      message.error('录入临时成本失败');
    } finally {
      setTempSubmitting(false);
    }
  };

  // 编辑操作 - 打开弹窗
  const handleEdit = (record: FinanceUnitCostVo) => {
    if (!record.id) return;
    setEditingRecord(record);
    form.setFieldsValue({
      financeCost: record.financeCost,
      internalPrice: record.internalPrice,
      remark: record.remark,
      own: record.own,
      isNewProduct: record.isNewProduct,
    });
    setEditModalVisible(true);
  };

  // 确认更新
  const handleConfirmUpdate = async () => {
    if (!editingRecord) return;
    try {
      const values = await form.validateFields();
      if (!editingRecord.id) {
        message.error('记录ID不存在');
        return;
      }

      setUpdating(true);
      const updateParams: FinanceUnitCostUpdateReq = {
        id: editingRecord.id,
        financeCost: values.financeCost,
        internalPrice: values.internalPrice,
        remark: values.remark,
        own: values.own,
        isNewProduct: values.isNewProduct,
      };

      const res = await FinanceUnitCostApi.update(updateParams);
      if (res.code === 200 || res.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        fetchData();
      } else if (res.code === 500) {
        message.error(res.data || res.msg || '更新失败');
      } else {
        message.error(res.msg || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  // 成本核算表格列定义
  const costColumns = [
    {
      title: '组织',
      dataIndex: 'group',
      key: 'group',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '系列分类',
      dataIndex: 'spu',
      key: 'spu',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '料号',
      dataIndex: 'u9No',
      key: 'u9No',
      width: 120,
    },
    {
      title: '条码',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 150,
    },
    {
      title: '货号',
      dataIndex: 'productNo',
      key: 'productNo',
      width: 150,
    },
    {
      title: '品名',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 250,
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeCost',
      key: 'financeCost',
      width: 120,
      // 数字一律按后端返回原样展示（后端几位小数就几位，不四舍五入）
      render: (value: RawNumber) => toRawText(value as RawNumber) || '-',
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalPrice',
      key: 'internalPrice',
      width: 120,
      // 数字一律按后端返回原样展示（后端几位小数就几位，不四舍五入）
      render: (value: RawNumber) => toRawText(value as RawNumber) || '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 100,
    },
    {
      title: '是否新品',
      dataIndex: 'isNewProduct',
      key: 'isNewProduct',
      width: 100,
      render: (value: string) => {
        if (value === '1') return '是';
        if (value === '0') return '否';
        return value || '-';
      },
    },
    {
      // 临时成本（手工录入，用于周报缺失成本时补录）；财务正式成本表导入该月后会被清掉
      // 注意：判断用 isTemp 字段，不要用备注文本匹配（备注用户可以自己改）
      title: '成本类型',
      dataIndex: 'isTemp',
      key: 'isTemp',
      width: 100,
      render: (value: number | null | undefined) => {
        if (value === 1) return <Tag color="orange">临时</Tag>;
        if (value === 0) return <Tag color="default">正式</Tag>;
        // 老版本后端未返回 isTemp 字段时展示 '-'，不要臆断成正式成本
        return '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: FinanceUnitCostVo) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  // 临时成本筛选：后端 /page 暂不支持 isTemp 查询条件，只能在当前页内过滤
  // （文档 §3 建议的「只看临时成本」筛选，等后端支持后再改成服务端筛选）
  const tableData = useMemo(() => {
    if (tempFilter !== 'temp') return dataSource;
    return dataSource.filter((item) => item.isTemp === 1);
  }, [dataSource, tempFilter]);

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

      {/* 搜索栏 */}
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            {/* 月份 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>月份</span>
              <DatePicker.MonthPicker
                style={{ width: 180 }}
                value={searchMonth}
                onChange={(date) => setSearchMonth(date)}
                format="YYYY-MM"
                placeholder="请选择月份"
                allowClear
              />
            </div>
    
            {/* 组织 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>组织</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 品牌 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>品牌</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchBrandName}
                onChange={(e) => setSearchBrandName(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 条码 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>条码</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchMerchantCode}
                onChange={(e) => setSearchMerchantCode(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 货号 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>货号</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchProductNo}
                onChange={(e) => setSearchProductNo(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 料号 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>料号</span>
              <Input
                placeholder="模糊匹配"
                prefix={<SearchOutlined />}
                style={{ width: 180 }}
                value={searchU9No}
                onChange={(e) => setSearchU9No(e.target.value)}
                allowClear
              />
            </div>
    
            {/* 是否新品 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>是否新品</span>
              <Select
                style={{ width: 130 }}
                allowClear
                value={searchIsNewProduct}
                onChange={(value) => setSearchIsNewProduct(value)}
                placeholder="请选择"
                options={[
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ]}
              />
            </div>

            {/* 成本类型：后端暂不支持按 isTemp 查询，这里只过滤当前页 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>成本类型</span>
              <Select
                style={{ width: 150 }}
                value={tempFilter}
                onChange={(value) => setTempFilter(value)}
                options={[
                  { label: '全部', value: 'all' },
                  { label: '只看临时成本', value: 'temp' },
                ]}
              />
            </div>
    
            {/* 操作按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
              <Space>
                <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button
              type="primary"
              className="excel-export-btn"
              icon={<DownloadOutlined />}
              onClick={handleExportAll}
              loading={exporting}
            >
              导出所有数据
            </Button>
            <Button
              type="primary"
              className="grayblue-btn"
              style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
              icon={<PlusOutlined />}
              onClick={openTempModal}
            >
              临时成本录入
            </Button>
            <Button
              type="primary"
              className="grayblue-btn"
              style={{ background: '#2f54eb', borderColor: '#2f54eb' }}
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              导入成本数据
            </Button>
          </div>
        </div>

        {/* 表格 */}
        <Table
          columns={costColumns}
          dataSource={tableData}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 2000 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || 20,
              }));
              fetchData({ pageNum: page, pageSize });
            },
          }}
        />
    
        {/* 编辑弹窗 */}
        <Modal
          title="编辑成本核算"
          open={editModalVisible}
          onOk={handleConfirmUpdate}
          onCancel={() => setEditModalVisible(false)}
          confirmLoading={updating}
          okText="确认更新"
          cancelText="取消"
          width={600}
          styles={{ body: { padding: '16px' } }}
        >
          <Form form={form} layout="vertical">
            <div style={{ marginBottom: 16 }}>
              <p>
                <strong>品牌：</strong>
                {editingRecord?.brandName}
              </p>
              <p>
                <strong>品名：</strong>
                {editingRecord?.goodsName}
              </p>
              <p>
                <strong>条码：</strong>
                {editingRecord?.merchantCode}
              </p>
            </div>
            <Form.Item
              label="财务单位成本"
              name="financeCost"
              rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入财务单位成本"
                min={0}
              />
            </Form.Item>
            <Form.Item
              label="内部转移单价"
              name="internalPrice"
              rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入内部转移单价"
                min={0}
              />
            </Form.Item>
            <Form.Item label="备注" name="remark">
              <Input.TextArea placeholder="请输入备注" rows={3} />
            </Form.Item>
            <Form.Item label="自有/外采" name="own">
              <Select
                placeholder="请选择"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: '自有', value: '自有' },
                  { label: '外采', value: '外采' },
                ]}
              />
            </Form.Item>
            <Form.Item label="是否新品" name="isNewProduct">
              <Select
                placeholder="请选择"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
    
        {/* 临时成本录入（周报缺失成本时补录；财务正式成本表导入该月后会被清掉） */}
        <Modal
          title="临时成本录入"
          open={tempModalVisible}
          onOk={handleSubmitTemp}
          onCancel={() => setTempModalVisible(false)}
          confirmLoading={tempSubmitting}
          okText="保存"
          cancelText="取消"
          width={680}
          styles={{ body: { padding: '16px' } }}
          destroyOnClose
        >
          <Alert
            type="warning"
            showIcon
            message="临时成本用于补周报缺失的成本，财务正式成本表导入该月后会被自动清除"
            description={
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                1. 「商家编码 + 月份」唯一：重复录入会更新同一条，不会产生重复行
                <br />
                2. 保存后报表缓存自动失效，重新生成周报即可用上这笔成本
                <br />
                3. 财务正式成本表导入该月时，该月全部临时成本被删除（正式值优先）
              </div>
            }
            style={{ marginBottom: 16 }}
          />
          <Form form={tempForm} layout="vertical">
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                label="成本所属月份"
                name="month"
                style={{ flex: 1 }}
                rules={[{ required: true, message: '请选择成本所属月份' }]}
              >
                <DatePicker.MonthPicker
                  style={{ width: '100%' }}
                  format="YYYY-MM"
                  placeholder="请选择月份"
                />
              </Form.Item>
              <Form.Item
                label="商家编码"
                name="merchantCode"
                style={{ flex: 1 }}
                rules={[{ required: true, message: '请填写商家编码（成本匹配键）' }]}
              >
                <Input placeholder="请输入商家编码，如：6820261104001" allowClear />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                label="匹配成本单价"
                name="matchedCost"
                style={{ flex: 1 }}
                rules={[{ required: true, message: '请填写匹配成本单价' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="必填，如 0.05"
                  min={0}
                  step={0.01}
                />
              </Form.Item>
              <Form.Item
                label="财务成本（不填同匹配成本）"
                name="financeCost"
                style={{ flex: 1 }}
                rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="选填" min={0} step={0.01} />
              </Form.Item>
              <Form.Item
                label="内结价（不填为 0）"
                name="internalPrice"
                style={{ flex: 1 }}
                rules={[{ type: 'number', min: 0, message: '请输入有效数字' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="选填" min={0} step={0.01} />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="货品编码" name="productNo" style={{ flex: 1 }}>
                <Input placeholder="选填" allowClear />
              </Form.Item>
              <Form.Item label="料号" name="u9" style={{ flex: 1 }}>
                <Input placeholder="选填" allowClear />
              </Form.Item>
              <Form.Item label="品牌" name="brandName" style={{ flex: 1 }}>
                <Input placeholder="选填，不存在会自动新建品牌档案" allowClear />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item label="自有/外采" name="own" style={{ flex: 1 }}>
                <Select
                  placeholder="选填"
                  allowClear
                  options={[
                    { label: '自有', value: '自有' },
                    { label: '外采', value: '外采' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="备注" name="remark" style={{ flex: 2 }}>
                <Input placeholder="选填，默认「临时成本(手工录入)」" allowClear />
              </Form.Item>
            </div>
          </Form>
        </Modal>

        {/* 导入弹窗 */}
        <Modal
          title="导入成本数据"
          open={importModalVisible}
          onOk={handleImport}
          onCancel={() => {
            setImportModalVisible(false);
            setSelectedFile(null);
          }}
          confirmLoading={importing}
          okText="导入"
          cancelText="取消"
          styles={{ body: { padding: '8px 0' } }}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                日期 <span style={{ color: 'red' }}>*</span>
              </div>
              <DatePicker.MonthPicker
                style={{ width: '100%' }}
                value={importDate ? dayjs(importDate) : null}
                onChange={(date) => setImportDate(date ? date.format('YYYY-MM') : '')}
                placeholder="请选择月份"
              />
            </div>
            <div>
              <div style={{ marginBottom: 8 }}>
                文件 <span style={{ color: 'red' }}>*</span>
              </div>
              <Upload {...uploadProps}>
                <Button icon={<FileTextOutlined />}>选择文件</Button>
              </Upload>
              <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                支持 .xlsx, .xls, .csv 格式文件
              </div>
            </div>
          </div>
        </Modal>
    
        {/* 导入结果详情弹窗（含跳过数据时弹出） */}
        <Modal
          title={
            importResult
              ? importResult.skipCount > 0 && importResult.addCount + importResult.updateCount === 0
                ? '导入完成（数据全部跳过）'
                : '导入完成（含跳过数据）'
              : '导入结果'
          }
          open={!!importResult}
          onCancel={() => setImportResult(null)}
          onOk={() => setImportResult(null)}
          okText="我知道了"
          cancelButtonProps={{ style: { display: 'none' } }}
          width={720}
        >
          {importResult && (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: '#fafafa',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                <Space size={16} wrap>
                  <span>
                    新增{' '}
                    <span style={{ color: '#52c41a', fontWeight: 600 }}>
                      {importResult.addCount}
                    </span>{' '}
                    条
                  </span>
                  <span>
                    更新{' '}
                    <span style={{ color: '#1890ff', fontWeight: 600 }}>
                      {importResult.updateCount}
                    </span>{' '}
                    条
                  </span>
                  <span>
                    跳过{' '}
                    <span style={{ color: '#faad14', fontWeight: 600 }}>
                      {importResult.skipCount}
                    </span>{' '}
                    条
                  </span>
                  {importResult.clearedTempCount > 0 && (
                    <span>
                      已清除该月临时成本{' '}
                      <span style={{ color: '#fa8c16', fontWeight: 600 }}>
                        {importResult.clearedTempCount}
                      </span>{' '}
                      条
                    </span>
                  )}
                </Space>
              </div>
    
              {importResult.skippedLines.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    跳过详情（共 {importResult.skippedLines.length} 条）：
                  </div>
                  <div
                    style={{
                      maxHeight: 360,
                      overflowY: 'auto',
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 4,
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {importResult.skippedLines.join('\n')}
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
        </>
  );
};

export default CostTab;
