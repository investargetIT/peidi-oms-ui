import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Select, Space, Table, message } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import ManagementReportApi, {
  type ManagementReportQueryReq,
  type FinanceGoodsSalesSummaryAllCostVo,
  type SalesOutDetailsCostVo,
  type WalmartRebateQueryVo,
  type JdSalesCostVo,
  type TmcsSalesCostVo,
  type TmallFlashSaleVo,
  type JdFeeVo,
  type WalmartDetailVo,
  type WalmartProfitVo,
} from '@/services/managementReportApi';
import JdExtraActions from './JdExtraActions';
import WalmartExtraActions from './WalmartExtraActions';

// 京东自营费用分组：与「京东自营9月份数据.xlsx」表头保持一致
const JD_FEE_GROUPS = [
  {
    key: 'express',
    title: '快递费、物流费',
    match: (category: string) => category.includes('快递') || category.includes('物流'),
  },
  {
    key: 'promotion',
    title: '推广费用',
    match: (category: string) => category.includes('推广'),
  },
  {
    key: 'platform',
    title: '平台费用',
    match: (category: string) => category.includes('平台'),
  },
  {
    key: 'publicShare',
    title: '公共费用分摊',
    match: (category: string) => category.includes('公共'),
  },
] as const;

// 金额格式化：空值展示空字符串（京东自营表销售/费用分开展示，避免满屏 '-'）
const formatJdMoney = (v?: number | null) =>
  v === null || v === undefined ? '' : Number(v).toFixed(2);

// 金额格式化：空值展示 '-'
const formatMoneyDash = (v?: number | null) =>
  v === null || v === undefined ? '-' : Number(v).toFixed(2);

