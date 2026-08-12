import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { SearchOutlined, EditOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  Button,
  Input,
  Select,
  Table,
  Tabs,
  message,
  Space,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Upload,
  Collapse,
  Tag,
} from 'antd';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import FinanceUnitCostApi, {
  type FinanceUnitCostVo,
  type FinanceUnitCostPageReq,
  type FinanceUnitCostUpdateReq,
} from '@/services/financeUnitCostApi';
import ChannelExtendCostApi, {
  type PageRequest,
  type FinanceChannelExtendCostShopGroupVo,
  type FinanceChannelExtendCostMonthGroupVo,
  type FinanceChannelExtendCostDetailVo,
  type FinanceCostCategoryStatVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import ManagementReportApi, {
  type ManagementReportQueryReq,
  type FinanceGoodsSalesSummaryAllCostVo,
  type SalesOutDetailsCostVo,
  type WalmartRebateQueryVo,
  type FinanceZfbBillInfoPageReq,
  type FinanceZfbBillInfoVo,
  type IPageFinanceZfbBillInfoVo,
  type FinanceZfbBillGenerateReq,
} from '@/services/managementReportApi';

const Report: React.FC = () => {
  // 从localStorage读取上次激活的tab，刷新后保持不变
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('report_active_tab') || 'cost';
  });

  // 保存激活的tab到localStorage
  useEffect(() => {
    localStorage.setItem('report_active_tab', activeTab);
  }, [activeTab]);
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
  // 导入结果详情弹窗
  const [importResult, setImportResult] = useState<{
    addCount: number;
    updateCount: number;
    skipCount: number;
    skippedLines: string[];
  } | null>(null);

  /**
   * 解析后端导入接口返回的 data 字符串
   * 格式: 导入完成: 新增 X 条, 更新 Y 条, 跳过 Z 条\n跳过详情:\n第N行: ...
   */
  const parseImportResult = (raw: unknown) => {
    const text = typeof raw === 'string' ? raw : '';
    const summary =
      text.match(
        /导入完成[：:]\s*新增\s*(\d+)\s*条[，,]\s*更新\s*(\d+)\s*条[，,]\s*跳过\s*(\d+)\s*条/,
      );
    const addCount = summary ? Number(summary[1]) : 0;
    const updateCount = summary ? Number(summary[2]) : 0;
    const skipCount = summary ? Number(summary[3]) : 0;
    const detailIndex = text.indexOf('跳过详情');
    const skippedLines =
      detailIndex >= 0
        ? text
            .slice(detailIndex)
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => /^第\d+行/.test(s))
        : [];
    return { addCount, updateCount, skipCount, skippedLines };
  };

  // 搜索条件 - 成本核算
  const [searchBrandName, setSearchBrandName] = useState<string>('');
  const [searchMerchantCode, setSearchMerchantCode] = useState<string>('');
  const [searchProductNo, setSearchProductNo] = useState<string>('');
  const [searchU9No, setSearchU9No] = useState<string>('');
  const [searchIsNewProduct, setSearchIsNewProduct] = useState<string | undefined>(undefined);
  const [searchMonth, setSearchMonth] = useState<Dayjs | null>(dayjs());
  const [searchGroup, setSearchGroup] = useState<string>('');

  // 渠道枚举选项
  const channelOptions = [
    { label: '拼多多', value: '拼多多' },
    { label: '天猫', value: '天猫' },
    { label: '抖音', value: '抖音' },
    { label: '京东', value: '京东' },
  ];

  // 渠道推广费用状态
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelDataSource, setChannelDataSource] = useState<FinanceChannelExtendCostShopGroupVo[]>(
    [],
  );
  const [channelPagination, setChannelPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // 明细弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDataSource, setDetailDataSource] = useState<FinanceChannelExtendCostDetailVo[]>([]);
  const [detailPagination, setDetailPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  // 当前查看明细的查询参数
  const [detailQueryParams, setDetailQueryParams] = useState<{
    shopId?: number;
    channel?: string;
    yearMonth?: string;
    accountType?: string;
  }>({});

  // 费用分类统计弹窗状态
  const [statModalVisible, setStatModalVisible] = useState(false);
  const [statModalTitle, setStatModalTitle] = useState('');
  const [statLoading, setStatLoading] = useState(false);
  const [statDataSource, setStatDataSource] = useState<FinanceCostCategoryStatVo[]>([]);
  const [beginningBalance, setBeginningBalance] = useState<number | null>(null);
  const [endingBalance, setEndingBalance] = useState<number | null>(null);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  const [currentChannel, setCurrentChannel] = useState<string>('');

  // 店铺名称显示映射：部分店铺展示时替换为规范名称
  const shopNameDisplayMap: Record<string, string> = {
    '瑞驰派特-拼多多-萌宠嘉年华': '瑞驰派特-拼多多-帕特店',
  };
  const displayShopName = (name?: string) => (name ? shopNameDisplayMap[name] || name : name);

  // 汇总分组配置
  const summaryGroups = [
    {
      name: '收款',
      codes: [
        '0010002',
        '0010005',
        '0020002',
        '0020005',
        '0040001',
        '0040002',
        '0040003',
        '0090001',
        '0130005',
        '0140002',
        '0090002',
        '0130010',
      ],
    },
    {
      name: '扣款',
      codes: [
        '0030001',
        '0030002',
        '0030003',
        '0030023',
        '0040004',
        '0040005',
        '0050002',
        '0060001',
        '0040006',
        '0070004',
      ],
    },
    {
      name: '提现',
      codes: ['0080001'],
    },
  ];

  // 业务编码分类配置（站内外推广费统计明细左侧分类列）
  const feeCategories: { name: string; codes: string[] }[] = [
    { name: '运费险', codes: ['0050002'] },
    { name: '技术服务费', codes: ['0030001', '0030002', '0030003', '0030023'] },
    { name: '赔付', codes: ['0040004', '0040005', '0040006'] },
    { name: '多多进宝', codes: ['0060001'] },
    { name: '好评有礼', codes: ['0070004'] },
    { name: '全站推广费', codes: ['PDD_PROMOTION'] },
  ];
  // 根据业务编码获取所属分类名称，未匹配的归入"其他"
  const getFeeCategory = (businessCode: string) => {
    const found = feeCategories.find((c) => c.codes.includes(businessCode));
    return found ? found.name : '其他';
  };
  // 分类展示顺序：配置的分类在前，"其他"在最后
  const feeCategoryOrder = [...feeCategories.map((c) => c.name), '其他'];

  // 一级大类配置（站内外推广费统计明细最左侧大类列）
  const feeMajorCategories: { name: string; categories: string[] }[] = [
    { name: '平台费用', categories: ['运费险', '技术服务费', '赔付'] },
    { name: '推广费用', categories: ['多多进宝', '好评有礼', '全站推广费'] },
    { name: '其他', categories: ['其他'] },
  ];
  // 根据分类名称获取所属一级大类，未匹配的归入"其他"
  const getFeeMajorCategory = (categoryName: string) => {
    const found = feeMajorCategories.find((m) => m.categories.includes(categoryName));
    return found ? found.name : '其他';
  };
  // 一级大类展示顺序
  const feeMajorCategoryOrder = feeMajorCategories.map((m) => m.name);

  // 计算汇总数据 - 返回新格式的汇总行
  const calculateSummaryData = () => {
    // 计算各项汇总
    const collectionTotal = statDataSource
      .filter((item) => summaryGroups[0].codes.includes(item.businessCode))
      .reduce((sum, item) => sum + (item.calculate || 0), 0);

    const deductionTotal = statDataSource
      .filter((item) => summaryGroups[1].codes.includes(item.businessCode))
      .reduce((sum, item) => sum + (item.calculate || 0), 0);

    const withdrawTotal = statDataSource
      .filter((item) => summaryGroups[2].codes.includes(item.businessCode))
      .reduce((sum, item) => sum + (item.calculate || 0), 0);

    // 结息 - 暂时按0处理，如果后续需要可以添加业务编码分组
    const interestTotal = 0;

    // 上月余额 = 上个月期末余额
    const lastMonthBalance = beginningBalance || 0;

    // 期末余额 = 本月期末余额
    const currentMonthEndBalance = endingBalance || 0;

    // 计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
    const calculatedBalance =
      lastMonthBalance + collectionTotal + deductionTotal + withdrawTotal + interestTotal;

    // 校验 = 计算余额 - 期末余额
    const checkDiff = calculatedBalance - currentMonthEndBalance;

    return [
      {
        billMonth: currentYearMonth,
        platform: currentChannel,
        accountName: currentShopName || '',
        endBalance: currentMonthEndBalance,
        lastMonthBalance: lastMonthBalance,
        currentCollection: collectionTotal,
        currentExpense: deductionTotal,
        withdraw: withdrawTotal,
        interest: interestTotal,
        calculatedBalance: calculatedBalance,
        checkDiff: checkDiff,
      },
    ];
  };

  // 搜索条件 - 渠道推广费用
  const [searchAccountType, setSearchAccountType] = useState<string>('');
  const [searchChannel, setSearchChannel] = useState<string | undefined>(channelOptions[0].value);
  const [searchShopId, setSearchShopId] = useState<number | undefined>(undefined);
  const [searchYearMonth, setSearchYearMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );
  // 渠道推广费用 - 展开的行
  const [channelExpandedRowKeys, setChannelExpandedRowKeys] = useState<React.Key[]>([]);

  // 管报数据查询 - 状态
  // 数据类型：1-线上 2-线下 3-沃尔玛
  const [mrType, setMrType] = useState<number>(1);
  // 销售月份（单月选择，起止都用同一个值）
  const [mrStartMonth, setMrStartMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );
  const [mrEndMonth, setMrEndMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );
  const [mrLoading, setMrLoading] = useState(false);
  const [mrOnlineList, setMrOnlineList] = useState<FinanceGoodsSalesSummaryAllCostVo[]>([]);
  const [mrOfflineList, setMrOfflineList] = useState<SalesOutDetailsCostVo[]>([]);
  const [mrWalmartList, setMrWalmartList] = useState<WalmartRebateQueryVo[]>([]);

  // 各渠道月账单 - 状态
  // 当前激活的子 tab：zfb/pdd/dy/tmall/xhs
  const [billSubTab, setBillSubTab] = useState<string>('zfb');
  // 支付宝账单搜索条件
  const [zfbBillDate, setZfbBillDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [zfbShopName, setZfbShopName] = useState<string>('');
  const [zfbCompanyName, setZfbCompanyName] = useState<string>('');
  const [zfbAlipayMerchantNo, setZfbAlipayMerchantNo] = useState<string>('');
  const [zfbMerchantName, setZfbMerchantName] = useState<string>('');
  const [zfbGenerateStatus, setZfbGenerateStatus] = useState<number | undefined>(undefined);
  const [zfbBillLoading, setZfbBillLoading] = useState(false);
  const [zfbBillData, setZfbBillData] = useState<FinanceZfbBillInfoVo[]>([]);
  const [zfbBillPagination, setZfbBillPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [zfbGenerateLoading, setZfbGenerateLoading] = useState(false);

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

  // 页面初始化时默认搜索一次
  useEffect(() => {
    fetchData();
  }, []);

  // 切换tab时自动加载数据，若已有渠道自动加载店铺
  useEffect(() => {
    if (activeTab === 'channel-extend-cost' && channelDataSource.length === 0) {
      fetchChannelData();
    }
    if (activeTab === 'channel-extend-cost' && searchChannel && shopList.length === 0) {
      fetchShops(searchChannel);
    }
  }, [activeTab]);

  // 重置搜索
  const handleReset = () => {
    setSearchBrandName('');
    setSearchMerchantCode('');
    setSearchProductNo('');
    setSearchU9No('');
    setSearchIsNewProduct(undefined);
    setSearchMonth(null);
    setSearchGroup('');
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // 获取店铺列表
  const fetchShops = async (channel?: string) => {
    setShopsLoading(true);
    try {
      const params: any = {
        sortStr: '',
      };
      if (channel) {
        // 根据渠道名称搜索，将JSON放到searchStr里
        params.searchStr = JSON.stringify({
          searchName: 'platform',
          searchValue: channel,
          searchType: 'like',
        });
      }
      const res = await ChannelExtendCostApi.getShops(params);
      if (res.code === 200) {
        setShopList(res.data || []);
      } else {
        message.error('获取店铺列表失败');
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      message.error('获取店铺列表失败');
    } finally {
      setShopsLoading(false);
    }
  };

  // 渠道推广费用分页查询
  const fetchChannelData = async (params: PageRequest = {}) => {
    setChannelLoading(true);
    try {
      let searchParams: any = {
        pageNum: channelPagination.current,
        pageSize: channelPagination.pageSize,
        accountType: searchAccountType || undefined,
        channel: searchChannel || undefined,
        shopId: searchShopId || undefined,
        ...params,
      };

      if (searchYearMonth) {
        searchParams.yearMonth = searchYearMonth.format('YYYY-MM');
      }

      const res = await ChannelExtendCostApi.getGroupPage(searchParams);
      if (res.code === 200) {
        setChannelDataSource(res.data.records || []);
        setChannelPagination({
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
      setChannelLoading(false);
    }
  };

  // 渠道变化时重新获取店铺列表并清空已选店铺
  const handleChannelChange = (channel: string | undefined) => {
    setSearchChannel(channel);
    setSearchShopId(undefined);
    if (channel) {
      fetchShops(channel);
    } else {
      setShopList([]);
    }
  };

  // 管报数据查询
  // overrides 用于"重置"等场景：直接传默认值查询，避免依赖 state 异步更新
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

    // 请求体只传 type / startDate / endDate（取月份的首日/末日）
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
    const defaults = {
      type: 1 as number,
      startMonth: dayjs().subtract(1, 'month'),
      endMonth: dayjs().subtract(1, 'month'),
    };
    setMrType(defaults.type);
    setMrStartMonth(defaults.startMonth);
    setMrEndMonth(defaults.endMonth);
    setMrOnlineList([]);
    setMrOfflineList([]);
    setMrWalmartList([]);
    // 用默认值直接触发一次查询（不依赖 state 异步更新）
    fetchManagementReport(defaults);
  };

  // 支付宝月账单分页查询
  const fetchZfbBill = async (params: Partial<FinanceZfbBillInfoPageReq> = {}) => {
    setZfbBillLoading(true);
    try {
      const searchParams: FinanceZfbBillInfoPageReq = {
        pageNum: zfbBillPagination.current,
        pageSize: zfbBillPagination.pageSize,
        billDate: zfbBillDate ? zfbBillDate.format('YYYY-MM') : undefined,
        shopName: zfbShopName || undefined,
        companyName: zfbCompanyName || undefined,
        alipayMerchantNo: zfbAlipayMerchantNo || undefined,
        merchantName: zfbMerchantName || undefined,
        generateStatus: zfbGenerateStatus,
        ...params,
      };
      const res: { code: number; data?: IPageFinanceZfbBillInfoVo; msg?: string; success?: boolean } =
        await ManagementReportApi.getZfbBillPage(searchParams);
      if (res.code === 200) {
        const data = res.data || ({} as IPageFinanceZfbBillInfoVo);
        setZfbBillData(data.records || []);
        setZfbBillPagination({
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
      setZfbBillLoading(false);
    }
  };

  // 切换到各渠道月账单 tab 时自动加载支付宝账单
  useEffect(() => {
    if (activeTab === 'channel-bills' && billSubTab === 'zfb' && zfbBillData.length === 0) {
      fetchZfbBill({ pageNum: 1 });
    }
  }, [activeTab, billSubTab]);

  // 支付宝账单搜索
  const handleZfbBillSearch = () => {
    setZfbBillPagination((prev) => ({ ...prev, current: 1 }));
    fetchZfbBill({ pageNum: 1 });
  };

  // 支付宝账单重置
  const handleZfbBillReset = () => {
    setZfbBillDate(null);
    setZfbShopName('');
    setZfbCompanyName('');
    setZfbAlipayMerchantNo('');
    setZfbMerchantName('');
    setZfbGenerateStatus(undefined);
    setZfbBillPagination({ current: 1, pageSize: 10, total: 0 });
    fetchZfbBill({ pageNum: 1 });
  };

  // 生成支付宝月账单
  const handleGenerateZfbBill = async () => {
    if (!zfbBillDate) {
      message.error('请先选择账单日期');
      return;
    }
    const params: FinanceZfbBillGenerateReq = {
      billDate: zfbBillDate.format('YYYY-MM'),
    };
    Modal.confirm({
      title: '生成支付宝月账单',
      content: `确定要生成 ${params.billDate} 的支付宝月账单吗？`,
      okText: '确认生成',
      cancelText: '取消',
      onOk: async () => {
        setZfbGenerateLoading(true);
        try {
          const res = await ManagementReportApi.generateZfbBill(params);
          if (res.code === 200 || res.success) {
            message.success('生成任务已提交，请稍后刷新查看');
            // 重新查询列表
            fetchZfbBill({ pageNum: 1 });
          } else if (res.code === 500) {
            message.error(typeof res.data === 'string' ? res.data : res.msg || '生成失败');
          } else {
            message.error(res.msg || '生成失败');
          }
        } catch (error) {
          console.error('生成支付宝账单失败:', error);
          message.error('生成支付宝账单失败');
        } finally {
          setZfbGenerateLoading(false);
        }
      },
    });
  };

  // 渠道推广费用搜索
  const handleChannelSearch = () => {
    if (!searchChannel) {
      message.error('请选择渠道');
      return;
    }
    if (!searchYearMonth) {
      message.error('请选择年月');
      return;
    }
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
    setChannelExpandedRowKeys([]); // 搜索时收起所有展开行
    fetchChannelData({ pageNum: 1 });
  };

  // 渠道推广费用重置搜索
  const handleChannelReset = () => {
    setSearchAccountType('');
    setSearchChannel(channelOptions[0].value);
    setSearchShopId(undefined);
    setSearchYearMonth(dayjs().subtract(1, 'month'));
    fetchShops(channelOptions[0].value);
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
    setChannelExpandedRowKeys([]); // 重置时收起所有展开行
  };

  // 上传文件配置
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

        // 全部成功（无跳过）→ 顶部简短提示
        if (result.skipCount === 0) {
          message.success(
            `导入成功：新增 ${result.addCount} 条，更新 ${result.updateCount} 条`,
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
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '内部转移单价',
      dataIndex: 'internalPrice',
      key: 'internalPrice',
      width: 120,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
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

  const tabItems = [
    {
      key: 'management-report',
      label: '管报数据查询',
    },
    {
      key: 'cost',
      label: '成本核算',
    },
    {
      key: 'channel-extend-cost',
      label: '渠道推广费用',
    },
    {
      key: 'channel-bills',
      label: '各渠道月账单',
    },
  ];

  // 渠道推广费用明细表格列
  const detailColumns = [
    {
      title: '账务类型',
      dataIndex: 'accountType',
      key: 'accountType',
      minWidth: 80,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '业务描述',
      dataIndex: 'businessDesc',
      key: 'businessDesc',
      minWidth: 200,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      minWidth: 60,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '支出金额',
      dataIndex: 'expenseAmount',
      key: 'expenseAmount',
      minWidth: 80,
      whiteSpace: 'nowrap',
      render: (value: number) => (
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {value !== undefined ? value.toFixed(2) : '-'}
        </span>
      ),
    },
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      minWidth: 140,
      whiteSpace: 'nowrap',
      render: (text: string) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '店铺ID',
      dataIndex: 'shopId',
      key: 'shopId',
      minWidth: 60,
      whiteSpace: 'nowrap',
      render: (text: number) => <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      minWidth: 150,
      whiteSpace: 'nowrap',
      render: (text: string) => (
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{displayShopName(text)}</span>
      ),
    },
  ];

  // 获取明细数据
  const fetchDetailData = async (
    params: {
      shopId?: number;
      channel?: string;
      yearMonth?: string;
      accountType?: string;
      pageNum?: number;
      pageSize?: number;
    } = {},
  ) => {
    setDetailLoading(true);
    try {
      const searchParams: any = {
        pageNum: detailPagination.current,
        pageSize: detailPagination.pageSize,
        ...detailQueryParams,
        ...params,
      };

      const res = await ChannelExtendCostApi.getDetails(searchParams);
      if (res.code === 200) {
        setDetailDataSource(res.data.records || []);
        setDetailPagination({
          current: res.data.current || 1,
          pageSize: res.data.size || 20,
          total: res.data.total || 0,
        });
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : '获取明细失败');
      } else {
        message.error('获取明细失败');
      }
    } catch (error) {
      console.error('获取明细失败:', error);
      message.error('获取明细失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 打开明细弹窗
  const openDetailModal = (
    wdtName: string | undefined,
    yearMonth: string | undefined,
    shopId: number | undefined,
    channel: string | undefined,
  ) => {
    const title = `${displayShopName(wdtName) || ''} ${yearMonth || ''} 渠道推广费用明细`;
    setDetailModalTitle(title);
    // 打开前先清空旧数据
    setDetailDataSource([]);
    // 设置查询参数
    const queryParams = {
      shopId,
      channel,
      yearMonth,
      accountType: searchAccountType,
    };
    setDetailQueryParams(queryParams);
    // 重置分页
    setDetailPagination({
      current: 1,
      pageSize: 20,
      total: 0,
    });
    setDetailModalVisible(true);
    // 加载第一页数据
    fetchDetailData({ ...queryParams, pageNum: 1 });
  };

  // 打开费用分类统计弹窗
  const openStatModal = async (
    wdtName: string | undefined,
    yearMonth: string | undefined,
    shopId: number | undefined,
    channel: string | undefined,
  ) => {
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 站内外推广费统计`;
    setStatModalTitle(title);
    // 打开前先清空旧数据
    setStatDataSource([]);
    setBeginningBalance(null);
    setEndingBalance(null);
    setCurrentShopName(displayShopName(wdtName) || '');
    setCurrentYearMonth(yearMonth || '');
    setCurrentChannel(channel || '');
    setStatModalVisible(true);
    setStatLoading(true);
    try {
      // 获取分类统计数据
      const statRes = await ChannelExtendCostApi.getCostCategoryStat({
        shopId: shopId!,
        yearMonth: yearMonth!,
      });

      // 计算上个月的年月用于查询期初余额（上月期末）
      const [year, month] = yearMonth!.split('-').map(Number);
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevYear = year - 1;
        prevMonth = 12;
      }
      const prevYearMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

      // 查询期初余额（上月期末）
      const beginningBalanceRes = await ChannelExtendCostApi.queryEndingBalance({
        accountType: '期末余额',
        shopId: shopId!,
        yearMonth: prevYearMonth,
      });

      // 查询本月期末余额
      const endingBalanceRes = await ChannelExtendCostApi.queryEndingBalance({
        accountType: '期末余额',
        shopId: shopId!,
        yearMonth: yearMonth!,
      });

      if (statRes.code === 200) {
        let data = statRes.data || [];

        // 如果获取到期初余额，保存
        if (
          beginningBalanceRes.code === 200 &&
          beginningBalanceRes.data &&
          beginningBalanceRes.data.incomeAmount !== undefined
        ) {
          setBeginningBalance(beginningBalanceRes.data.incomeAmount);
        } else {
          setBeginningBalance(null);
          console.warn('获取期初余额失败或数据为空');
        }

        // 如果获取到本月期末余额，保存
        if (
          endingBalanceRes.code === 200 &&
          endingBalanceRes.data &&
          endingBalanceRes.data.incomeAmount !== undefined
        ) {
          setEndingBalance(endingBalanceRes.data.incomeAmount);
        } else {
          setEndingBalance(null);
          console.warn('获取本月期末余额失败或数据为空');
        }

        setStatDataSource(data);
      } else {
        message.error('获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      message.error('获取统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 渠道推广费用年月分组表格列（展开店铺后显示）
  const monthGroupColumns = [
    {
      title: '年月',
      dataIndex: 'yearMonth',
      key: 'yearMonth',
      width: 120,
    },
    {
      title: '明细数量',
      dataIndex: 'detailCount',
      key: 'detailCount',
      width: 100,
    },
    {
      title: '总支出金额（元）',
      dataIndex: 'totalExpenseAmount',
      key: 'totalExpenseAmount',
      width: 150,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        // record已经包含了shopId、wdtName等店铺信息，是展开时添加的
        return (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              style={{ fontSize: 12, padding: 0 }}
              onClick={() =>
                openDetailModal(record.wdtName, record.yearMonth, record.shopId, record.channel)
              }
            >
              查看明细
            </Button>
            <Button
              type="link"
              size="small"
              style={{ fontSize: 12, padding: '0 0 0 8px' }}
              onClick={() =>
                openStatModal(record.wdtName, record.yearMonth, record.shopId, record.channel)
              }
            >
              费用统计
            </Button>
          </Space>
        );
      },
    },
  ];

  // 渠道推广费用店铺分组表格列（最外层）
  const shopGroupColumns = [
    {
      title: '店铺ID',
      dataIndex: 'shopId',
      key: 'shopId',
      width: 100,
      fixed: 'left' as const,
    },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => displayShopName(text),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
    },
    {
      title: '明细总数量',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 120,
    },
    {
      title: '总支出金额（元）',
      dataIndex: 'totalExpenseAmount',
      key: 'totalExpenseAmount',
      width: 150,
      render: (value: number) => (value !== undefined ? value.toFixed(2) : '-'),
    },
  ];

  // 渲染年月分组表格（展开店铺后显示）
  const expandedMonthRowRender = (record: FinanceChannelExtendCostShopGroupVo) => {
    const monthGroups = record.monthGroups || [];
    // 添加店铺信息到每条记录，方便获取shopId
    const monthGroupsWithShopInfo = monthGroups.map((item) => ({
      ...item,
      shopId: record.shopId,
      wdtName: record.wdtName,
      channel: record.channel,
    }));
    return (
      <Table
        columns={monthGroupColumns}
        dataSource={monthGroupsWithShopInfo}
        rowKey="yearMonth"
        size="small"
        pagination={false}
        scroll={{ y: 250 }}
      />
    );
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
    {
      title: '返利计算(未税)',
      dataIndex: 'rebateAmountWithoutTax',
      key: 'rebateAmountWithoutTax',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '返利计算(含税)',
      dataIndex: 'rebateAmountWithTax',
      key: 'rebateAmountWithTax',
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

  // 支付宝月账单表格列
  const zfbBillColumns = [
    {
      title: '账单日期',
      dataIndex: 'billDate',
      key: 'billDate',
      width: 110,
      fixed: 'left' as const,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 180,
    },
    {
      title: '店铺名称',
      dataIndex: 'shopName',
      key: 'shopName',
      width: 180,
    },
    {
      title: '授权商家名称',
      dataIndex: 'merchantName',
      key: 'merchantName',
      width: 200,
    },
    {
      title: '支付宝商户号',
      dataIndex: 'alipayMerchantNo',
      key: 'alipayMerchantNo',
      width: 180,
    },
    {
      title: '期初余额',
      dataIndex: 'beginningBalance',
      key: 'beginningBalance',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '期末余额',
      dataIndex: 'endingBalance',
      key: 'endingBalance',
      width: 120,
      render: (v?: number) => (v !== undefined && v !== null ? v.toFixed(2) : '-'),
    },
    {
      title: '生成状态',
      dataIndex: 'generateStatus',
      key: 'generateStatus',
      width: 110,
      render: (v?: number) => {
        const map: Record<number, { text: string; color: string }> = {
          0: { text: '待生成', color: 'default' },
          1: { text: '生成中', color: 'processing' },
          2: { text: '生成成功', color: 'success' },
          3: { text: '生成失败', color: 'error' },
          5: { text: '无业务数据', color: 'warning' },
          6: { text: '未知错误', color: 'error' },
        };
        const item = v !== undefined && map[v] ? map[v] : { text: '-', color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '账单文件',
      dataIndex: 'fileUrl',
      key: 'fileUrl',
      width: 240,
      render: (v?: string) =>
        v ? (
          <a href={v} target="_blank" rel="noopener noreferrer">
            查看文件
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
    },
  ];

  // 各渠道月账单 - 子 tab 配置
  const billSubTabItems = [
    { key: 'zfb', label: '支付宝' },
    { key: 'pdd', label: '拼多多' },
    { key: 'dy', label: '抖音' },
    { key: 'tmall', label: '天猫' },
    { key: 'xhs', label: '小红书' },
  ];

  // 各渠道月账单 - 子 tab 内容
  const renderBillSubTabContent = () => {
    if (billSubTab === 'zfb') {
      return (
        <>
          {/* 搜索栏 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>账单日期</span>
                <DatePicker.MonthPicker
                  style={{ width: 160 }}
                  value={zfbBillDate}
                  onChange={(date) => setZfbBillDate(date)}
                  format="YYYY-MM"
                  placeholder="请选择月份"
                  allowClear
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>公司名称</span>
                <Input
                  style={{ width: 180 }}
                  value={zfbCompanyName}
                  onChange={(e) => setZfbCompanyName(e.target.value)}
                  placeholder="模糊匹配"
                  allowClear
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>店铺名称</span>
                <Input
                  style={{ width: 180 }}
                  value={zfbShopName}
                  onChange={(e) => setZfbShopName(e.target.value)}
                  placeholder="模糊匹配"
                  allowClear
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>授权商家名称</span>
                <Input
                  style={{ width: 180 }}
                  value={zfbMerchantName}
                  onChange={(e) => setZfbMerchantName(e.target.value)}
                  placeholder="模糊匹配"
                  allowClear
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>支付宝商户号</span>
                <Input
                  style={{ width: 180 }}
                  value={zfbAlipayMerchantNo}
                  onChange={(e) => setZfbAlipayMerchantNo(e.target.value)}
                  placeholder="模糊匹配"
                  allowClear
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>生成状态</span>
                <Select
                  style={{ width: 140 }}
                  value={zfbGenerateStatus}
                  onChange={(v) => setZfbGenerateStatus(v)}
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
                    onClick={handleZfbBillSearch}
                    icon={<SearchOutlined />}
                    loading={zfbBillLoading}
                  >
                    搜索
                  </Button>
                  <Button onClick={handleZfbBillReset}>重置</Button>
                  <Button
                    type="default"
                    icon={<FileTextOutlined />}
                    onClick={handleGenerateZfbBill}
                    loading={zfbGenerateLoading}
                  >
                    生成账单
                  </Button>
                </Space>
              </div>
            </div>
          </div>

          {/* 表格 */}
          <Table
            columns={zfbBillColumns}
            dataSource={zfbBillData}
            rowKey="id"
            loading={zfbBillLoading}
            size="small"
            scroll={{ x: 1800 }}
            pagination={{
              ...zfbBillPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setZfbBillPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || 10,
                }));
                fetchZfbBill({ pageNum: page, pageSize });
              },
            }}
          />
        </>
      );
    }
    // 其他渠道占位
    const placeholderMap: Record<string, string> = {
      pdd: '拼多多',
      dy: '抖音',
      tmall: '天猫',
      xhs: '小红书',
    };
    return (
      <div
        style={{
          padding: '60px 0',
          textAlign: 'center',
          color: '#999',
          fontSize: 14,
        }}
      >
        {placeholderMap[billSubTab] || ''}月账单：敬请期待
      </div>
    );
  };

  return (
    <PageContainer>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
        size="large"
        type="card"
      />

      {activeTab === 'management-report' && (
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
                  <Button onClick={handleMrReset}>重置</Button>
                </Space>
              </div>
            </div>
          </div>

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
        </>
      )}

      {activeTab === 'cost' && (
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
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
            dataSource={dataSource}
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
                  precision={2}
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
                  precision={2}
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
      )}

      {activeTab === 'channel-extend-cost' && (
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
              {/* 渠道 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>
                  渠道 <span style={{ color: 'red' }}>*</span>
                </span>
                <Select
                  style={{ width: 150 }}
                  value={searchChannel}
                  onChange={handleChannelChange}
                  placeholder="请选择"
                  options={channelOptions}
                />
              </div>

              {/* 店铺 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>店铺</span>
                <Select
                  style={{ width: 220 }}
                  value={searchShopId}
                  onChange={(value) => setSearchShopId(value)}
                  allowClear
                  loading={shopsLoading}
                  placeholder="请选择店铺"
                  options={shopList.map((shop) => ({
                    label: displayShopName(shop.wdtName || shop.shopName),
                    value: shop.id,
                  }))}
                  showSearch
                  optionFilterProp="label"
                  disabled={!searchChannel}
                />
              </div>

              {/* 年月 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>
                  年月 <span style={{ color: 'red' }}>*</span>
                </span>
                <DatePicker.MonthPicker
                  style={{ width: 160 }}
                  value={searchYearMonth}
                  onChange={(date) => setSearchYearMonth(date)}
                  format="YYYY-MM"
                  placeholder="请选择年月"
                  allowClear={false}
                />
              </div>

              {/* 账务类型 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>账务类型</span>
                <Input
                  placeholder="模糊匹配"
                  prefix={<SearchOutlined />}
                  style={{ width: 180 }}
                  value={searchAccountType}
                  onChange={(e) => setSearchAccountType(e.target.value)}
                  allowClear
                />
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'transparent' }}>操作</span>
                <Space>
                  <Button
                    type="primary"
                    onClick={handleChannelSearch}
                    icon={<SearchOutlined />}
                  >
                    搜索
                  </Button>
                  <Button onClick={handleChannelReset}>重置</Button>
                </Space>
              </div>
            </div>
          </div>

          {/* 表格 */}
          <Table
            columns={shopGroupColumns}
            dataSource={channelDataSource}
            rowKey="shopId"
            loading={channelLoading}
            size="small"
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowRender: expandedMonthRowRender,
              expandedRowKeys: channelExpandedRowKeys,
              onExpandedRowsChange: (keys) => setChannelExpandedRowKeys(keys),
            }}
            pagination={{
              ...channelPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setChannelPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || 10,
                }));
                fetchChannelData({ pageNum: page, pageSize });
              },
            }}
          />

          {/* 明细弹窗 - 单例模式 */}
          <Modal
            title={detailModalTitle}
            open={detailModalVisible}
            onCancel={() => setDetailModalVisible(false)}
            footer={null}
            width={900}
            destroyOnClose
            maskClosable={false}
            styles={{ body: { padding: '16px' } }}
          >
            <style>{`
              .detail-table-small tr td {
                padding: 4px 8px !important;
                line-height: 1.3 !important;
                height: 28px !important;
                white-space: nowrap !important;
              }
              .detail-table-small tr th {
                padding: 6px 8px !important;
                line-height: 1.3 !important;
                white-space: nowrap !important;
              }
            `}</style>
            <Table
              columns={detailColumns}
              dataSource={detailDataSource}
              rowKey="id"
              loading={detailLoading}
              size="small"
              className="detail-table-small"
              style={{ fontSize: 12 }}
              scroll={{ x: 800 }}
              pagination={{
                ...detailPagination,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: [20, 50, 100, 200],
                showTotal: (total) => `共 ${total} 条记录`,
                size: 'small',
                onChange: (page, pageSize) => {
                  setDetailPagination((prev) => ({
                    ...prev,
                    current: page,
                    pageSize: pageSize || 20,
                  }));
                  fetchDetailData({ pageNum: page, pageSize });
                },
              }}
            />
          </Modal>

          {/* 费用分类统计弹窗 */}
          <Modal
            title={statModalTitle}
            open={statModalVisible}
            onCancel={() => setStatModalVisible(false)}
            footer={null}
            width={1200}
            destroyOnClose
            maskClosable={false}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <style>{`
              .stat-table-small tr td {
                padding: 4px 8px !important;
                line-height: 1.3 !important;
                height: 28px !important;
                white-space: nowrap !important;
              }
              .stat-table-small tr th {
                padding: 6px 8px !important;
                line-height: 1.3 !important;
                white-space: nowrap !important;
              }
            `}</style>

            {/* 汇总表格 - 放在最顶部 */}
            <Table
              columns={[
                {
                  title: '账单月份',
                  dataIndex: 'billMonth',
                  key: 'billMonth',
                  width: 80,
                  render: (text: string) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text}</span>
                  ),
                },
                {
                  title: '平台',
                  dataIndex: 'platform',
                  key: 'platform',
                  width: 60,
                  render: (text: string) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text}</span>
                  ),
                },
                {
                  title: '账户名称',
                  dataIndex: 'accountName',
                  key: 'accountName',
                  width: 150,
                  render: (text: string) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text}</span>
                  ),
                },
                {
                  title: '期末余额（元）',
                  dataIndex: 'endBalance',
                  key: 'endBalance',
                  width: 100,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '上月余额',
                  dataIndex: 'lastMonthBalance',
                  key: 'lastMonthBalance',
                  width: 80,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '本期收款',
                  dataIndex: 'currentCollection',
                  key: 'currentCollection',
                  width: 80,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '本期费用',
                  dataIndex: 'currentExpense',
                  key: 'currentExpense',
                  width: 80,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '提现',
                  dataIndex: 'withdraw',
                  key: 'withdraw',
                  width: 60,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '结息',
                  dataIndex: 'interest',
                  key: 'interest',
                  width: 60,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '计算余额',
                  dataIndex: 'calculatedBalance',
                  key: 'calculatedBalance',
                  width: 100,
                  render: (value: number) => (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
                  ),
                },
                {
                  title: '校验',
                  dataIndex: 'checkDiff',
                  key: 'checkDiff',
                  width: 80,
                  render: (value: number) => {
                    const num = value || 0;
                    const isBalanced = Math.abs(num) < 0.001;
                    // -0.00 时展示为 0.00
                    const display = isBalanced ? '0.00' : num.toFixed(2);
                    return (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: isBalanced ? 'green' : 'red',
                        }}
                      >
                        {display}
                      </span>
                    );
                  },
                },
              ]}
              dataSource={calculateSummaryData()}
              rowKey="billMonth"
              size="small"
              className="stat-table-small"
              style={{ fontSize: 12, marginBottom: 16 }}
              pagination={false}
              scroll={{ x: 1100 }}
            />

            {/* 计算逻辑说明 - 默认折叠 */}
            <Collapse defaultActiveKey={[]} style={{ marginBottom: 16 }}>
              <Collapse.Panel header="计算逻辑说明" key="1">
                <div
                  style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: 12,
                    margin: -16,
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li style={{ marginBottom: 2 }}>
                      <strong>账单月份：</strong>当前统计的月份
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>平台：</strong>当前统计的渠道
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>账户名称：</strong>店铺名称
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>期末余额：</strong>系统查询到的本月实际期末余额
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>上月余额：</strong>上个月末的账户余额，作为本月期初
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>本期收款：</strong>本月所有收款类业务编码汇总，收款业务编码包括：
                      {summaryGroups[0].codes.join(', ')}
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>本期费用：</strong>本月所有扣款类业务编码汇总，扣款业务编码包括：
                      {summaryGroups[1].codes.join(', ')}
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>提现：</strong>本月提现业务汇总，业务编码：
                      {summaryGroups[2].codes.join(', ')}
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>结息：</strong>默认 0，如有结息业务后续调整
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息</strong>
                    </li>
                    <li style={{ marginBottom: 2 }}>
                      <strong>校验 = 计算余额 - 期末余额</strong>
                      ，差异绝对值小于0.001则视为平衡，统一展示为
                      <strong>0.00</strong>（绿色），否则展示实际差异（红色）
                    </li>
                    <li>
                      <strong>明细表格颜色区分：</strong>
                      <span
                        style={{
                          background: '#f6ffed',
                          padding: '2px 6px',
                          borderRadius: 2,
                          margin: '0 4px',
                        }}
                      >
                        浅绿色 = 收款类
                      </span>
                      <span
                        style={{
                          background: '#fff7e6',
                          padding: '2px 6px',
                          borderRadius: 2,
                          margin: '0 4px',
                        }}
                      >
                        浅橙色 = 扣款(本期费用)类
                      </span>
                      <span
                        style={{
                          background: '#e6f7ff',
                          padding: '2px 6px',
                          borderRadius: 2,
                          margin: '0 4px',
                        }}
                      >
                        浅蓝色 = 提现类
                      </span>
                    </li>
                  </ul>
                </div>
              </Collapse.Panel>
            </Collapse>

            {/* 业务编码明细表格 - 放底部 */}
            {(() => {
              // 先按一级大类，再按分类顺序排序，便于同类相邻并合并单元格
              const sortedStatData = [...statDataSource].sort((a, b) => {
                const ca = getFeeCategory(a.businessCode);
                const cb = getFeeCategory(b.businessCode);
                const ma = feeMajorCategoryOrder.indexOf(getFeeMajorCategory(ca));
                const mb = feeMajorCategoryOrder.indexOf(getFeeMajorCategory(cb));
                if (ma !== mb) return ma - mb;
                const ia = feeCategoryOrder.indexOf(ca);
                const ib = feeCategoryOrder.indexOf(cb);
                if (ia !== ib) return ia - ib;
                return (a.businessCode || '').localeCompare(b.businessCode || '');
              });
              // 计算每个一级大类的行数及首次出现索引，用于 rowSpan 合并
              const majorCount: Record<string, number> = {};
              const majorFirstIndex: Record<string, number> = {};
              // 计算每个分类的行数，用于 rowSpan 合并
              const categoryCount: Record<string, number> = {};
              const categoryFirstIndex: Record<string, number> = {};
              // 计算每个分类（管报名称）的收入、支出合计
              const categoryIncomeSum: Record<string, number> = {};
              const categoryExpenseSum: Record<string, number> = {};
              sortedStatData.forEach((item, idx) => {
                const cat = getFeeCategory(item.businessCode);
                const major = getFeeMajorCategory(cat);
                majorCount[major] = (majorCount[major] || 0) + 1;
                if (majorFirstIndex[major] === undefined) {
                  majorFirstIndex[major] = idx;
                }
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                if (categoryFirstIndex[cat] === undefined) {
                  categoryFirstIndex[cat] = idx;
                }
                categoryIncomeSum[cat] = (categoryIncomeSum[cat] || 0) + (item.totalIncome || 0);
                categoryExpenseSum[cat] = (categoryExpenseSum[cat] || 0) + (item.totalExpense || 0);
              });
              return (
                <Table
                  columns={[
                    {
                      title: '分类',
                      dataIndex: 'feeMajorCategory',
                      key: 'feeMajorCategory',
                      width: 90,
                      render: (_: unknown, record: any, index: number) => {
                        const major = getFeeMajorCategory(getFeeCategory(record.businessCode));
                        const isFirst = majorFirstIndex[major] === index;
                        return {
                          children: (
                            <span style={{ fontSize: 12, fontWeight: 'bold' }}>{major}</span>
                          ),
                          props: {
                            rowSpan: isFirst ? majorCount[major] : 0,
                          },
                        };
                      },
                    },
                    {
                      title: '管报名称',
                      dataIndex: 'feeCategory',
                      key: 'feeCategory',
                      width: 100,
                      render: (_: unknown, record: any, index: number) => {
                        const cat = getFeeCategory(record.businessCode);
                        const isFirst = categoryFirstIndex[cat] === index;
                        return {
                          children: <span style={{ fontSize: 12, fontWeight: 'bold' }}>{cat}</span>,
                          props: {
                            rowSpan: isFirst ? categoryCount[cat] : 0,
                          },
                        };
                      },
                    },
                    {
                      title: '收入金额合计',
                      dataIndex: 'incomeSum',
                      key: 'incomeSum',
                      width: 110,
                      render: (_: unknown, record: any, index: number) => {
                        const cat = getFeeCategory(record.businessCode);
                        const isFirst = categoryFirstIndex[cat] === index;
                        return {
                          children: (
                            <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                              {categoryIncomeSum[cat]?.toFixed(2) || '-'}
                            </span>
                          ),
                          props: {
                            rowSpan: isFirst ? categoryCount[cat] : 0,
                          },
                        };
                      },
                    },
                    {
                      title: '支出金额合计',
                      dataIndex: 'expenseSum',
                      key: 'expenseSum',
                      width: 110,
                      render: (_: unknown, record: any, index: number) => {
                        const cat = getFeeCategory(record.businessCode);
                        const isFirst = categoryFirstIndex[cat] === index;
                        return {
                          children: (
                            <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                              {categoryExpenseSum[cat]?.toFixed(2) || '-'}
                            </span>
                          ),
                          props: {
                            rowSpan: isFirst ? categoryCount[cat] : 0,
                          },
                        };
                      },
                    },
                    {
                      title: '业务编码',
                      dataIndex: 'businessCode',
                      key: 'businessCode',
                      width: 100,
                      render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
                    },
                    {
                      title: '业务描述',
                      dataIndex: 'businessDesc',
                      key: 'businessDesc',
                      render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
                    },
                    {
                      title: '收入金额',
                      dataIndex: 'totalIncome',
                      key: 'totalIncome',
                      width: 100,
                      render: (value: number) => (
                        <span style={{ fontSize: 12 }}>{value?.toFixed(2) || '-'}</span>
                      ),
                    },
                    {
                      title: '支出金额',
                      dataIndex: 'totalExpense',
                      key: 'totalExpense',
                      width: 100,
                      render: (value: number) => (
                        <span style={{ fontSize: 12 }}>{value?.toFixed(2) || '-'}</span>
                      ),
                    },
                    {
                      title: '计算结果',
                      dataIndex: 'calculate',
                      key: 'calculate',
                      width: 120,
                      render: (value: number) => (
                        <span style={{ fontSize: 12 }}>{value?.toFixed(2) || '-'}</span>
                      ),
                    },
                  ]}
                  dataSource={sortedStatData}
                  rowKey={(record, index) => `${record.businessCode}-${index}`}
                  loading={statLoading}
                  size="small"
                  className="stat-table-small"
                  style={{ fontSize: 12 }}
                  pagination={false}
                  scroll={{ x: 920 }}
                  onRow={(record) => {
                    // 根据业务编码所属分组设置不同背景色
                    let backgroundColor = 'transparent';
                    if (summaryGroups[0].codes.includes(record.businessCode)) {
                      backgroundColor = '#f6ffed'; // 收款 - 浅绿色
                    } else if (summaryGroups[1].codes.includes(record.businessCode)) {
                      backgroundColor = '#fff7e6'; // 本期费用(扣款) - 浅橙色
                    } else if (summaryGroups[2].codes.includes(record.businessCode)) {
                      backgroundColor = '#e6f7ff'; // 提现 - 浅蓝色
                    }
                    return {
                      style: { backgroundColor },
                    };
                  }}
                />
              );
            })()}
          </Modal>
        </>
      )}

      {activeTab === 'channel-bills' && (
        <>
          <Tabs
            activeKey={billSubTab}
            onChange={setBillSubTab}
            items={billSubTabItems}
            style={{ marginBottom: 16 }}
            type="card"
          />
          {renderBillSubTabContent()}
        </>
      )}
    </PageContainer>
  );
};

export default Report;
