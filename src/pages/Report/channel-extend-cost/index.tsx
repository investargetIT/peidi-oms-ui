import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  Space,
  Modal,
  Collapse,
  message,
  DatePicker,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ChannelExtendCostApi, {
  type PageRequest,
  type FinanceChannelExtendCostShopGroupVo,
  type FinanceChannelExtendCostMonthGroupVo,
  type FinanceChannelExtendCostDetailVo,
  type FinanceCostCategoryStatVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';

// 店铺名称显示映射：部分店铺展示时替换为规范名称
const shopNameDisplayMap: Record<string, string> = {
  '瑞驰派特-拼多多-萌宠嘉年华': '瑞驰派特-拼多多-帕特店',
};
const displayShopName = (name?: string) => (name ? shopNameDisplayMap[name] || name : name);

const ChannelExtendCostTab: React.FC = () => {
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


  // 切换tab时自动加载数据
  useEffect(() => {
    if (channelDataSource.length === 0) {
      fetchChannelData();
    }
    if (searchChannel && shopList.length === 0) {
      fetchShops(searchChannel);
    }
  }, []);

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

  // 管报数据查询 - 线上表格列（type=1）已移至 management-report/index.tsx

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
  );
};

export default ChannelExtendCostTab;