// 税率格式化：type=6/7/8 的税率是数字（0.09 表示 9%），按百分比展示；未匹配到税率（null）展示 '-'
const formatTaxRatePercent = (v?: number | null) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const percent = Number(v) * 100;
  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`;
};

// 税率格式化（京东系表格共用）：
// type=4/9/10 为字符串（"0.09" 表示 9%），原样展示；type=7/8 为数字（0.09），转百分比展示
const formatTaxRateMixed = (v?: number | string | null) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return formatTaxRatePercent(v);
  return String(v);
};

// 自有/外采：空值表示文件里该行未填，展示为 '-'
const formatOwn = (v?: string | null) => (v ? v : '-');

// 数据类型 -> 展示名（下载文件名等场景使用）
const MR_TYPE_LABELS: Record<number, string> = {
  1: '线上',
  2: '线下',
  3: '沃尔玛',
  4: '京东自营',
  5: '天猫超市',
  6: '天猫闪购',
  7: '招行内购',
  8: '宁波银行',
  9: '天猫国际',
  10: '亚马逊',
  11: '沃尔玛山姆',
};

const ManagementReportTab: React.FC = () => {
  // 数据类型：1-线上 2-线下 3-沃尔玛 4-京东自营 5-天猫超市 6-天猫闪购
  // 7-招行内购 8-宁波银行 9-天猫国际 10-亚马逊
  const [mrType, setMrType] = useState<number>(1);
  // 销售月份（单月选择，起止都用同一个值）
  const [mrStartMonth, setMrStartMonth] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [mrEndMonth, setMrEndMonth] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [mrLoading, setMrLoading] = useState(false);
  const [mrOnlineList, setMrOnlineList] = useState<FinanceGoodsSalesSummaryAllCostVo[]>([]);
  const [mrOfflineList, setMrOfflineList] = useState<SalesOutDetailsCostVo[]>([]);
  const [mrWalmartList, setMrWalmartList] = useState<WalmartRebateQueryVo[]>([]);
  // 京东自营：销售 + 费用（费用子类按类别分组，覆盖到前几行）
  const [mrJdList, setMrJdList] = useState<JdSalesCostVo[]>([]);
  // 天猫超市：销售（一行一个后端商品编码）
  const [mrTmcsList, setMrTmcsList] = useState<TmcsSalesCostVo[]>([]);
  // 天猫闪购：货品×仓库收入汇总（两个闪购仓已合并，一行一个货品）
  const [mrWarehouseList, setMrWarehouseList] = useState<TmallFlashSaleVo[]>([]);
  // 招行内购（type=7）/ 宁波银行（type=8）：字段同 jdList
  const [mrZhaohangList, setMrZhaohangList] = useState<JdSalesCostVo[]>([]);
  const [mrNingboList, setMrNingboList] = useState<JdSalesCostVo[]>([]);
  // 其他费用明细（type=4/5 共用）
  const [mrFeeList, setMrFeeList] = useState<JdFeeVo[]>([]);
  // 沃尔玛山姆（type=11）：明细表 + 利润表
  const [mrWalmartDetailList, setMrWalmartDetailList] = useState<WalmartDetailVo[]>([]);
  const [mrWalmartProfitList, setMrWalmartProfitList] = useState<WalmartProfitVo[]>([]);
  // 明细表筛选：渠道 / 单据类型
  const [walmartChannelFilter, setWalmartChannelFilter] = useState<string | undefined>(undefined);
  const [walmartDocTypeFilter, setWalmartDocTypeFilter] = useState<string | undefined>(undefined);

  // 沃尔玛山姆（type=11）：两张表
  const isWalmartSamType = mrType === 11;

  // 明细表按渠道 / 单据类型前端筛选
  const mrWalmartDetailData = useMemo(() => {
    return mrWalmartDetailList.filter((item) => {
      if (walmartChannelFilter && item.channel !== walmartChannelFilter) return false;
      if (walmartDocTypeFilter && item.docType !== walmartDocTypeFilter) return false;
      return true;
    });
  }, [mrWalmartDetailList, walmartChannelFilter, walmartDocTypeFilter]);

  // 京东自营 / 天猫超市：是否展示费用相关区域
  const isFeeType = mrType === 4 || mrType === 5;
  const feeTypeLabel = mrType === 5 ? '天猫超市' : '京东自营';
  // U9 应收单相关类型（4-京东自营 9-天猫国际 10-亚马逊）：展示上传按钮
  const isU9Type = mrType === 4 || mrType === 9 || mrType === 10;

  // 京东自营表格数据：
  // 与「京东自营9月份数据.xlsx」保持一致——费用子类不再单独占行，
  // 而是按类别分组后依次填充到前几行销售数据的对应费用列里。
  const mrJdTableData = useMemo(() => {
    const rows: Record<string, any>[] = mrJdList.map((item, index) => ({
      ...item,
      __key: `jd-sale-${index}`,
    }));

    JD_FEE_GROUPS.forEach((group) => {
      const groupFees = mrFeeList.filter((fee) => group.match(fee.category || ''));
      groupFees.forEach((fee, index) => {
        // 费用子类比销售行多时，补一行只展示费用的行
        if (!rows[index]) {
          rows[index] = { __key: `jd-fee-row-${index}` };
        }
        rows[index][`${group.key}FeeName`] = fee.name;
        rows[index][`${group.key}FeeAmount`] = fee.amount;
        rows[index][`${group.key}FeeTaxRate`] = fee.taxRate;
        rows[index][`${group.key}FeeTotal`] = fee.total;
      });
    });

    return rows;
  }, [mrJdList, mrFeeList]);

  // 管报数据查询
  const fetchManagementReport = async (overrides?: {
    type?: number;
    startMonth?: Dayjs | null;
    endMonth?: Dayjs | null;
  }) => {
    const _type = overrides?.type !== undefined ? overrides.type : mrType;
    const _startMonth = overrides?.startMonth !== undefined ? overrides.startMonth : mrStartMonth;
    const _endMonth = overrides?.endMonth !== undefined ? overrides.endMonth : mrEndMonth;

    if (!_startMonth || !_endMonth) {
      message.error('请选择销售月份');
      return;
    }

    const params: ManagementReportQueryReq = {
      type: _type,
      startDate: _startMonth.startOf('month').format('YYYY-MM-DD'),
      endDate: _endMonth.endOf('month').format('YYYY-MM-DD'),
    };

    setMrLoading(true);
    try {
      const res = await ManagementReportApi.query(params);
      if (res.code === 200) {
        const data = res.data || ({} as any);
        setMrOnlineList(data.onlineList || []);
        setMrOfflineList(data.offlineList || []);
        setMrWalmartList(data.walmartList || []);
        setMrJdList(data.jdList || []);
        setMrTmcsList(data.tmcsList || []);
        setMrFeeList(data.feeList || []);
        setMrWarehouseList(data.warehouseList || []);
        setMrZhaohangList(data.zhaohangList || []);
        setMrNingboList(data.ningboList || []);
        // 沃尔玛山姆（type=11）：明细表 + 利润表
        setMrWalmartDetailList(data.walmartDetailList || []);
        setMrWalmartProfitList(data.walmartProfitList || []);
        message.success('查询成功');
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询管报数据失败:', error);
      message.error('查询管报数据失败');
    } finally {
      setMrLoading(false);
    }
  };

  // 重置管报数据查询条件
  const handleMrReset = () => {
    // 重置只恢复月份筛选，保留当前数据类型（避免在京东自营下重置后被切回线上）
    const defaultMonth = dayjs().subtract(1, 'month');
    setMrStartMonth(defaultMonth);
    setMrEndMonth(defaultMonth);
    setMrOnlineList([]);
    setMrOfflineList([]);
    setMrWalmartList([]);
    setMrJdList([]);
    setMrTmcsList([]);
    setMrFeeList([]);
    setMrWarehouseList([]);
    setMrZhaohangList([]);
    setMrNingboList([]);
    setMrWalmartDetailList([]);
    setMrWalmartProfitList([]);
    fetchManagementReport({
      type: mrType,
      startMonth: defaultMonth,
      endMonth: defaultMonth,
    });
  };

  // 管报数据查询 - 线上表格列（type=1）
  const mrOnlineColumns = [
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '成本匹配来源',
      dataIndex: 'costMatchSource',
      key: 'costMatchSource',
      width: 140,
    },
  ];

  // 管报数据查询 - 线下表格列（type=2）
  const mrOfflineColumns = [
    {
      title: '创建时间',
      dataIndex: 'created',
      key: 'created',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '规格编码',
      dataIndex: 'specNo',
      key: 'specNo',
      width: 140,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '店铺名称',
      dataIndex: 'shopName',
      key: 'shopName',
      width: 180,
    },
  ];

  // 管报数据查询 - 沃尔玛/山姆表格列（type=3）
  const mrWalmartColumns = [
    {
      title: '创建时间',
      dataIndex: 'created',
      key: 'created',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '规格编码',
      dataIndex: 'specNo',
      key: 'specNo',
      width: 140,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '店铺品牌',
      dataIndex: 'shopBrand',
      key: 'shopBrand',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '返利率',
      dataIndex: 'rebateRate',
      key: 'rebateRate',
      width: 80,
    },
  ];

  // 管报数据查询 - 京东系表格列（京东自营 4 / 天猫国际 9 / 亚马逊 10 / 招行内购 7 / 宁波银行 8 共用）
  // 表头名称/数量与「京东自营9月份数据.xlsx」保持一致；费用 4 组仅 type=4 追加
  const mrJdBaseColumns = [
    {
      title: '立账日期',
      dataIndex: 'created',
      key: 'created',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 80,
      render: formatOwn,
    },
    {
      title: '临期',
      dataIndex: 'nearExpiry',
      key: 'nearExpiry',
      width: 90,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: formatJdMoney,
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
      // 4/9/10 为字符串、7/8 为数字，统一格式化（数字转百分比，字符串原样）
      render: formatTaxRateMixed,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: formatJdMoney,
    },
  ];

  // 管报数据查询 - 京东自营表格列（type=4）：销售列 + 费用 4 组 × 4 列
  const mrJdColumns = [
    ...mrJdBaseColumns,
    // 费用 4 组：类别、未税金额、税率、价税合计
    ...JD_FEE_GROUPS.flatMap((group, index) => {
      const suffix = index + 1;
      return [
        {
          title: group.title,
          dataIndex: `${group.key}FeeName`,
          key: `${group.key}FeeName`,
          width: 130,
        },
        {
          title: `未税金额${suffix}`,
          dataIndex: `${group.key}FeeAmount`,
          key: `${group.key}FeeAmount`,
          width: 110,
          render: formatJdMoney,
        },
        {
          title: `税率${suffix}`,
          dataIndex: `${group.key}FeeTaxRate`,
          key: `${group.key}FeeTaxRate`,
          width: 80,
        },
        {
          title: `价税合计${suffix}`,
          dataIndex: `${group.key}FeeTotal`,
          key: `${group.key}FeeTotal`,
          width: 120,
          render: formatJdMoney,
        },
      ];
    }),
  ];

  // 管报数据查询 - 天猫超市表格列（type=5）
  // 与京东自营共用 16 个字段，另附天猫特有：后端商品编码 / 票扣 / 开票金额 / 账单月份
  const mrTmcsColumns = [
    {
      title: '账单月份',
      dataIndex: 'bizDate',
      key: 'bizDate',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 140,
      fixed: 'left' as const,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 90,
    },
    {
      title: '临期',
      dataIndex: 'nearExpiry',
      key: 'nearExpiry',
      width: 90,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: formatJdMoney,
    },
    {
      title: '开票金额',
      dataIndex: 'invoiceAmount',
      key: 'invoiceAmount',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: formatJdMoney,
    },
    {
      title: '后端商品编码',
      dataIndex: 'backendGoodsCode',
      key: 'backendGoodsCode',
      width: 160,
    },
    {
      title: '票扣',
      dataIndex: 'ticketDeduction',
      key: 'ticketDeduction',
      width: 100,
      render: formatJdMoney,
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: formatJdMoney,
    },
  ];

  // 管报数据查询 - 天猫闪购表格列（type=6）
  // 一行 = 一个货品在该月的汇总（嘉兴闪购仓 + 东莞闪购仓已合并，接口不返回仓库字段）
  const mrWarehouseColumns = [
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 140,
      fixed: 'left' as const,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 140,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 120,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 200,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 90,
      render: (v?: string | null) => v ?? '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: formatMoneyDash,
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 100,
      render: formatMoneyDash,
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
      // 本类型税率为数字（0.09），展示成 9%
      render: formatTaxRatePercent,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '财务单位成本',
      dataIndex: 'financeUnitCost',
      key: 'financeUnitCost',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '财务总成本',
      dataIndex: 'financeTotalCost',
      key: 'financeTotalCost',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalTransferUnitPrice',
      key: 'internalTransferUnitPrice',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '内部转移总价',
      dataIndex: 'internalTransferTotalPrice',
      key: 'internalTransferTotalPrice',
      width: 120,
      render: formatMoneyDash,
    },
    {
      title: '成本匹配来源',
      dataIndex: 'costMatchSource',
      key: 'costMatchSource',
      width: 140,
    },
  ];

  // 管报数据查询 - 沃尔玛山姆（type=11）明细表
  // 出货单 + 退回单逐行返回（退货不合并负数），前端提供渠道 / 单据类型筛选
  const mrWalmartDetailColumns = [
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '单据类型',
      dataIndex: 'docType',
      key: 'docType',
      width: 100,
    },
    {
      title: '单据编号',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 170,
    },
    {
      title: '订货客户',
      dataIndex: 'orderCustomer',
      key: 'orderCustomer',
      width: 110,
    },
    {
      title: '货号',
      dataIndex: 'merchantCode',
      key: 'merchantCode',
      width: 150,
    },
    {
      title: '料号',
      dataIndex: 'u9',
      key: 'u9',
      width: 130,
    },
    {
      title: '品名',
      dataIndex: 'productName',
      key: 'productName',
      width: 240,
    },
    {
      title: '品牌',
      dataIndex: 'brandName',
      key: 'brandName',
      width: 100,
      render: (v?: string | null) => v || '-',
    },
    {
      title: '自有/外采',
      dataIndex: 'own',
      key: 'own',
      width: 90,
      render: formatOwn,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '价税合计',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
      render: formatTaxRatePercent,
    },
    {
      title: '不含税金额',
      dataIndex: 'amountWithoutTax',
      key: 'amountWithoutTax',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '含税收入',
      dataIndex: 'revenueWithTax',
      key: 'revenueWithTax',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '不含税收入',
      dataIndex: 'revenueWithoutTax',
      key: 'revenueWithoutTax',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '成本',
      dataIndex: 'costAmount',
      key: 'costAmount',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '单据日期',
      dataIndex: 'created',
      key: 'created',
      width: 120,
    },
  ];

  // 管报数据查询 - 沃尔玛山姆（type=11）利润表
  // 固定「山姆 / 沃尔玛 / 合计」三行 × 指标列；毛利率 / 净利率为小数，按百分比展示
  const mrWalmartProfitColumns = [
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 110,
      fixed: 'left' as const,
      render: (v?: string) => <strong>{v || '-'}</strong>,
    },
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
    {
      title: '订单金额',
      dataIndex: 'orderAmount',
      key: 'orderAmount',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '销售收入',
      dataIndex: 'salesRevenue',
      key: 'salesRevenue',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '未税收入',
      dataIndex: 'noTaxRevenue',
      key: 'noTaxRevenue',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '返利',
      dataIndex: 'rebate',
      key: 'rebate',
      width: 120,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '商品成本',
      dataIndex: 'goodsCost',
      key: 'goodsCost',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '物流',
      dataIndex: 'logistics',
      key: 'logistics',
      width: 120,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '毛利',
      dataIndex: 'grossProfit',
      key: 'grossProfit',
      width: 120,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '毛利率',
      dataIndex: 'grossMargin',
      key: 'grossMargin',
      width: 100,
      align: 'right' as const,
      render: formatTaxRatePercent,
    },
    {
      title: '营业税金及附加',
      dataIndex: 'taxSurcharge',
      key: 'taxSurcharge',
      width: 150,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '仓储',
      dataIndex: 'storage',
      key: 'storage',
      width: 110,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '人工',
      dataIndex: 'labor',
      key: 'labor',
      width: 110,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '货损',
      dataIndex: 'loss',
      key: 'loss',
      width: 110,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '净利润',
      dataIndex: 'netProfit',
      key: 'netProfit',
      width: 130,
      align: 'right' as const,
      render: formatMoneyDash,
    },
    {
      title: '净利率',
      dataIndex: 'netMargin',
      key: 'netMargin',
      width: 100,
      align: 'right' as const,
      render: formatTaxRatePercent,
    },
  ];

  // 京东自营 / 天猫超市费用明细（单独表格展示，避免费用列太靠右看不到）
  const jdFeeDetailColumns = [
    {
      title: '费用类别',
      dataIndex: 'category',
      key: 'category',
      width: 160,
    },
    {
      title: '子分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '未税金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (v?: number) => (v === null || v === undefined ? '-' : Number(v).toFixed(2)),
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 100,
    },
    {
      title: '价税合计',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      render: (v?: number) => (v === null || v === undefined ? '-' : Number(v).toFixed(2)),
    },
  ];

  // 管报数据查询 - 下载当月全量数据（原封不动）
  const handleMrDownload = async () => {
    let dataList: any[] = [];
    let columns: any[] = [];

    // 沃尔玛山姆（type=11）：同一个文件导出两个 sheet（明细表 + 利润表）
    // 导出当月全量数据（不套用明细表的渠道 / 单据类型筛选）
    if (mrType === 11) {
      if (!mrWalmartDetailList.length && !mrWalmartProfitList.length) {
        message.warning('当前没有可下载的数据，请先查询');
        return;
      }
      const monthLabel = (mrStartMonth || dayjs().subtract(1, 'month')).format('YYYY-MM');
      try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Peidi OMS';
        workbook.created = new Date();

        // ---- Sheet1：明细表 ----
        const detailSheet = workbook.addWorksheet('明细');
        const detailHeaders = mrWalmartDetailColumns.map((col) => col.title);
        detailSheet.addRow(detailHeaders);
        detailSheet.getRow(1).font = { bold: true };
        const u9ColIndex = mrWalmartDetailColumns.findIndex((col) => col.dataIndex === 'u9');
        // 数字列格式：金额 2 位小数，税率按百分比
        const detailNumFmt: Record<string, string> = {
          quantity: '0.00',
          unitPrice: '0.00',
          totalWithTax: '0.00',
          taxRate: '0.00%',
          amountWithoutTax: '0.00',
          revenueWithTax: '0.00',
          revenueWithoutTax: '0.00',
          costAmount: '0.00',
        };

        mrWalmartDetailList.forEach((record) => {
          const row = detailSheet.addRow(
            mrWalmartDetailColumns.map((col) => {
              const value = record[col.dataIndex as keyof WalmartDetailVo];
              if (value === null || value === undefined) return '';
              return value;
            }),
          );
          mrWalmartDetailColumns.forEach((col, idx) => {
            const value = record[col.dataIndex as keyof WalmartDetailVo];
            const cell = row.getCell(idx + 1);
            if (typeof value === 'number' && detailNumFmt[col.dataIndex]) {
              cell.numFmt = detailNumFmt[col.dataIndex];
            }
          });
          // 料号强制文本，避免前导 0 / 后置 0 被 Excel 当数字处理而丢失
          if (u9ColIndex >= 0) {
            const cell = row.getCell(u9ColIndex + 1);
            const v = record.u9;
            cell.value = v === null || v === undefined ? '' : String(v).trim();
            cell.numFmt = '@';
          }
        });
        detailSheet.columns = detailHeaders.map((h, idx) => ({
          width: Math.max(12, String(h).length * 2 + 4),
          key: String(idx),
        }));

        // ---- Sheet2：利润表 ----
        const profitSheet = workbook.addWorksheet('利润');
        const profitHeaders = mrWalmartProfitColumns.map((col) => col.title);
        profitSheet.addRow(profitHeaders);
        profitSheet.getRow(1).font = { bold: true };
        const profitPercentFields = ['grossMargin', 'netMargin'];

        mrWalmartProfitList.forEach((record) => {
          const row = profitSheet.addRow(
            mrWalmartProfitColumns.map((col) => {
              const value = record[col.dataIndex as keyof WalmartProfitVo];
              if (value === null || value === undefined) return '';
              return value;
            }),
          );
          mrWalmartProfitColumns.forEach((col, idx) => {
            const value = record[col.dataIndex as keyof WalmartProfitVo];
            if (typeof value === 'number') {
              row.getCell(idx + 1).numFmt = profitPercentFields.includes(col.dataIndex)
                ? '0.00%'
                : '#,##0.00';
            }
          });
        });
        profitSheet.columns = profitHeaders.map((h, idx) => ({
          width: Math.max(12, String(h).length * 2 + 4),
          key: String(idx),
        }));

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `管报数据-沃尔玛山姆-${monthLabel}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        message.success('下载成功');
      } catch (error) {
        console.error('下载管报数据失败:', error);
        message.error('下载管报数据失败');
      }
      return;
    }

    if (mrType === 1) {
      dataList = mrOnlineList;
      columns = mrOnlineColumns;
    } else if (mrType === 2) {
      dataList = mrOfflineList;
      columns = mrOfflineColumns;
    } else if (mrType === 3) {
      dataList = mrWalmartList;
      columns = mrWalmartColumns;
    } else if (mrType === 4) {
      dataList = mrJdTableData;
      columns = mrJdColumns;
    } else if (mrType === 5) {
      dataList = mrTmcsList;
      columns = mrTmcsColumns;
    } else if (mrType === 6) {
      dataList = mrWarehouseList;
      columns = mrWarehouseColumns;
    } else if (mrType === 7) {
      dataList = mrZhaohangList;
      columns = mrJdBaseColumns;
    } else if (mrType === 8) {
      dataList = mrNingboList;
      columns = mrJdBaseColumns;
    } else if (mrType === 9) {
      // 天猫国际：列与京东自营一致，接口不返回费用，导出时不带费用列
      dataList = mrJdList;
      columns = mrJdBaseColumns;
    } else if (mrType === 10) {
      // 亚马逊：同天猫国际
      dataList = mrJdList;
      columns = mrJdBaseColumns;
    }

    if (!dataList.length) {
      message.warning('当前没有可下载的数据，请先查询');
      return;
    }

    const typeLabel = MR_TYPE_LABELS[mrType] || '管报';
    const monthLabel = (mrStartMonth || dayjs().subtract(1, 'month')).format('YYYY-MM');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Peidi OMS';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('管报数据');

      // 表头
      const headers = columns.map((col) => col.title);
      sheet.addRow(headers);

      // 料号列索引：需强制按文本导出，避免前导0/尾数(后置0)被 Excel 当数字处理而丢失
      const u9ColIndex = columns.findIndex((col) => col.dataIndex === 'u9');

      // 数据（原封不动，仅取列对应的 dataIndex 字段）
      dataList.forEach((record) => {
        const rowValues = columns.map((col) => {
          // 若列有 render，用 render 的展示值；否则直接用原始字段值
          if (typeof col.render === 'function') {
            return col.render(record[col.dataIndex], record, 0);
          }
          return record[col.dataIndex] ?? '';
        });
        const row = sheet.addRow(rowValues);

        // 料号：参考财务「销售单文件上传 - 处理后文件导出」中的料号逻辑，
        // 直接以文本写入并设置 numFmt='@'，确保后置0不被 Excel 当数字取消掉
        if (u9ColIndex >= 0) {
          const cell = row.getCell(u9ColIndex + 1);
          const v = record[columns[u9ColIndex].dataIndex];
          cell.value = v === null || v === undefined ? '' : String(v).trim();
          cell.numFmt = '@';
        }
      });

      // 简易列宽
      sheet.columns = headers.map((h, idx) => ({
        width: Math.max(12, (h as string).length * 2 + 4),
        key: String(idx),
      }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `管报数据-${typeLabel}-${monthLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      message.success('下载成功');
    } catch (error) {
      console.error('下载管报数据失败:', error);
      message.error('下载管报数据失败');
    }
  };

  return (
    <>
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
          {/* 数据类型 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>数据类型</span>
            <Select
              style={{ width: 150 }}
              value={mrType}
              onChange={(value) => setMrType(value)}
              options={[
                { label: '线上', value: 1 },
                { label: '线下', value: 2 },
                { label: '沃尔玛', value: 3 },
                { label: '京东自营', value: 4 },
                { label: '天猫超市', value: 5 },
                { label: '天猫闪购', value: 6 },
                { label: '招行内购', value: 7 },
                { label: '宁波银行', value: 8 },
                { label: '天猫国际', value: 9 },
                { label: '亚马逊', value: 10 },
                { label: '沃尔玛山姆', value: 11 },
              ]}
            />
          </div>

          {/* 销售月份（不跟数据类型联动，统一用月份选择器） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              销售月份 <span style={{ color: 'red' }}>*</span>
            </span>
            <DatePicker.MonthPicker
              style={{ width: 180 }}
              value={mrStartMonth}
              onChange={(date) => {
                setMrStartMonth(date);
                setMrEndMonth(date);
              }}
              format="YYYY-MM"
              placeholder="请选择月份"
              allowClear
            />
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
            <Space>
              <Button
                type="primary"
                onClick={() => fetchManagementReport()}
                icon={<SearchOutlined />}
                loading={mrLoading}
              >
                查询
              </Button>
              <Button
                type="primary"
                className="excel-export-btn"
                icon={<DownloadOutlined />}
                onClick={handleMrDownload}
              >
                下载
              </Button>
              <Button onClick={handleMrReset}>重置</Button>
              {/* 京东自营 / 天猫国际 / 亚马逊 共用 U9 应收单上传；天猫超市单独上传账单 */}
              {(isU9Type || mrType === 5) && (
                <JdExtraActions
                  reportType={mrType}
                  month={mrStartMonth}
                  onChanged={() => fetchManagementReport()}
                />
              )}
              {/* 沃尔玛山姆（type=11）：成本单价配置 + 三份原始单上传 */}
              {isWalmartSamType && (
                <WalmartExtraActions
                  month={mrStartMonth}
                  onChanged={() => fetchManagementReport()}
                />
              )}
            </Space>
          </div>
        </div>
      </div>

      {/* 费用明细：单独展示 feeList（type=4/5），避免宽表里费用列太靠右看不到 */}
      {isFeeType && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {feeTypeLabel}费用明细（共 {mrFeeList.length} 项）
          </div>
          <Table
            columns={jdFeeDetailColumns}
            dataSource={mrFeeList}
            rowKey={(_record, index) => `jd-fee-detail-${index ?? 0}`}
            size="small"
            pagination={false}
            scroll={{ x: 720 }}
            locale={{ emptyText: '先点击查询' }}
          />
        </div>
      )}

      {/* 表格 - 根据类型展示对应列表 */}
      {mrType === 1 && (
        <Table
          columns={mrOnlineColumns}
          dataSource={mrOnlineList}
          rowKey={(_record, index) => `online-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {mrType === 2 && (
        <Table
          columns={mrOfflineColumns}
          dataSource={mrOfflineList}
          rowKey={(_record, index) => `offline-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {mrType === 3 && (
        <Table
          columns={mrWalmartColumns}
          dataSource={mrWalmartList}
          rowKey={(_record, index) => `walmart-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {mrType === 4 && (
        <Table
          columns={mrJdColumns}
          dataSource={mrJdTableData}
          rowKey={(record) => record.__key}
          loading={mrLoading}
          size="small"
          scroll={{ x: 4000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {mrType === 5 && (
        <Table
          columns={mrTmcsColumns}
          dataSource={mrTmcsList}
          rowKey={(_record, index) => `tmcs-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {mrType === 6 && (
        <Table
          columns={mrWarehouseColumns}
          dataSource={mrWarehouseList}
          rowKey={(_record, index) => `warehouse-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2100 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {/* 招行内购 / 宁波银行：字段同 jdList，无费用列 */}
      {(mrType === 7 || mrType === 8) && (
        <Table
          columns={mrJdBaseColumns}
          dataSource={mrType === 7 ? mrZhaohangList : mrNingboList}
          rowKey={(_record, index) => `${mrType === 7 ? 'zhaohang' : 'ningbo'}-${index ?? 0}`}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
      {/* 天猫国际 / 亚马逊：复用京东自营表格（jdList），接口不返回 feeList，不展示费用列 */}
      {(mrType === 9 || mrType === 10) && (
        <Table
          columns={mrJdBaseColumns}
          dataSource={mrJdTableData}
          rowKey={(record) => record.__key}
          loading={mrLoading}
          size="small"
          scroll={{ x: 2000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}

      {/* 沃尔玛山姆（type=11）：利润表 + 明细表 */}
      {isWalmartSamType && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 利润表 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>利润表（山姆 / 沃尔玛 / 合计）</div>
            <Table
              columns={mrWalmartProfitColumns}
              dataSource={mrWalmartProfitList}
              rowKey={(record, index) => `walmart-profit-${record.channel ?? index ?? 0}`}
              loading={mrLoading}
              size="small"
              scroll={{ x: 1900 }}
              pagination={false}
              locale={{ emptyText: '先点击查询' }}
            />
          </div>

          {/* 明细表 */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                明细表（出货单 + 退回单，共 {mrWalmartDetailData.length} 行）
              </span>
              <Space>
                <span style={{ fontSize: 12, color: '#666' }}>渠道</span>
                <Select
                  style={{ width: 120 }}
                  allowClear
                  placeholder="全部"
                  value={walmartChannelFilter}
                  onChange={(value) => setWalmartChannelFilter(value)}
                  options={[
                    { label: '山姆', value: '山姆' },
                    { label: '沃尔玛', value: '沃尔玛' },
                  ]}
                />
                <span style={{ fontSize: 12, color: '#666' }}>单据类型</span>
                <Select
                  style={{ width: 120 }}
                  allowClear
                  placeholder="全部"
                  value={walmartDocTypeFilter}
                  onChange={(value) => setWalmartDocTypeFilter(value)}
                  options={[
                    { label: '出货单', value: '出货单' },
                    { label: '退回单', value: '退回单' },
                  ]}
                />
              </Space>
            </div>
            <Table
              columns={mrWalmartDetailColumns}
              dataSource={mrWalmartDetailData}
              rowKey={(_record, index) => `walmart-detail-${index ?? 0}`}
              loading={mrLoading}
              size="small"
              scroll={{ x: 2360 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              locale={{ emptyText: '先点击查询' }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ManagementReportTab;
