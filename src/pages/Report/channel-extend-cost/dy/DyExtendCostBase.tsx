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
  type FinanceDyCostStatVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';

export interface DyExtendCostBaseProps {
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
 * 抖音 - 渠道推广费用 独立面板（由 shared/ChannelExtendCostBase 拷贝而来）
 *
 * 抖音已 fork 独立实现，与通用 Base 解耦。「费用统计」改为走抖音专属接口
 *   GET /oms/finance/channel-extend-cost/dy-cost-stat
 * 请求参数 { shopId, yearMonth }，返回结构为：
 *   data = [{ name: 业务描述（分类别）, value: 动账金额, details: [{name, value}, ...] }, ...]
 * 业务描述（分类别）= data 第一层 name；后续各列 = data[x].details.name（明细费用项）。
 * 明细表列完全按接口 details 动态生成，不再依赖固定列 / 公共的 getCostCategoryStat / 业务编码分类。
 * 后续抖音专属逻辑（统计接口、汇总口径、弹窗展示等）直接在本目录修改，
 * 不影响拼多多 / 天猫 / 支付宝等共用 Base 的渠道。
 */
const DyExtendCostBase: React.FC<DyExtendCostBaseProps> = ({
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

  // 抖音费用统计弹窗状态
  const [statModalVisible, setStatModalVisible] = useState(false);
  const [statModalTitle, setStatModalTitle] = useState('');
  const [statLoading, setStatLoading] = useState(false);
  // 抖音费用明细（按业务分类）：新接口 /dy-cost-stat 返回
  //   业务描述（分类别）= data 第一层 name；后续各列 = data[x].details.name
  const [dyStatData, setDyStatData] = useState<FinanceDyCostStatVo[]>([]);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  // 余额（与共享 Base 的「站内外推广费统计」汇总表一致）：
  //   endingBalance = 本月期末余额；beginningBalance = 上月余额（本月期初）
  const [beginningBalance, setBeginningBalance] = useState<number | null>(null);
  const [endingBalance, setEndingBalance] = useState<number | null>(null);

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

  // 打开抖音费用统计弹窗
  // 打开抖音费用统计弹窗：
  //   1) 抖音费用明细（按业务分类）：新接口 GET /dy-cost-stat，返回 { shopId, yearMonth }
  //   2) 抖音余额对账：与共享 Base / 天猫一致——
  //        本期收款 / 本期费用 / 提现 = 老接口 GET /cost-category-stat 按业务编码汇总
  //        期末 / 上月余额        = 老接口 queryEndingBalance
  const openStatModal = async (record: FinanceChannelExtendCostItemVo) => {
    const wdtName = record.wdtName;
    const yearMonth = record.yearMonth;
    const shopId = record.shopId;
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 抖音费用统计`;
    setStatModalTitle(title);
    setDyStatData([]);
    setBeginningBalance(null);
    setEndingBalance(null);
    setCurrentShopName(displayShopName(wdtName) || '');
    setCurrentYearMonth(yearMonth || '');
    setStatModalVisible(true);
    setStatLoading(true);
    try {
      if (shopId === undefined || shopId === null) {
        message.error('该店铺没有 ID，无法查询');
        return;
      }
      if (!yearMonth) {
        message.error('缺少月份信息');
        return;
      }

      // —— 明细表：新接口 /dy-cost-stat ——
      const statRes = await ChannelExtendCostApi.getDyCostStat({ shopId, yearMonth });
      if (statRes.code !== 200) {
        message.error(typeof statRes.data === 'string' ? statRes.data : '获取统计数据失败');
        return;
      }
      setDyStatData(statRes.data || []);

      // —— 余额对账表：老接口 /cost-category-stat 只取余额（参考天猫/共享 Base）——
      const costRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth });
      if (costRes.code !== 200) {
        message.error(typeof costRes.data === 'string' ? costRes.data : '获取统计数据失败');
        return;
      }
      const rawData = costRes.data || [];

      // 余额项：PDD_BALANCE = 本月期末余额，PDD_LAST_BALANCE = 上月余额（本月期初）
      const balanceItem = rawData.find((it) => it.businessCode === 'PDD_BALANCE');
      const lastBalanceItem = rawData.find((it) => it.businessCode === 'PDD_LAST_BALANCE');
      const hasInlineBalance = !!balanceItem || !!lastBalanceItem;

      if (hasInlineBalance) {
        // 与共享 Base / 天猫一致：直接从 cost-category-stat 返回里取余额
        if (
          lastBalanceItem &&
          lastBalanceItem.totalIncome !== undefined &&
          lastBalanceItem.totalIncome !== null
        ) {
          setBeginningBalance(lastBalanceItem.totalIncome);
        } else {
          console.warn('cost-category-stat 未返回上月余额（PDD_LAST_BALANCE）');
        }
        if (
          balanceItem &&
          balanceItem.totalIncome !== undefined &&
          balanceItem.totalIncome !== null
        ) {
          setEndingBalance(balanceItem.totalIncome);
        } else {
          console.warn('cost-category-stat 未返回本月期末余额（PDD_BALANCE）');
        }
      } else {
        // 回退：queryEndingBalance 取「上月末 = 期初」和「本月末」（与共享 Base 策略一致）
        const [py, pm] = yearMonth.split('-').map(Number);
        const prevYear = pm === 1 ? py - 1 : py;
        const prevMonth = pm === 1 ? 12 : pm - 1;
        const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        const [beginRes, endRes] = await Promise.all([
          ChannelExtendCostApi.queryEndingBalance({
            accountType: '期末余额',
            shopId,
            yearMonth: prevYearMonth,
          }),
          ChannelExtendCostApi.queryEndingBalance({
            accountType: '期末余额',
            shopId,
            yearMonth,
          }),
        ]);
        if (beginRes.code === 200 && beginRes.data && beginRes.data.incomeAmount !== undefined) {
          setBeginningBalance(beginRes.data.incomeAmount);
        } else {
          console.warn('获取上月余额失败或数据为空');
        }
        if (endRes.code === 200 && endRes.data && endRes.data.incomeAmount !== undefined) {
          setEndingBalance(endRes.data.incomeAmount);
        } else {
          console.warn('获取本月期末余额失败或数据为空');
        }
      }
    } catch (error) {
      console.error('获取抖音费用统计数据失败:', error);
      message.error('获取抖音费用统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 动态明细列名：取所有分类 details 里 name 的去重并集（保持出现顺序）
  // 业务描述（分类别）= data 第一层 name；后续各列 = data[x].details.name
  const dyDetailColumnNames = useMemo(() => {
    const names: string[] = [];
    const seen = new Set<string>();
    // 「订单净收入」始终固定为第二列（业务描述之后的第一列明细列）
    const collect = (detailName: string | undefined) => {
      if (detailName && !seen.has(detailName)) {
        seen.add(detailName);
        names.push(detailName);
      }
    };
    collect('订单净收入');
    dyStatData.forEach((cat) => {
      (cat.details || []).forEach((d) => {
        collect(d.name);
      });
    });
    return names;
  }, [dyStatData]);

  // 明细列配置：与「合计」行共用同一份列名，保证列顺序一致（完全按接口 details 动态生成）
  // 「收入金额（入账）」「支出金额（出账）」固定在最右侧两列：
  //   收入金额 = 该分类动账金额（value）>0 的部分；支出金额 = <0 的部分（保留负号）
  const dyFeeColumns = useMemo(() => {
    const cols: any[] = dyDetailColumnNames.map((detailName) => ({
      title: detailName,
      dataIndex: detailName,
      key: detailName,
      width: 120,
      align: 'right' as const,
      render: (_: any, record: FinanceDyCostStatVo) => {
        // 小额打款：订单净收入固定为收入金额（该分类首层 value 正数）
        if (detailName === '订单净收入' && record.name === '小额打款') {
          const v = typeof record.value === 'number' ? record.value : 0;
          return <span style={{ fontSize: 12 }}>{v.toFixed(2)}</span>;
        }
        const detail = (record.details || []).find((d) => d.name === detailName);
        return (
          <span style={{ fontSize: 12 }}>
            {detail && typeof detail.value === 'number' ? detail.value.toFixed(2) : '0.00'}
          </span>
        );
      },
    }));
    // 右端两列：收入金额 / 支出金额（固定在表格最右侧，横向滚动时保持可见）
    cols.push(
      {
        title: '收入金额（入账）',
        dataIndex: '收入金额',
        key: '收入金额',
        width: 100,
        fixed: 'right' as const,
        align: 'right' as const,
        render: (_: any, record: FinanceDyCostStatVo) => {
          const v = typeof record.value === 'number' ? record.value : 0;
          return <span style={{ fontSize: 12 }}>{v > 0 ? v.toFixed(2) : '0.00'}</span>;
        },
      },
      {
        title: '支出金额（出账）',
        dataIndex: '支出金额',
        key: '支出金额',
        width: 100,
        fixed: 'right' as const,
        align: 'right' as const,
        render: (_: any, record: FinanceDyCostStatVo) => {
          // 小额打款：支出金额固定 0
          if (record.name === '小额打款') {
            return <span style={{ fontSize: 12 }}>0.00</span>;
          }
          const v = typeof record.value === 'number' ? record.value : 0;
          return <span style={{ fontSize: 12 }}>{v < 0 ? v.toFixed(2) : '0.00'}</span>;
        },
      },
    );
    return cols;
  }, [dyDetailColumnNames]);

  // 抖音费用统计各明细列纵向合计（每列 = 所有分类该列金额之和），
  // 作为表格的合计行展示，便于核对"汇总各费用项"。
  const dyStatSummaryRow = useMemo(() => {
    const acc: Record<string, number> = {};
    let incomeSum = 0;
    let expenseSum = 0;
    dyStatData.forEach((cat) => {
      (cat.details || []).forEach((d) => {
        if (d.name && typeof d.value === 'number') {
          // 小额打款：订单净收入按收入金额（首层 value 正数）计
          const detailValue =
            d.name === '订单净收入' && cat.name === '小额打款'
              ? Math.max(0, typeof cat.value === 'number' ? cat.value : 0)
              : d.value;
          acc[d.name] = (acc[d.name] || 0) + detailValue;
        }
      });
      const v = typeof cat.value === 'number' ? cat.value : 0;
      if (v > 0) incomeSum += v;
      // 小额打款不计入支出金额（支出固定 0）
      if (cat.name !== '小额打款' && v < 0) expenseSum += v;
    });
    // 右端两列合计
    acc['收入金额'] = incomeSum;
    acc['支出金额'] = expenseSum;
    return acc;
  }, [dyStatData]);

  // 抖音余额对账（最上面的汇总表）：
//   本期收款 = 订单净收入（details 中「订单净收入」项）各分类之和（订单净收入合计）
//   本期费用 = 合计的平台服务费 + 合计的佣金 + 合计的服务商佣金 + 合计的招商服务费
//             + 合计的站外推广费（均保留负号）
//             + 合计的上门取件出账金额 + 合计的退换货运费险出账金额（均变成负数）
//   期末余额 / 上月余额 = 老接口 cost-category-stat 内联余额项（无则回退 queryEndingBalance）
//   提现 = 明细表「提现」列合计；结息 = 默认 0
//   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
//   校验     = 计算余额 - 期末余额
  const dySummary = useMemo(() => {
    // 本期收款 = 订单净收入合计（所有分类 details 中「订单净收入」项之和）
// 小额打款的订单净收入按收入金额（首层 value 正数）计
    let incomeTotal = 0;
    dyStatData.forEach((cat) => {
      const net = (cat.details || []).find((d) => d.name === '订单净收入');
      if (net && typeof net.value === 'number') {
        const netValue =
          cat.name === '小额打款'
            ? Math.max(0, typeof cat.value === 'number' ? cat.value : 0)
            : net.value;
        incomeTotal += netValue;
      }
    });

    // 本期费用：
    //   1) 五项费用列的纵向合计，均保留负号（平台服务费 / 佣金 / 服务商佣金 / 招商服务费 / 站外推广费）
    //   2) 上门取件、退换货运费险两个分类的出账金额，转成负数后计入
    const asNegative = (n: number | undefined) => {
      if (typeof n !== 'number') return 0;
      return n < 0 ? n : -n;
    };
    let expenseTotal = 0;
    ['平台服务费', '佣金', '服务商佣金', '招商服务费', '站外推广费'].forEach((key) => {
      expenseTotal += asNegative(dyStatSummaryRow[key]);
    });
    // 上门取件 / 退换货运费险 分类的出账金额（value 转成负数）
    const categoryValue = (categoryName: string) => {
      const cat = dyStatData.find((c) => c.name === categoryName);
      return cat && typeof cat.value === 'number' ? cat.value : 0;
    };
    expenseTotal += asNegative(categoryValue('上门取件-支付快递费'));
    expenseTotal += asNegative(categoryValue('退换货运费险'));

    const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
    const lastMonthBalance = safeNum(beginningBalance);
    const endBalance = safeNum(endingBalance);
    const currentCollection = incomeTotal;
    const currentExpense = expenseTotal; // 本期费用 = 五费用列合计 + 上门取件/退换货运费险出账金额
    const withdraw = dyStatSummaryRow['提现'] ?? 0; // 提现 = 明细表「提现」列合计
    const interest = 0; // 结息固定 0
    const calculatedBalance =
      lastMonthBalance + currentCollection + currentExpense + withdraw + interest;
    const checkDiff = calculatedBalance - endBalance;

    return {
      billMonth: currentYearMonth,
      accountName: currentShopName,
      platform: '抖音',
      endBalance,
      lastMonthBalance,
      currentCollection,
      currentExpense,
      withdraw,
      interest,
      calculatedBalance,
      checkDiff,
    };
  }, [dyStatData, currentYearMonth, currentShopName, beginningBalance, endingBalance]);

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

      {/* 抖音费用统计弹窗：动账方向汇总 + 按动账场景分类汇总各费用项 */}
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
            font-size: 12px !important;
            line-height: 1.3 !important;
            height: 28px !important;
            white-space: nowrap !important;
          }
          .stat-table-small tr th {
            padding: 6px 8px !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            white-space: nowrap !important;
          }
          .stat-table-small tr.dy-stat-summary-row > td {
            background: #fafafa !important;
          }
        `}</style>

        {/* 抖音余额对账（最上面的汇总表，列与共享 Base 的站内外推广费统计一致） */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>抖音余额对账</div>
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
              width: 50,
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
              width: 110,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '上月余额',
              dataIndex: 'lastMonthBalance',
              key: 'lastMonthBalance',
              width: 90,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '本期收款',
              dataIndex: 'currentCollection',
              key: 'currentCollection',
              width: 110,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '本期费用',
              dataIndex: 'currentExpense',
              key: 'currentExpense',
              width: 110,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '提现',
              dataIndex: 'withdraw',
              key: 'withdraw',
              width: 80,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '结息',
              dataIndex: 'interest',
              key: 'interest',
              width: 70,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '计算余额',
              dataIndex: 'calculatedBalance',
              key: 'calculatedBalance',
              width: 100,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '校验',
              dataIndex: 'checkDiff',
              key: 'checkDiff',
              width: 80,
              fixed: 'right' as const,
              align: 'left' as const,
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
          dataSource={statModalVisible ? [dySummary] : []}
          rowKey="billMonth"
          loading={statLoading}
          size="small"
          className="stat-table-small"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 1030 }}
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
                <li style={{ marginBottom: 4 }}>
                  <strong>抖音余额对账：</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      <strong>本期收款</strong> = 订单净收入合计（所有分类 details 中「订单净收入」项之和）
                    </div>
                    <div>
                      <strong>本期费用</strong> = 合计的平台服务费 + 合计的佣金 + 合计的服务商佣金 +
                      合计的招商服务费 + 合计的站外推广费（均保留负号） + 合计的上门取件出账金额 +
                      合计的退换货运费险出账金额（均变成负数）
                    </div>
                    <div>
                      <strong>上月余额 / 期末余额</strong> = 老接口 cost-category-stat 内联余额项
                      （PDD_LAST_BALANCE / PDD_BALANCE）返回，无内联项则回退 queryEndingBalance
                    </div>
                    <div><strong>提现</strong> = 明细表「提现」列合计；<strong>结息</strong>：默认 0</div>
                    <div>
                      <strong>计算余额</strong> = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
                    </div>
                    <div>
                      <strong>校验</strong> = 计算余额 - 期末余额，|值| &lt; 0.001 显示绿色 0.00，否则红色实际差异
                    </div>
                  </div>
                </li>
                <li style={{ marginBottom: 4 }}>
                  <strong>业务描述（分类别）：</strong> = 接口 data 第一层的 name。
                </li>
                <li style={{ marginBottom: 4 }}>
                  <strong>后续各列：</strong> = 每个分类 details 里的各费用项（details.name），
                  值与列完全按接口返回动态生成（列取所有分类 detail name 的去重并集）；
                  「订单净收入」固定为第二列。
                </li>
                <li style={{ marginBottom: 4 }}>
                  <strong>最右侧两列：</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div><strong>收入金额（入账）</strong> = 该分类动账金额（首层 value）&gt;0 的部分，否则 0</div>
                    <div><strong>支出金额（出账）</strong> = 该分类动账金额（首层 value）&lt;0 的部分（保留负号），否则 0</div>
                  </div>
                </li>
                <li style={{ marginBottom: 4 }}>
                  <strong>合计行：</strong>每列所有分类的纵向相加，便于核对整月总额。
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong>「动账金额」列：</strong>为该分类动账金额（首层 value），同时出现在 details 中，
                  正数为入账、负数为出账。
                </li>
                <li style={{ marginBottom: 0 }}>
                  <strong>小额打款：</strong>业务描述（分类别）为「小额打款」时，<strong>支出金额固定为 0</strong>，
                  <strong>订单净收入固定为收入金额</strong>（该分类首层 value 正数）。
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* 明细表：业务描述（分类别）= data 第一层 name；后续各列 = details 里各费用项 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          抖音费用明细（按业务分类）
          {dyStatData.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （共 {dyStatData.length} 项，最下面一行【合计】为每列总和）
            </span>
          )}
        </div>
        <Table
          columns={[
            // 分类、管报名称：暂无数据，先占位空列（后续由后端补充）
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 120,
              fixed: 'left' as const,
              render: () => <span style={{ fontSize: 12 }}></span>,
            },
            {
              title: '管报名称',
              dataIndex: 'mgmtReportName',
              key: 'mgmtReportName',
              width: 120,
              fixed: 'left' as const,
              render: () => <span style={{ fontSize: 12 }}></span>,
            },
            {
              title: '业务描述（分类别）',
              dataIndex: 'name',
              key: 'name',
              width: 180,
              fixed: 'left' as const,
              render: (text: string) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text || '-'}</span>
              ),
            },
            ...dyFeeColumns,
          ]}
          dataSource={statModalVisible ? dyStatData : []}
          rowKey={(record, index) => `${record.name}-${index}`}
          loading={statLoading}
          size="small"
          className="stat-table-small"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 420 + dyDetailColumnNames.length * 120 + 200 }}
          summary={
            dyStatData.length > 0
              ? () => (
                  <Table.Summary.Row className="dy-stat-summary-row">
                    {/* 合计：跨「分类 + 管报名称 + 业务描述（分类别）」三列 */}
                    <Table.Summary.Cell index={0} align="left" colSpan={3}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>合计</span>
                    </Table.Summary.Cell>
                    {dyDetailColumnNames.map((detailName, idx) => (
                      <Table.Summary.Cell key={detailName} index={idx + 1} align="right">
                        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                          {dyStatSummaryRow[detailName] !== undefined
                            ? dyStatSummaryRow[detailName].toFixed(2)
                            : '0.00'}
                        </span>
                      </Table.Summary.Cell>
                    ))}
                    <Table.Summary.Cell
                      key="收入金额"
                      index={dyDetailColumnNames.length + 1}
                      align="right"
                    >
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {dyStatSummaryRow['收入金额']?.toFixed(2) ?? '0.00'}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell
                      key="支出金额"
                      index={dyDetailColumnNames.length + 2}
                      align="right"
                    >
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {dyStatSummaryRow['支出金额']?.toFixed(2) ?? '0.00'}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              : undefined
          }
        />

        </Modal>
    </>
  );
};

export default DyExtendCostBase;
