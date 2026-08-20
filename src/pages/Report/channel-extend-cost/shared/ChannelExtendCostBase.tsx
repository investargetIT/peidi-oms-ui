import React, { useEffect, useMemo, useState } from 'react';
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
  type FinanceChannelExtendCostItemVo,
  type FinanceCostCategoryStatVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';
import {
  summaryGroups,
  getFeeCategory,
  feeCategoryOrder,
  getFeeMajorCategory,
  feeMajorCategoryOrder,
} from '../common/businessCodes';
import { buildStatResult } from '../common/statBuilder';

export interface ChannelExtendCostBaseProps {
  /**
   * 渠道名称（拼多多/天猫/抖音/京东...）
   * 会作为 channel 参数透传给后端 /oms/finance/channel-extend-cost/group/page
   */
  channel: string;
  /**
   * 操作区右侧追加的额外按钮（如拼多多的「导出当前选中月份的所有店铺统计费用」）。
   * 不传则不渲染。
   */
  extraActions?: React.ReactNode;
  /**
   * 搜索栏的「年月」变化时回调，格式 yyyy-MM。
   * 用于让外层组件（如 PddExtendCostPanel）拿到当前选中的月份，
   * 配合「批量导出」按钮使用。
   */
  onYearMonthChange?: (yearMonth: string) => void;
  /**
   * 自定义「费用统计」点击行为。
   * 子渠道（如京东）如果要走自己的统计接口，可以传这个回调。
   * 返回 true 表示已处理，Base 不再弹默认的「站内外推广费统计」弹窗；
   * 返回 false / undefined 则继续走 Base 默认逻辑。
   */
  onCustomStatClick?: (params: {
    wdtName: string | undefined;
    yearMonth: string | undefined;
    shopId: number | undefined;
    channel: string | undefined;
  }) => boolean | void;
}

/**
 * 渠道推广费用 - 通用 Base 组件
 *
 * 4 个渠道（拼多多 / 天猫 / 抖音 / 京东）当前共用这一份实现。
 * 后续如果发现某个渠道有独立的差异（比如 feeCategories 不同、汇总逻辑不同等），
 * 可以在该渠道目录下 fork 一份自己的 panel 实现，不影响其他渠道。
 */
