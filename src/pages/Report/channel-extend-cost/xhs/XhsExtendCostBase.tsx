import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Collapse,
  Input,
  Select,
  Table,
  Space,
  Modal,
  message,
  DatePicker,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ChannelExtendCostApi, {
  type PageRequest,
  type FinanceChannelExtendCostItemVo,
  type FinanceXhsCostStatItemVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';

export interface XhsExtendCostBaseProps {
  channel: string;
  extraActions?: React.ReactNode;
  onYearMonthChange?: (yearMonth: string) => void;
  onCustomStatClick?: (params: {
    wdtName: string | undefined;
    yearMonth: string | undefined;
    shopId: number | undefined;
    channel: string | undefined;
  }) => boolean | void;
}

// 小红书费用统计项的分类归属：固定两种——「平台费用」「其他」
// 规则：计佣基数 → 其他；其余（赔付薯券 / 买手佣金 / 运费宝 / 平台佣金等）→ 平台费用
const XHS_CATEGORY_ORDER = ['平台费用', '其他'];
const getXhsCategory = (name: string | undefined) => (name === '计佣基数' ? '其他' : '平台费用');

const XhsExtendCostBase: React.FC<XhsExtendCostBaseProps> = ({
  channel,
  extraActions,
  onYearMonthChange,
  onCustomStatClick,
}) => {
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelDataSource, setChannelDataSource] = useState<FinanceChannelExtendCostItemVo[]>([]);
  const [channelPagination, setChannelPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const [statModalVisible, setStatModalVisible] = useState(false);
  const [statModalTitle, setStatModalTitle] = useState('');
  const [statLoading, setStatLoading] = useState(false);
  const [xhsStatData, setXhsStatData] = useState<FinanceXhsCostStatItemVo[]>([]);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  // 余额对账（与抖音 / 共享 Base 一致）：
  //   endingBalance = 本月期末余额；beginningBalance = 上月余额（本月期初）
  // 来自老接口 /cost-category-stat 内联余额项
  const [beginningBalance, setBeginningBalance] = useState<number | null>(null);
  const [endingBalance, setEndingBalance] = useState<number | null>(null);

  const [searchAccountType, setSearchAccountType] = useState<string>('');
  const [searchShopId, setSearchShopId] = useState<number | undefined>(undefined);
  const [searchYearMonth, setSearchYearMonth] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));

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

  const openStatModal = async (record: FinanceChannelExtendCostItemVo) => {
    const wdtName = record.wdtName;
    const yearMonth = record.yearMonth;
    const shopId = record.shopId;
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 小红书费用统计`;
    setStatModalTitle(title);
    setXhsStatData([]);
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

      // —— 明细：新接口 /xhs-cost-stat ——
      const statRes = await ChannelExtendCostApi.getXhsCostStat({ shopId, yearMonth });
      if (statRes.code !== 200) {
        message.error(typeof statRes.data === 'string' ? statRes.data : '获取统计数据失败');
        return;
      }
      setXhsStatData(statRes.data || []);

      // —— 余额对账：老接口 /cost-category-stat 只取余额（与抖音 / 共享 Base 一致）——
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
        // 回退：queryEndingBalance 取「上月末 = 期初」和「本月末」（与抖音 / 共享 Base 策略一致）
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
      console.error('获取小红书费用统计数据失败:', error);
      message.error('获取小红书费用统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 小红书余额对账 / 汇总：
  //   本期收款 = 收入列之和（type 为「收入」的各项之和，value 为正）
  //   本期费用 = 支出列之和（type 为「支出」的各项之和，保留负号）
  //   期末/上月余额 = 老接口 cost-category-stat 内联余额项（无则回退 queryEndingBalance）
  //   计算余额 = 上月余额 + 本期收款 + 本期费用 + 结息（提现默认 0）
  //   校验     = 计算余额 - 期末余额
  const xhsSummary = useMemo(() => {
    let income = 0; // 本期收款 / 收入列之和
    let expense = 0; // 本期费用 / 支出列之和（保留负号）
    xhsStatData.forEach((it) => {
      const v = typeof it.value === 'number' ? it.value : 0;
      if (it.type === '收入') {
        income += v;
      } else {
        expense += v;
      }
    });
    const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
    const lastMonthBalance = safeNum(beginningBalance);
    const endBalance = safeNum(endingBalance);
    const currentCollection = income;
    const currentExpense = expense;
    const withdraw = 0; // 提现默认 0
    const interest = 0; // 结息固定 0
    const calculatedBalance =
      lastMonthBalance + currentCollection + currentExpense + withdraw + interest;
    const checkDiff = calculatedBalance - endBalance;

    return {
      billMonth: currentYearMonth,
      accountName: currentShopName,
      platform: '小红书',
      endBalance,
      lastMonthBalance,
      currentCollection,
      currentExpense,
      withdraw,
      interest,
      calculatedBalance,
      checkDiff,
      // 明细表合计行使用的收入 / 支出 / 总金额
      income,
      expense,
      total: income + expense,
    };
  }, [xhsStatData, beginningBalance, endingBalance, currentYearMonth, currentShopName]);

  // 明细表行：把接口返回项映射为「分类 / 管报名称 / 收入 / 支出」。
  //   type 为「收入」→ 放进收入列；type 为「支出」→ 放进支出列（保留负号）。
  //   按分类聚合，分类顺序固定为 平台费用 / 其他（计佣基数 → 其他）。
  const xhsStatRows = useMemo(() => {
    const byCat: Record<string, any[]> = {};
    xhsStatData.forEach((it) => {
      const cat = getXhsCategory(it.name);
      const v = typeof it.value === 'number' ? it.value : 0;
      // 展示名：计佣基数 →「其他（净收入）」，其余沿用接口返回 name
      const displayName = it.name === '计佣基数' ? '其他（净收入）' : it.name || '-';
      const row = {
        category: cat,
        name: displayName,
        income: it.type === '收入' ? v : 0,
        expense: it.type === '支出' ? v : 0,
      };
      (byCat[cat] = byCat[cat] || []).push(row);
    });
    const rows: any[] = [];
    XHS_CATEGORY_ORDER.forEach((cat) => {
      (byCat[cat] || []).forEach((r) => rows.push(r));
    });
    // 分类列合并计数 / 首行下标
    const catCount: Record<string, number> = {};
    const catFirstIndex: Record<string, number> = {};
    rows.forEach((r, i) => {
      if (catCount[r.category] === undefined) {
        catCount[r.category] = 1;
        catFirstIndex[r.category] = i;
      } else {
        catCount[r.category] += 1;
      }
    });
    return { rows, catCount, catFirstIndex };
  }, [xhsStatData]);

  useEffect(() => {
    fetchChannelData();
    fetchShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (onYearMonthChange && searchYearMonth) {
      onYearMonthChange(searchYearMonth.format('YYYY-MM'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchYearMonth]);

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

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
          .stat-table-small tr.xhs-stat-summary-row > td {
            background: #fafafa !important;
          }
        `}</style>

        {/* 小红书余额对账（与抖音 / 共享 Base 的站内外推广费统计列一致） */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>小红书余额对账</div>
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
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '上月余额',
              dataIndex: 'lastMonthBalance',
              key: 'lastMonthBalance',
              width: 80,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '本期收款',
              dataIndex: 'currentCollection',
              key: 'currentCollection',
              width: 80,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '本期费用',
              dataIndex: 'currentExpense',
              key: 'currentExpense',
              width: 80,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '提现',
              dataIndex: 'withdraw',
              key: 'withdraw',
              width: 60,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '结息',
              dataIndex: 'interest',
              key: 'interest',
              width: 60,
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
          dataSource={statModalVisible ? [xhsSummary] : []}
          rowKey="billMonth"
          size="small"
          className="stat-table-small"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 950 }}
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
                lineHeight: 1.8,
              }}
            >
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {/* 一、数据来源 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>一、数据来源（两个接口）</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>
                      ① 费用明细 = 新接口 <code>GET /xhs-cost-stat</code>（按 business_desc 分类，
                      返回 <code>name / type / value</code>，金额含正负号）；
                    </div>
                    <div>
                      ② 余额（上月余额 / 期末余额）= 老接口 <code>GET /cost-category-stat</code>，取
                      <code>PDD_LAST_BALANCE</code>（上月/期初）和 <code>PDD_BALANCE</code>（本月期末）两条的
                      <code>totalIncome</code>；接口未返回时回退 <code>queryEndingBalance</code>。
                    </div>
                  </div>
                </li>

                {/* 二、明细表列结构 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>二、费用统计表列结构</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>固定 4 列：<strong>分类</strong> / <strong>管报名称</strong> / <strong>收入</strong> / <strong>支出</strong>。</div>
                    <div>
                      分类固定两种：<strong>平台费用</strong> / <strong>其他</strong>；
                      接口返回的 <code>name</code> 即「管报名称」。
                    </div>
                  </div>
                </li>

                {/* 三、分类归属 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>三、分类归属规则</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>· 名称为 <strong>计佣基数</strong> → 归入 <strong>其他</strong>；</div>
                    <div>· 其余名称（赔付薯券 / 买手佣金 / 运费宝 / 平台佣金 等）→ 归入 <strong>平台费用</strong>。</div>
                  </div>
                </li>

                {/* 四、收入 / 支出列取值 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>四、收入 / 支出列取值</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div><strong>收入列</strong> = <code>type</code> 为「收入」的那一条 <code>value</code>（正数）；</div>
                    <div><strong>支出列</strong> = <code>type</code> 为「支出」的那一条 <code>value</code>（负数，保留负号）；</div>
                    <div>不是对应的类型则填 0.00。</div>
                  </div>
                </li>

                {/* 五、合计行 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>五、合计行</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>· <strong>收入合计</strong> = 收入列所有值之和；</div>
                    <div>· <strong>支出合计</strong> = 支出列所有值之和（保留负号）。</div>
                  </div>
                </li>

                {/* 六、余额对账 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>六、余额对账表字段</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div><strong>期末余额 / 上月余额</strong> = <code>cost-category-stat</code> 内联余额项
                      （<code>PDD_BALANCE</code> / <code>PDD_LAST_BALANCE</code>），无则回退 <code>queryEndingBalance</code>；</div>
                    <div><strong>本期收款</strong> = 收入列之和；</div>
                    <div><strong>本期费用</strong> = 支出列之和（保留负号）；</div>
                    <div><strong>提现</strong> / <strong>结息</strong>：当前默认 0。</div>
                  </div>
                </li>

                {/* 七、计算余额 / 校验 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>七、计算余额与校验</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div><strong>计算余额</strong> = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息</div>
                    <div><strong>校验</strong> = 计算余额 - 期末余额；|值| &lt; 0.001 显示绿色 0.00，否则红色实际差异。</div>
                  </div>
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          小红书费用统计
          {xhsStatData.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （共 {xhsStatData.length} 项，最下面一行【合计】为收入 / 支出总和）
            </span>
          )}
        </div>
        <Table
          columns={[
            // 分类：合并单元格（平台费用 / 其他）
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 110,
              fixed: 'left' as const,
              render: (_: any, record: any, index: number) => {
                const isFirst = xhsStatRows.catFirstIndex[record.category] === index;
                return {
                  children: (
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{record.category}</span>
                  ),
                  props: {
                    rowSpan: isFirst ? xhsStatRows.catCount[record.category] : 0,
                  },
                };
              },
            },
            {
              title: '管报名称',
              dataIndex: 'name',
              key: 'name',
              fixed: 'left' as const,
              width: 160,
              render: (text: string) => <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text}</span>,
            },
            {
              title: '收入',
              dataIndex: 'income',
              key: 'income',
              width: 120,
              align: 'right' as const,
              render: (value: number) => {
                const v = typeof value === 'number' ? value : 0;
                return (
                  <span style={{ fontSize: 12, fontWeight: 'bold', color: v > 0 ? '#389e0d' : 'inherit' }}>
                    {v === 0 ? '0.00' : v.toFixed(2)}
                  </span>
                );
              },
            },
            {
              title: '支出',
              dataIndex: 'expense',
              key: 'expense',
              width: 120,
              align: 'right' as const,
              render: (value: number) => {
                const v = typeof value === 'number' ? value : 0;
                return (
                  <span style={{ fontSize: 12, fontWeight: 'bold', color: v < 0 ? '#cf1322' : 'inherit' }}>
                    {v === 0 ? '0.00' : v.toFixed(2)}
                  </span>
                );
              },
            },
          ]}
          dataSource={statModalVisible ? xhsStatRows.rows : []}
          rowKey={(record, index) => `${record.name}-${index}`}
          loading={statLoading}
          size="small"
          className="stat-table-small"
          pagination={false}
          scroll={{ x: 510 }}
          summary={
            xhsStatRows.rows.length > 0
              ? () => (
                  <Table.Summary.Row className="xhs-stat-summary-row">
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>合计</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {xhsSummary.income.toFixed(2)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {xhsSummary.expense.toFixed(2)}
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

export default XhsExtendCostBase;
