import React, { useMemo, useState } from 'react';
import { Alert, Modal, Table, message } from 'antd';
import dayjs from 'dayjs';
import ChannelExtendCostApi, {
  type FinanceJdCostStatVo,
  type FinanceJd1CalculateStatVo,
  type FinanceJd2ExpenseStatVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';

// Alert 内 <code> 的内联样式：浅灰底、圆角、单色字色
const codeStyle: React.CSSProperties = {
  margin: '0 2px',
  padding: '0 4px',
  background: 'rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 3,
  fontSize: 12,
  fontFamily: 'Menlo, Consolas, monospace',
  color: '#444',
};

/**
 * 京东 - 渠道推广费用
 *
 * 列表复用 Base，调 /oms/finance/channel-extend-cost/group/page；
 * 「费用统计」按钮通过 onCustomStatClick 拦截，改为调
 *   GET /oms/finance/channel-extend-cost/jd-cost-stat
 * 请求参数：{ shopId, startDate, endDate }（start/end 取选中月份的月初/月末）
 * 响应：{ jd2ExpenseStat: 钱包支出分类, jd1CalculateStat: 账单收支计算 }
 */
const JdExtendCostPanel: React.FC = () => {
  // 京东费用统计弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [jd2Data, setJd2Data] = useState<FinanceJd2ExpenseStatVo[]>([]);
  const [jd1Data, setJd1Data] = useState<FinanceJd1CalculateStatVo[]>([]);

  // 按 yyyy-MM 算出当月 startDate / endDate
  const getMonthRange = (yearMonth: string) => {
    const m = dayjs(`${yearMonth}-01`);
    return {
      startDate: m.startOf('month').format('YYYY-MM-DD'),
      endDate: m.endOf('month').format('YYYY-MM-DD'),
    };
  };

  const fetchJdStat = async (shopId: number, yearMonth: string) => {
    setModalLoading(true);
    const { startDate, endDate } = getMonthRange(yearMonth);
    try {
      const res = await ChannelExtendCostApi.getJdCostStat({
        shopId,
        startDate,
        endDate,
      });
      if (res.code === 200) {
        const data: FinanceJdCostStatVo = res.data || ({} as FinanceJdCostStatVo);
        setJd2Data(data.jd2ExpenseStat || []);
        setJd1Data(data.jd1CalculateStat || []);
      } else if (res.code === 500) {
        message.error(typeof res.data === 'string' ? res.data : res.msg || '查询失败');
      } else {
        message.error(res.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询京东费用统计失败:', error);
      message.error('查询京东费用统计失败');
    } finally {
      setModalLoading(false);
    }
  };

  // 拦截 Base 的「费用统计」按钮：调京东自己的 getJdCostStat
  const handleCustomStatClick = (params: {
    wdtName: string | undefined;
    yearMonth: string | undefined;
    shopId: number | undefined;
    channel: string | undefined;
  }): boolean => {
    if (params.shopId === undefined || params.shopId === null) {
      message.error('该店铺没有 ID，无法查询');
      return true;
    }
    if (!params.yearMonth) {
      message.error('缺少月份信息');
      return true;
    }
    setCurrentShopName(displayShopName(params.wdtName) || '');
    setCurrentYearMonth(params.yearMonth);
    setJd1Data([]);
    setJd2Data([]);
    setModalVisible(true);
    fetchJdStat(params.shopId, params.yearMonth);
    return true; // 已处理，Base 不再弹默认统计弹窗
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setJd1Data([]);
    setJd2Data([]);
  };

  // 金额统一渲染：右对齐、12px 字号、保留 2 位小数
  const renderAmount = (value: number) => (
    <span style={{ fontSize: 12 }}>
      {value !== undefined && value !== null ? value.toFixed(2) : '-'}
    </span>
  );

  // 京东钱包支出分类统计 - 透视成「一行 N 列」
  // 后端返回：[{ remarkCategory, totalExpense }, ...]
  // 在前端 pivot 成：[{ [cat1]: 值, [cat2]: 值, ... }]（只有一行）
  // 每个 remarkCategory 当成表头，单行展示对应的支出金额
  const { pivotedJd2Data, jd2CategoryList, jd2ScrollX } = useMemo(() => {
    const row: Record<string, any> = {};
    const catOrder: string[] = [];
    const catSeen = new Set<string>();

    jd2Data.forEach((item) => {
      const cat = item.remarkCategory;
      if (cat) {
        // 同一分类可能多条，按金额累加
        const prev = typeof row[cat] === 'number' ? row[cat] : 0;
        row[cat] = prev + (item.totalExpense ?? 0);
        if (!catSeen.has(cat)) {
          catSeen.add(cat);
          catOrder.push(cat);
        }
      }
    });

    // 横向滚动宽度 = 列数 × 130
    const scrollX = 130 * catOrder.length;

    return {
      pivotedJd2Data: catOrder.length > 0 ? [row] : [],
      jd2CategoryList: catOrder,
      jd2ScrollX: scrollX,
    };
  }, [jd2Data]);

  // 京东钱包支出分类统计列：每个 remarkCategory 一列
  const jd2Columns = useMemo(
    () =>
      jd2CategoryList.map((cat) => ({
        title: cat,
        dataIndex: cat,
        key: cat,
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      })),
    [jd2CategoryList],
  );

  // 京东账单收支计算列表 - 动态列
  // 后端返回：[{ billDate, businessDesc, calculate }, ...]（227 条 = 多个日期 × 多个业务描述）
  // 在前端 pivot 成：[{ billDate, [业务描述1]: 值, [业务描述2]: 值, ..., total: 总计 }, ...]
  // 每一行 = 一个账单日期；列 = 数据里出现过的 businessDesc
  const { pivotedJd1Data, jd1BusinessDescList, jd1ScrollX } = useMemo(() => {
    const rowMap = new Map<string, Record<string, any>>();
    // 用数组保序 + Set 去重，保证列的出现顺序与数据中首次出现顺序一致
    const descOrder: string[] = [];
    const descSeen = new Set<string>();

    jd1Data.forEach((item) => {
      const date = item.billDate || '';
      if (!rowMap.has(date)) {
        rowMap.set(date, { billDate: date });
      }
      const row = rowMap.get(date)!;
      const desc = item.businessDesc;
      if (desc) {
        // 同一 (billDate, businessDesc) 可能出现多次，按金额累加
        const prev = typeof row[desc] === 'number' ? row[desc] : 0;
        row[desc] = prev + (item.calculate ?? 0);
        if (!descSeen.has(desc)) {
          descSeen.add(desc);
          descOrder.push(desc);
        }
      }
    });

    // 计算每行总计 = 该行所有业务描述列的金额之和
    const pivoted = Array.from(rowMap.values()).map((row) => {
      const sum = descOrder.reduce(
        (acc, desc) => acc + (typeof row[desc] === 'number' ? row[desc] : 0),
        0,
      );
      return { ...row, total: sum };
    });

    // 横向滚动宽度 = 账单日期(110) + 业务列数 × 130 + 总计(130)
    const scrollX = 240 + 130 * descOrder.length;

    return {
      pivotedJd1Data: pivoted,
      jd1BusinessDescList: descOrder,
      jd1ScrollX: scrollX,
    };
  }, [jd1Data]);

  // 京东账单收支计算列表列：账单日期 + 动态业务列 + 总计
  const jd1Columns = useMemo(
    () => [
      {
        title: '账单日期',
        dataIndex: 'billDate',
        key: 'billDate',
        width: 110,
        fixed: 'left' as const,
        align: 'left' as const,
        render: (text: string) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
      },
      ...jd1BusinessDescList.map((desc) => ({
        title: desc,
        dataIndex: desc,
        key: desc,
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      })),
      {
        // 总计列：固定右侧、加粗高亮
        title: '总计',
        dataIndex: 'total',
        key: 'total',
        width: 130,
        align: 'left' as const,
        fixed: 'right' as const,
        render: (value: number) => (
          <span style={{ fontSize: 12, fontWeight: 'bold' }}>
            {value !== undefined && value !== null ? value.toFixed(2) : '-'}
          </span>
        ),
      },
    ],
    [jd1BusinessDescList],
  );

  // "总计行"：每列 = 所有数据（pivotedJd1Data）的列总和，不受分页影响
  const jd1SummaryRow = useMemo(() => {
    const sums: Record<string, number> = {};
    jd1BusinessDescList.forEach((desc) => {
      sums[desc] = pivotedJd1Data.reduce(
        (acc, row) => acc + (typeof row[desc] === 'number' ? row[desc] : 0),
        0,
      );
    });
    // 总计列的总和 = 所有行"总计"列的累加（数学上 = 所有业务列总和的累加）
    sums.total = pivotedJd1Data.reduce(
      (acc, row) => acc + (typeof row.total === 'number' ? row.total : 0),
      0,
    );
    return sums;
  }, [pivotedJd1Data, jd1BusinessDescList]);

  // 京东余额对账：单行 1 列
  // 本月入账 = 京东账单收支计算列表(总计行的总计)
  //         - 京东钱包支出分类统计的几个扣减项之和
  // 扣减项：提现、京东联盟、违约金、其他、价保c（这 5 项写死，未来可改成配置驱动）
  // TODO: 5 个扣减项是写死的，等后端补"哪些分类需要扣"配置后改用配置
  const DEDUCT_CATEGORIES = ['提现', '京东联盟', '违约金', '其他', '价保c'];

  const jdBalanceSummary = useMemo(() => {
    // 取 jd2 透视后那 1 行（pivotedJd2Data[0]），从中拿 5 个扣减项的金额
    const jd2Row = pivotedJd2Data[0] || {};
    const deductSum = DEDUCT_CATEGORIES.reduce(
      (sum, cat) => sum + (typeof jd2Row[cat] === 'number' ? jd2Row[cat] : 0),
      0,
    );
    // 本月入账 = jd1 总计行的总计 - 扣减项之和
    const currentMonthIn = (jd1SummaryRow.total || 0) - deductSum;
    return [{ currentMonthIn }];
  }, [pivotedJd2Data, jd1SummaryRow.total]);

  const jdBalanceColumns = useMemo(
    () => [
      {
        title: '本月入账',
        dataIndex: 'currentMonthIn',
        key: 'currentMonthIn',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
    ],
    [],
  );

  return (
    <>
      <ChannelExtendCostBase channel="京东" onCustomStatClick={handleCustomStatClick} />

      <Modal
        title={
          currentShopName
            ? `${currentShopName} ${currentYearMonth} 京东费用统计`
            : '京东费用统计'
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={1500}
        destroyOnClose
        maskClosable={false}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <style>{`
          .jd1-table-small tr td {
            padding: 4px 8px !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            height: 28px !important;
            white-space: nowrap !important;
          }
          /* 表头：字号小一档、长列名自动换行、左对齐，确保所有列名完整可见 */
          .jd1-table-small tr th.ant-table-cell {
            padding: 6px 4px !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            white-space: normal !important;
            word-break: break-all !important;
            text-align: left !important;
            font-weight: 500 !important;
            background: #fafafa !important;
            vertical-align: middle !important;
          }
          /* 覆盖 antd v5 内层 div 的 nowrap + ellipsis，让长列名能完整换行展示 */
          .jd1-table-small tr th .ant-table-column-title {
            white-space: normal !important;
            word-break: break-all !important;
            text-overflow: clip !important;
            overflow: visible !important;
            display: block !important;
          }
        `}</style>

        {/* 计算逻辑说明：3 段表格的数据来源 + 本月入账的公式 */}
        <Alert
          type="info"
          showIcon
          message="计算逻辑说明"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
              <div style={{ marginBottom: 4 }}>
                <b>京东账单收支计算列表</b>：由后端
                <code style={codeStyle}>jd1CalculateStat</code>
                数组按「账单日期」分组透视而来；行 = 账单日期，列 = 该日期下出现过的各业务类型(businessDesc)，
                同行同列多次按金额累加；行末「总计」= 该行所有业务列金额之和，最末「总计行」= 全部数据列纵向求和。
              </div>
              <div style={{ marginBottom: 4 }}>
                <b>京东钱包支出分类统计</b>：由后端
                <code style={codeStyle}>jd2ExpenseStat</code>
                数组按「备注分类(remarkCategory)」透视而来；单行展示每个分类的总支出金额。
              </div>
              <div>
                <b>京东余额对账</b>：本月入账 =
                <code style={codeStyle}>京东账单收支计算列表(总计行的总计)</code>
                −
                <code style={codeStyle}>京东钱包支出分类统计(提现 + 京东联盟 + 违约金 + 其他 + 价保c)</code>
                ，扣减项为写死配置，后续可由后端配置项驱动。
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 京东余额对账 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          京东余额对账
        </div>
        <Table
          columns={jdBalanceColumns}
          dataSource={jdBalanceSummary}
          rowKey={() => 'jd-balance'}
          loading={modalLoading}
          size="small"
          className="jd1-table-small"
          pagination={false}
          scroll={{ x: 130 }}
          style={{ marginBottom: 24 }}
        />

        {/* 京东钱包支出分类统计 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          京东钱包支出分类统计
          {jd2CategoryList.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （{jd2CategoryList.length} 个分类）
            </span>
          )}
        </div>
        <Table
          columns={jd2Columns}
          dataSource={pivotedJd2Data}
          rowKey={() => 'jd2-summary'}
          loading={modalLoading}
          size="small"
          className="jd1-table-small"
          pagination={false}
          scroll={{ x: jd2ScrollX }}
          style={{ marginBottom: 24 }}
        />

        {/* 京东账单收支计算列表 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          京东账单收支计算列表
          {jd1Data.length > 0 && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （{pivotedJd1Data.length} 个日期 / {jd1Data.length} 条）
            </span>
          )}
        </div>
        <Table
          columns={jd1Columns}
          dataSource={pivotedJd1Data}
          rowKey="billDate"
          loading={modalLoading}
          size="small"
          className="jd1-table-small"
          scroll={{ x: jd1ScrollX }}
          pagination={false}
          summary={
            pivotedJd1Data.length > 0
              ? () => (
                  <Table.Summary.Row
                    style={{ background: '#fafafa' }}
                    className="jd1-summary-row"
                  >
                    {/* 账单日期列：总计标签 */}
                    <Table.Summary.Cell index={0} align="left">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>总计</span>
                    </Table.Summary.Cell>
                    {/* 业务描述列：每列总和 */}
                    {jd1BusinessDescList.map((desc, idx) => (
                      <Table.Summary.Cell key={desc} index={idx + 1} align="left">
                        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                          {jd1SummaryRow[desc].toFixed(2)}
                        </span>
                      </Table.Summary.Cell>
                    ))}
                    {/* 总计列：所有行总计的总和 */}
                    <Table.Summary.Cell
                      index={jd1BusinessDescList.length + 1}
                      align="left"
                    >
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {jd1SummaryRow.total.toFixed(2)}
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

export default JdExtendCostPanel;
