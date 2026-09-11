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
  type FinanceZfbCostStatVo,
  type FinanceZfbCostStatDetailItemVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';

export interface ZfbExtendCostBaseProps {
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

/**
 * 支付宝 - 渠道推广费用 独立面板（由 shared/ChannelExtendCostBase 拷贝而来，已与 Base 解耦）
 *
 * 支付宝「费用统计」走专属接口：
 *   POST /oms/finance/channel-extend-cost/bill/zfb/detail-summary（账单明细汇总查询）
 * 请求参数 { financeBillConfigId, billDate: yyyy-MM }（financeBillConfigId 取当前行记录的账单配置ID）。
 */
const ZfbExtendCostBase: React.FC<ZfbExtendCostBaseProps> = ({
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
  const [zfbStatData, setZfbStatData] = useState<FinanceZfbCostStatVo | null>(null);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  // 余额（对账用，与抖音一致）：
  //   endingBalance = 本月期末余额；beginningBalance = 上月余额（本月期初）
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

  // 打开支付宝费用统计弹窗
  //   1) 支付宝费用明细/汇总：专属接口 POST /bill/zfb/detail-summary
  //   2) 支付宝余额对账：与抖音一致，用老接口 GET /cost-category-stat 只取
  //        PDD_LAST_BALANCE（上月余额/期初）和 PDD_BALANCE（本月期末）；
  //        接口未内联余额时回退 queryEndingBalance
  const openStatModal = async (record: FinanceChannelExtendCostItemVo) => {
    const wdtName = record.wdtName;
    const yearMonth = record.yearMonth;
    const shopId = record.shopId;
    const financeBillConfigId = record.financeBillConfigId;
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 支付宝费用统计`;
    setStatModalTitle(title);
    setZfbStatData(null);
    setBeginningBalance(null);
    setEndingBalance(null);
    setCurrentShopName(displayShopName(wdtName) || '');
    setCurrentYearMonth(yearMonth || '');
    setStatModalVisible(true);
    setStatLoading(true);
    try {
      if (!financeBillConfigId) {
        message.error('该店铺缺少账单配置ID，无法查询');
        return;
      }
      if (!yearMonth) {
        message.error('缺少月份信息');
        return;
      }

      // —— 明细/汇总：新接口 /bill/zfb/detail-summary ——
      const res = await ChannelExtendCostApi.getZfbCostStat({
        financeBillConfigId,
        billDate: yearMonth,
      });
      if (res.code !== 200) {
        message.error(typeof res.data === 'string' ? res.data : '获取统计数据失败');
        return;
      }
      setZfbStatData(res.data);

      // —— 余额对账：老接口 /cost-category-stat 只取余额（参考抖音/共享 Base）——
      if (shopId === undefined || shopId === null) {
        console.warn('该店铺没有 ID，无法查询余额对账');
        return;
      }
      const costRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth });
      if (costRes.code === 200) {
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
          if (
            beginRes.code === 200 &&
            beginRes.data &&
            beginRes.data.incomeAmount !== undefined
          ) {
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
      }
    } catch (error) {
      console.error('获取支付宝统计数据失败:', error);
      message.error('获取支付宝统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  const zfbRows = useMemo(() => zfbStatData?.rows || [], [zfbStatData]);
  const zfbTotal = zfbStatData?.total;
  const zfbIncomeTotal = useMemo(
    () =>
      zfbTotal?.totalIncome ??
      zfbRows.reduce((sum, r) => sum + (r.totalIncome || 0), 0),
    [zfbRows, zfbTotal],
  );
  const zfbExpenseTotal = useMemo(
    () =>
      zfbTotal?.totalExpense ??
      zfbRows.reduce((sum, r) => sum + (r.totalExpense || 0), 0),
    [zfbRows, zfbTotal],
  );
  // 支付宝余额对账（顶部汇总表）：本期收款 / 提现 / 结息 / 本期费用
  //   按「账单明细汇总 rows 的分类」归类：
  //     本期收款 = "收款" 分类的收入金额 + 支出金额
  //     提现     = "提现" 分类的收入金额 + 支出金额
  //     结息     = "结息" 分类的收入金额 + 支出金额
  //     本期费用 = 移除 收款 / 提现 / 结息 后，其余分类的收入金额 + 支出金额 之和
  //   期末余额 / 上月余额 = 老接口 cost-category-stat 内联余额项（无则回退 queryEndingBalance）
  //   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
  //   校验     = 计算余额 - 期末余额
  const zfbSummary = useMemo(() => {
    const sumOf = (r: FinanceZfbCostStatDetailItemVo) => (r.totalIncome || 0) + (r.totalExpense || 0);
    let collection = 0; // 本期收款
    let withdraw = 0; // 提现
    let interest = 0; // 结息
    let expense = 0; // 本期费用（其余分类收入+支出之和）
    zfbRows.forEach((r) => {
      const val = sumOf(r);
      if (r.category === '收款') collection += val;
      else if (r.category === '提现') withdraw += val;
      else if (r.category === '结息') interest += val;
      else expense += val;
    });

    const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
    const lastMonthBalance = safeNum(beginningBalance);
    const endBalance = safeNum(endingBalance);
    const currentCollection = collection;
    const currentExpense = expense;
    const calculatedBalance =
      lastMonthBalance + currentCollection + currentExpense + withdraw + interest;
    const checkDiff = calculatedBalance - endBalance;

    return {
      billMonth: currentYearMonth,
      accountName: currentShopName,
      platform: '支付宝',
      endBalance,
      lastMonthBalance,
      currentCollection,
      currentExpense,
      withdraw,
      interest,
      calculatedBalance,
      checkDiff,
    };
  }, [zfbRows, currentYearMonth, currentShopName, beginningBalance, endingBalance]);

  useEffect(() => {
    fetchChannelData();
    fetchShops();
  }, []);

  useEffect(() => {
    if (onYearMonthChange && searchYearMonth) {
      onYearMonthChange(searchYearMonth.format('YYYY-MM'));
    }
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

  const detailColumns = [
    { title: '分类', dataIndex: 'category', key: 'category', width: 180 },
    { title: '对方账号', dataIndex: 'accountCode', key: 'accountCode', width: 200 },
    {
      title: '收入金额（元）',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 130,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontSize: 12 }}>{value?.toFixed(2) ?? '0.00'}</span>,
    },
    {
      title: '支出金额（元）',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      width: 130,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontSize: 12 }}>{value?.toFixed(2) ?? '0.00'}</span>,
    },
  ];

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
          .stat-table-compact tr td {
            padding: 4px 8px !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            height: 28px !important;
            white-space: nowrap !important;
          }
          .stat-table-compact tr th {
            padding: 6px 8px !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            white-space: nowrap !important;
          }
        `}</style>
        {/* 支付宝余额对账（顶部汇总表，逻辑与抖音一致） */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>支付宝余额对账</div>
        <Table
          className="stat-table-compact"
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
              width: 90,
              align: 'right' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{value?.toFixed(2)}</span>
              ),
            },
            {
              title: '本期费用',
              dataIndex: 'currentExpense',
              key: 'currentExpense',
              width: 90,
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
          dataSource={statModalVisible ? [zfbSummary] : []}
          rowKey="billMonth"
          loading={statLoading}
          size="small"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 'max-content' }}
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
                {/* 一、数据来源 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>一、数据来源（两个接口）</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      ① 明细 / 汇总 = 新接口 <code>POST /bill/zfb/detail-summary</code>（返回
                      <code>rows</code> / <code>total</code> / <code>startDate</code> / <code>endDate</code>）；
                    </div>
                    <div>
                      ② 余额（上月余额 / 期末余额）= 老接口 <code>GET /cost-category-stat</code>，只取
                      <code>PDD_LAST_BALANCE</code>（上月/期初）和 <code>PDD_BALANCE</code>（本月期末）两条的
                      <code>totalIncome</code>；接口未返回时回退 <code>queryEndingBalance</code>。
                    </div>
                  </div>
                </li>

                {/* 二、余额对账表 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>二、余额对账表（顶部汇总表）字段</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      <strong>本期收款</strong> = 「收款」分类的收入金额 + 支出金额（明细汇总 rows 按分类归类）。
                    </div>
                    <div>
                      <strong>提现</strong> = 「提现」分类的收入金额 + 支出金额。
                    </div>
                    <div>
                      <strong>结息</strong> = 「结息」分类的收入金额 + 支出金额。
                    </div>
                    <div>
                      <strong>本期费用</strong> = 移除 收款 / 提现 / 结息 后，其余分类的收入金额 + 支出金额 之和。
                    </div>
                    <div><strong>上月余额</strong> = PDD_LAST_BALANCE.totalIncome；<strong>期末余额</strong> =
                      PDD_BALANCE.totalIncome（无则回退 queryEndingBalance）。
                    </div>
                  </div>
                </li>

                {/* 三、计算余额 / 校验 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>三、计算余额与校验</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div><strong>计算余额</strong> = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息</div>
                    <div><strong>校验</strong> = 计算余额 - 期末余额；|值| &lt; 0.001 显示绿色 0.00，否则红色实际差异</div>
                  </div>
                </li>

                {/* 四、账单明细汇总 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>四、账单明细汇总表（下方明细表）</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>· 列：分类（document_type）、对方账号、收入金额、支出金额，来自接口 rows。</div>
                    <div>· 底部合计行取接口 total（收入 / 支出全量合计）。</div>
                    <div>· 收入金额 / 支出金额为固定列，横向滚动时保持可见。</div>
                  </div>
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>账单明细汇总</div>
        <Table
          className="stat-table-compact"
          columns={detailColumns}
          dataSource={statModalVisible ? zfbRows : []}
          rowKey={(record, index) => `${record.category}-${record.accountCode}-${index}`}
          loading={statLoading}
          size="small"
          style={{ fontSize: 12 }}
          scroll={{ x: 'max-content' }}
          pagination={false}
          summary={
            zfbRows.length > 0
              ? () => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} align="left">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {zfbTotal?.category || '总计'}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="left">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {zfbTotal?.accountCode || ''}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {zfbIncomeTotal.toFixed(2)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {zfbExpenseTotal.toFixed(2)}
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

export default ZfbExtendCostBase;
