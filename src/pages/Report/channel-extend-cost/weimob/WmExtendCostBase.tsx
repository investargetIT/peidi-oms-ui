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
  type FinanceLedgerSummaryRowVo,
  type ShopVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';
import { WX_WM_MAPPING_ROWS } from '../common/wxWmCategoryConfig';
import { buildWmStat } from './batchStatBuilder';

export interface WmExtendCostBaseProps {
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

const WmExtendCostBase: React.FC<WmExtendCostBaseProps> = ({
  channel,
  extraActions,
  onYearMonthChange,
  onCustomStatClick,
}) => {
  // 后端 channel 编码：微盟=wm（其余=自身）。group/page、cost-category-stat 传编码；店铺搜索用中文
  const channelCode = channel === '微盟' ? 'wm' : channel;
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelDataSource, setChannelDataSource] = useState<FinanceChannelExtendCostItemVo[]>([]);
  const [channelPagination, setChannelPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [shopList, setShopList] = useState<ShopVo[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const [statModalVisible, setStatModalVisible] = useState(false);
  const [statModalTitle, setStatModalTitle] = useState('');
  const [statLoading, setStatLoading] = useState(false);
  const [wmStatData, setWmStatData] = useState<FinanceLedgerSummaryRowVo[]>([]);
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
  // 计算逻辑说明「业务类型映射」表格的搜索关键字
  const [feeTypeMappingSearch, setFeeTypeMappingSearch] = useState<string>('');

  const fetchShops = async () => {
    setShopsLoading(true);
    try {
      const params: any = {
        sortStr: '',
        // 微盟：channel = 微盟，platform = 微信
        searchStr: JSON.stringify([
          { searchName: 'channel', searchType: 'like', searchValue: '微盟' },
          { searchName: 'platform', searchType: 'like', searchValue: '微信' },
        ]),
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
        // channel 本地联调按后端排期传中文「微盟」（原 wm/编码），后端调整后可改回 channelCode
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
    const title = `${displayShopName(wdtName) || ''} ${yearMonth} 微盟费用统计`;
    setStatModalTitle(title);
    setWmStatData([]);
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

      // —— 流水汇总：新接口 /wm-cost-summary ——
      const statRes = await ChannelExtendCostApi.getWmCostSummary({ shopId, yearMonth });
      if (statRes.code !== 200) {
        message.error(typeof statRes.data === 'string' ? statRes.data : '获取统计数据失败');
        return;
      }
      setWmStatData(statRes.data || []);

      // —— 余额对账：老接口 /cost-category-stat 只取余额（与抖音 / 共享 Base 一致）——
      // channel 本地联调按后端排期传中文「微盟」（原 wm/编码），后端调整后可改回 channelCode
      const costRes = await ChannelExtendCostApi.getCostCategoryStat({ shopId, yearMonth, channel });
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
      console.error('获取微盟费用统计数据失败:', error);
      message.error('获取微盟费用统计数据失败');
    } finally {
      setStatLoading(false);
    }
  };

  // 微盟统计结果（余额对账 + 明细行），与批量导出共用 batchStatBuilder，保证口径一致。
  //   summary：本期收款=收入列之和、本期费用=支出列之和、期末/上月余额来自成本分类统计
  //   rows    ：按接口返回顺序平铺展示（分级字段由后端自带），不做排序/合并/映射
  const wmStatResult = useMemo(
    () =>
      buildWmStat({
        wmStatData,
        beginningBalance,
        endingBalance,
        yearMonth: currentYearMonth,
        shopName: currentShopName,
      }),
    [wmStatData, beginningBalance, endingBalance, currentYearMonth, currentShopName],
  );
  const wmSummary = wmStatResult.summary;
  const wmStatRows = wmStatResult;

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
          .stat-table-small tr.wm-stat-summary-row > td {
            background: #fafafa !important;
          }
        `}</style>

        {/* 微盟余额对账（与抖音 / 共享 Base 的站内外推广费统计列一致） */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>微盟余额对账</div>
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
          dataSource={statModalVisible ? [wmSummary] : []}
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
                {/* 〇、页面说明 */}
                <li style={{ marginBottom: 8 }}>
                  <strong>〇、页面说明</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>本页用于查看微盟店铺每月费用与余额，共两张表：<strong>微盟余额对账</strong>（顶部）与<strong>微盟费用统计</strong>（明细）。下方列明各项口径，供对账与核对。</div>
                  </div>
                </li>

                {/* 一、微盟费用统计（明细表） */}
                <li style={{ marginBottom: 8 }}>
                  <strong>一、微盟费用统计（明细表）</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>共 5 列：<strong>费用分类 / 分类 / 业务类型 / 收支类型 / 金额（元）</strong>，每行是一笔动账（业务类型 + 收入/支出）。</div>
                    <div><strong>归集规则</strong>：金额与归属分类默认采用系统（后台）返回值；同时支持按「业务类型（动账类型）→ 分类 / 费用分类」做自定义归集。
                      完整映射如下，可搜索 / 按费用分类筛选（如需调整，请维护人员修改公共配置 <code>common/wxWmCategoryConfig.ts</code>）。</div>
                    <div style={{ marginTop: 8 }}>
                      <Input
                        placeholder="搜索业务类型/分类/费用分类"
                        prefix={<SearchOutlined />}
                        allowClear
                        size="small"
                        style={{ width: 260, marginBottom: 8 }}
                        value={feeTypeMappingSearch}
                        onChange={(e) => setFeeTypeMappingSearch(e.target.value)}
                      />
                      <Table
                        size="small"
                        className="stat-table-small"
                        columns={[
                          {
                            title: '费用分类',
                            dataIndex: 'expenseCategory',
                            key: 'expenseCategory',
                            width: 100,
                            filters: Array.from(new Set(WX_WM_MAPPING_ROWS.map((it) => it.expenseCategory))).map(
                              (v) => ({ text: v, value: v }),
                            ),
                            onFilter: (value: React.Key | boolean, record: any) =>
                              record.expenseCategory === value,
                          },
                          {
                            title: '分类',
                            dataIndex: 'category',
                            key: 'category',
                            width: 100,
                          },
                          {
                            title: '业务类型',
                            dataIndex: 'businessType',
                            key: 'businessType',
                            width: 180,
                          },
                        ]}
                        dataSource={WX_WM_MAPPING_ROWS.filter(
                          (it) =>
                            !feeTypeMappingSearch ||
                            it.businessType.includes(feeTypeMappingSearch) ||
                            it.category.includes(feeTypeMappingSearch) ||
                            it.expenseCategory.includes(feeTypeMappingSearch),
                        )}
                        pagination={false}
                        scroll={{ y: 200 }}
                        style={{ background: '#fff' }}
                      />
                    </div>
                    <div>
                      <strong>展示上的合并</strong>：费用分类相同的行合并展示；「分类」仅在它所处的费用分类内合并，便于一眼看清每个分组。
                    </div>
                  </div>
                </li>

                {/* 二、金额口径 */}
                <li style={{ marginBottom: 8 }}>
                  <strong>二、金额口径</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>金额取系统返回值：<strong>收入为正数</strong>（绿色）、<strong>支出统一为负数</strong>（红色）。</div>
                  </div>
                </li>

                {/* 三、总计行 */}
                <li style={{ marginBottom: 8 }}>
                  <strong>三、总计行</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>末行「总计」= 本期收入合计 + 本期支出合计（净额）。支出为负数，因此总计 = 收入 − 支出，带 +/− 符号，正为绿、负为红；用于核对金额列是否加对。</div>
                  </div>
                </li>

                {/* 四、微盟余额对账 */}
                <li style={{ marginBottom: 8 }}>
                  <strong>四、微盟余额对账</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div><strong>期末余额</strong>（本月末）/ <strong>上月余额</strong>（期初）均来自系统余额返回；</div>
                    <div><strong>本期收款</strong> = 明细里 分类=收款 的收入与支出之和（收入为正、支出为负）；</div>
                    <div><strong>本期费用</strong> = 明细里 分类≠收款 且 分类≠提现 的收入与支出之和（收入为正、支出为负）；</div>
                    <div><strong>提现</strong> = 明细里 分类=提现 的收入与支出之和（收入为正、支出为负）；</div>
                    <div><strong>结息</strong>：本期暂不涉及，记为 0。</div>
                  </div>
                </li>

                {/* 五、计算余额与校验 */}
                <li style={{ marginBottom: 8 }}>
                  <strong>五、计算余额与校验</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div><strong>计算余额</strong> = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息（本期收款/本期费用/提现均已含收入与支出的正负号）。</div>
                    <div><strong>校验</strong> = 计算余额 − 期末余额：接近 0 表示账目对得上（显示 0.00 绿色），否则红色显示差异，便于发现不平。</div>
                  </div>
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          微盟费用统计
          {wmStatRows.rows.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              按 费用分类 / 分类 分组展示（与账单表 Sheet1 一致）
            </span>
          )}
        </div>
        <Table
          columns={[
            {
              title: '费用分类',
              dataIndex: 'expenseCategory',
              key: 'expenseCategory',
              width: 110,
              render: (text: string, _record: any, index: number) => {
                const span = wmStatRows.expCatSpan[index] ?? 1;
                if (span === 0) {
                  return { children: null, props: { rowSpan: 0 } };
                }
                return {
                  children: <span style={{ fontSize: 12, fontWeight: 'bold' }}>{text}</span>,
                  props: span > 1 ? { rowSpan: span } : undefined,
                };
              },
            },
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 100,
              render: (text: string, _record: any, index: number) => {
                const span = wmStatRows.catSpan[index] ?? 1;
                if (span === 0) {
                  return { children: null, props: { rowSpan: 0 } };
                }
                return {
                  children: <span style={{ fontSize: 12 }}>{text}</span>,
                  props: span > 1 ? { rowSpan: span } : undefined,
                };
              },
            },
            {
              title: '业务类型',
              dataIndex: 'businessType',
              key: 'businessType',
              width: 180,
              render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
            },
            {
              title: '收支类型',
              dataIndex: 'accountType',
              key: 'accountType',
              width: 100,
              render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
            },
            {
              title: '金额（元）',
              dataIndex: 'amount',
              key: 'amount',
              width: 120,
              align: 'right' as const,
              render: (value: number) => {
                const v = typeof value === 'number' ? value : 0;
                return (
                  <span style={{ fontSize: 12, fontWeight: 'bold', color: v > 0 ? '#389e0d' : v < 0 ? '#cf1322' : 'inherit' }}>
                    {v === 0 ? '0.00' : v.toFixed(2)}
                  </span>
                );
              },
            },
          ]}
          dataSource={statModalVisible ? wmStatRows.rows : []}
          rowKey={(record, index) => `${record.businessType}-${index}`}
          loading={statLoading}
          size="small"
          className="stat-table-small"
          pagination={false}
          scroll={{ x: 620 }}
          summary={
            wmStatRows.rows.length > 0 && wmStatRows.totalRow
              ? () => (
                  <Table.Summary.Row className="wm-stat-summary-row">
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {wmStatRows.totalRow!.businessType || '总计'}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: wmSummary.total >= 0 ? '#389e0d' : '#cf1322',
                        }}
                      >
                        {(wmSummary.total >= 0 ? '+' : '') + wmSummary.total.toFixed(2)}
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

export default WmExtendCostBase;