const ChannelExtendCostBase: React.FC<ChannelExtendCostBaseProps> = ({
  channel,
  extraActions,
  onYearMonthChange,
  onCustomStatClick,
}) => {
  // ============ 状态 ============
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelDataSource, setChannelDataSource] = useState<FinanceChannelExtendCostItemVo[]>([]);
  const [channelPagination, setChannelPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

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

  // 搜索条件 - 渠道由父级 Tab 决定（channel prop），不再作为搜索项
  const [searchAccountType, setSearchAccountType] = useState<string>('');
  const [searchShopId, setSearchShopId] = useState<number | undefined>(undefined);
  const [searchYearMonth, setSearchYearMonth] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));

  // ============ 数据获取 ============
  // 获取店铺列表（按当前渠道过滤）
  const fetchShops = async () => {
    setShopsLoading(true);
    try {
      const params: any = {
        sortStr: '',
        searchStr: JSON.stringify({
          searchName: 'platform',
          searchValue: channel,
          searchType: 'like',
        }),
      };
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
      const searchParams: any = {
        pageNum: channelPagination.current,
        pageSize: channelPagination.pageSize,
        accountType: searchAccountType || undefined,
        channel,
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

  // 打开费用分类统计弹窗
  // 余额获取策略：
  //   1. 若 getCostCategoryStat 返回的数据末尾包含 PDD_BALANCE / PDD_LAST_BALANCE，
  //      直接从 stat 数据里提取期末/上月余额，不再额外调用 queryEndingBalance；
  //   2. 否则走老逻辑：调两次 queryEndingBalance（上月 / 当月）分别取期初和期末。
  const openStatModal = async (record: FinanceChannelExtendCostItemVo) => {
    const wdtName = record.wdtName;
    const yearMonth = record.yearMonth;
    const shopId = record.shopId;
    const ch = record.channel;
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 站内外推广费统计`;
    setStatModalTitle(title);
    setStatDataSource([]);
    setBeginningBalance(null);
    setEndingBalance(null);
    setCurrentShopName(displayShopName(wdtName) || '');
    setCurrentYearMonth(yearMonth || '');
    setCurrentChannel(ch || '');
    setStatModalVisible(true);
    setStatLoading(true);
    try {
      const statRes = await ChannelExtendCostApi.getCostCategoryStat({
        shopId: shopId!,
        yearMonth: yearMonth!,
      });

      if (statRes.code !== 200) {
        message.error('获取统计数据失败');
        return;
      }

      const rawData = statRes.data || [];

      // 尝试从 stat 数据中提取余额项（拼多多等渠道后端已内置在返回末尾）
      const balanceItem = rawData.find((it) => it.businessCode === 'PDD_BALANCE');
      const lastBalanceItem = rawData.find((it) => it.businessCode === 'PDD_LAST_BALANCE');
      const hasInlineBalance = !!balanceItem || !!lastBalanceItem;

      // 过滤掉余额项，剩下的才是业务编码明细
      const detailData = rawData.filter(
        (it) => it.businessCode !== 'PDD_BALANCE' && it.businessCode !== 'PDD_LAST_BALANCE',
      );

      let beginningVal: number | null = null;
      let endingVal: number | null = null;

      if (hasInlineBalance) {
        // —— 策略 1：从 stat 数据里直接拿余额 ——
        if (lastBalanceItem && lastBalanceItem.totalIncome !== undefined && lastBalanceItem.totalIncome !== null) {
          beginningVal = lastBalanceItem.totalIncome;
        }
        if (balanceItem && balanceItem.totalIncome !== undefined && balanceItem.totalIncome !== null) {
          endingVal = balanceItem.totalIncome;
        }
      } else {
        // —— 策略 2：老逻辑，调 queryEndingBalance 两次 ——
        const [year, month] = yearMonth!.split('-').map(Number);
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) {
          prevYear = year - 1;
          prevMonth = 12;
        }
        const prevYearMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

        const [beginningBalanceRes, endingBalanceRes] = await Promise.all([
          ChannelExtendCostApi.queryEndingBalance({
            accountType: '期末余额',
            shopId: shopId!,
            yearMonth: prevYearMonth,
          }),
          ChannelExtendCostApi.queryEndingBalance({
            accountType: '期末余额',
            shopId: shopId!,
            yearMonth: yearMonth!,
          }),
        ]);

        if (
          beginningBalanceRes.code === 200 &&
          beginningBalanceRes.data &&
          beginningBalanceRes.data.incomeAmount !== undefined
        ) {
          beginningVal = beginningBalanceRes.data.incomeAmount;
        } else {
          console.warn('获取期初余额失败或数据为空');
        }

        if (
          endingBalanceRes.code === 200 &&
          endingBalanceRes.data &&
          endingBalanceRes.data.incomeAmount !== undefined
        ) {
          endingVal = endingBalanceRes.data.incomeAmount;
        } else {
          console.warn('获取本月期末余额失败或数据为空');
        }
      }

      setBeginningBalance(beginningVal);
      setEndingBalance(endingVal);
      setStatDataSource(detailData);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      message.error('获取统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 把后端 3 个接口的原始数据组装成「汇总 + 排序后明细」，
  // 弹窗和「批量导出 Excel」共用此结果，保证两边展示完全一致。
  const statResult = useMemo(
    () =>
      buildStatResult({
        statData: statDataSource,
        beginningBalance,
        endingBalance,
        yearMonth: currentYearMonth,
        channel: currentChannel,
        shopName: currentShopName,
      }),
    [
      statDataSource,
      beginningBalance,
      endingBalance,
      currentYearMonth,
      currentChannel,
      currentShopName,
    ],
  );

  // 初始化加载（每个 tab 切换时都会重新挂载，因此 mount 时拉一次即可）
  useEffect(() => {
    fetchChannelData();
    fetchShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 通知外层当前选中的年月（用于批量导出按钮显示当前月份）
  useEffect(() => {
    if (onYearMonthChange && searchYearMonth) {
      onYearMonthChange(searchYearMonth.format('YYYY-MM'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchYearMonth]);

  // ============ 表格列定义 ============
  // 主表 - 扁平结构：每个 (店铺, 年月) 一行
  // 后端 /oms/finance/channel-extend-cost/group/page 新版返回扁平结构，
  // 不再需要店铺内嵌 monthGroups 展开，年月直接作为一列。
  // 主表不展示余额，余额由费用统计弹窗走老的 /query 接口单独取。
  const itemColumns = [
    { title: '店铺ID', dataIndex: 'shopId', key: 'shopId', width: 100, fixed: 'left' as const },
    {
      title: '店铺名称',
      dataIndex: 'wdtName',
      key: 'wdtName',
      width: 200,
      fixed: 'left' as const,
      render: (text: string) => displayShopName(text),
    },
    { title: '渠道', dataIndex: 'channel', key: 'channel', width: 100 },
    { title: '年月', dataIndex: 'yearMonth', key: 'yearMonth', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: FinanceChannelExtendCostItemVo) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            style={{ fontSize: 12, padding: 0 }}
            onClick={() => {
              if (onCustomStatClick) {
                const handled = onCustomStatClick({
                  wdtName: record.wdtName,
                  yearMonth: record.yearMonth,
                  shopId: record.shopId,
                  channel: record.channel,
                });
                if (handled) return;
              }
              openStatModal(record);
            }}
          >
            费用统计
          </Button>
        </Space>
      ),
    },
  ];

  // ============ 搜索 ============
  const handleSearch = () => {
    if (!searchYearMonth) {
      message.error('请选择年月');
      return;
    }
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
    fetchChannelData({ pageNum: 1 });
  };

  const handleReset = () => {
    setSearchAccountType('');
    setSearchShopId(undefined);
    setSearchYearMonth(dayjs().subtract(1, 'month'));
    fetchShops();
    setChannelPagination((prev) => ({ ...prev, current: 1 }));
  };

  // ============ 渲染 ============
  return (
    <>
      {/* 搜索栏 */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
              <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              {extraActions}
            </Space>
          </div>
        </div>
      </div>

      {/* 表格 - 扁平结构，每个 (店铺, 年月) 一行 */}
      <Table
        columns={itemColumns}
        dataSource={channelDataSource}
        rowKey={(record) => `${record.shopId}-${record.yearMonth}`}
        loading={channelLoading}
        size="small"
        scroll={{ x: 1000 }}
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

        {/* 汇总表格 */}
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
          dataSource={statModalVisible ? [statResult.summary] : []}
          rowKey="billMonth"
          size="small"
          className="stat-table-small"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 1100 }}
        />

        {/* 计算逻辑说明 */}
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
                <li style={{ marginBottom: 2 }}><strong>账单月份：</strong>当前统计的月份</li>
                <li style={{ marginBottom: 2 }}><strong>平台：</strong>当前统计的渠道</li>
                <li style={{ marginBottom: 2 }}><strong>账户名称：</strong>店铺名称</li>
                <li style={{ marginBottom: 2 }}><strong>期末余额：</strong>系统查询到的本月实际期末余额</li>
                <li style={{ marginBottom: 2 }}><strong>上月余额：</strong>上个月末的账户余额，作为本月期初</li>
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
                <li style={{ marginBottom: 2 }}><strong>结息：</strong>默认 0，如有结息业务后续调整</li>
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

        {/* 业务编码明细表格 */}
        {(() => {
          const { detail, detailGroupMeta } = statResult;
          const { majorCount, majorFirstIndex, categoryCount, categoryFirstIndex } =
            detailGroupMeta;
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
                      props: { rowSpan: isFirst ? majorCount[major] : 0 },
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
                      props: { rowSpan: isFirst ? categoryCount[cat] : 0 },
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
                          {record.incomeSum?.toFixed(2) || '-'}
                        </span>
                      ),
                      props: { rowSpan: isFirst ? categoryCount[cat] : 0 },
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
                          {record.expenseSum?.toFixed(2) || '-'}
                        </span>
                      ),
                      props: { rowSpan: isFirst ? categoryCount[cat] : 0 },
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
              dataSource={detail}
              rowKey={(record, index) => `${record.businessCode}-${index}`}
              loading={statLoading}
              size="small"
              className="stat-table-small"
              style={{ fontSize: 12 }}
              pagination={false}
              scroll={{ x: 920 }}
              onRow={(record) => {
                let backgroundColor = 'transparent';
                if (summaryGroups[0].codes.includes(record.businessCode)) {
                  backgroundColor = '#f6ffed';
                } else if (summaryGroups[1].codes.includes(record.businessCode)) {
                  backgroundColor = '#fff7e6';
                } else if (summaryGroups[2].codes.includes(record.businessCode)) {
                  backgroundColor = '#e6f7ff';
                }
                return { style: { backgroundColor } };
              }}
            />
          );
        })()}
      </Modal>
    </>
  );
};

export default ChannelExtendCostBase;
