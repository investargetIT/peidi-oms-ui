import React, { useMemo, useState } from 'react';
import { Collapse, Modal, Table, message } from 'antd';
import dayjs from 'dayjs';
import ChannelExtendCostApi, {
  type FinanceJdCostStatVo,
  type FinanceJd1CalculateStatVo,
  type FinanceJd2ExpenseStatVo,
} from '@/services/channelExtendCostApi';
import { displayShopName } from '../common/shopNameMap';
import ChannelExtendCostBase from '../shared/ChannelExtendCostBase';
import JdBatchExportButton from './BatchExportButton';

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
  // 跟踪 Base 搜索栏当前选中的年月，供「批量导出」按钮展示当前月份
  const [exportYearMonth, setExportYearMonth] = useState<string>(
    dayjs().subtract(1, 'month').format('YYYY-MM'),
  );
  // 京东费用统计弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [currentShopName, setCurrentShopName] = useState<string>('');
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [jd2Data, setJd2Data] = useState<FinanceJd2ExpenseStatVo[]>([]);
  const [jd1Data, setJd1Data] = useState<FinanceJd1CalculateStatVo[]>([]);
  // 新增：上月末日明细（6/30 之类的结转凭证）、上月期初/期末余额
  const [lastMonthJd1CalculateStat, setLastMonthJd1CalculateStat] = useState<
    FinanceJd1CalculateStatVo[]
  >([]);
  const [lastMonthBeginningBalance, setLastMonthBeginningBalance] = useState<number | null>(null);
  const [lastMonthEndingBalance, setLastMonthEndingBalance] = useState<number | null>(null);

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
        setLastMonthJd1CalculateStat(data.lastMonthJd1CalculateStat || []);
        setLastMonthBeginningBalance(data.lastMonthBeginningBalance ?? null);
        setLastMonthEndingBalance(data.lastMonthEndingBalance ?? null);
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
    setLastMonthJd1CalculateStat([]);
    setLastMonthBeginningBalance(null);
    setLastMonthEndingBalance(null);
    setModalVisible(true);
    fetchJdStat(params.shopId, params.yearMonth);
    return true; // 已处理，Base 不再弹默认统计弹窗
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setJd1Data([]);
    setJd2Data([]);
    setLastMonthJd1CalculateStat([]);
    setLastMonthBeginningBalance(null);
    setLastMonthEndingBalance(null);
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
  // 后端返回：jd1CalculateStat（当月每日明细）+ lastMonthJd1CalculateStat（上月末日单日明细）
  // 合并后按 billDate 倒序（最新在前；6/30 自然落到最后一行），再 pivot：
  //   [{ billDate, [业务描述1]: 值, [业务描述2]: 值, ..., total: 总计 }, ...]
  // 每一行 = 一个账单日期；列 = 数据里出现过的 businessDesc
  const { pivotedJd1Data, jd1BusinessDescList, jd1ScrollX } = useMemo(() => {
    // 合并当月 + 上月末日（保持原顺序：先当月后上月，便于业务列按"先出现"顺序排）
    const combined: FinanceJd1CalculateStatVo[] = [...jd1Data, ...lastMonthJd1CalculateStat];
    // 按 billDate 倒序：日期字符串用 localeCompare 即可（YYYY-MM-DD 字典序 == 时间序）
    combined.sort((a, b) => (b.billDate || '').localeCompare(a.billDate || ''));

    const rowMap = new Map<string, Record<string, any>>();
    // 用数组保序 + Set 去重，保证列的出现顺序与数据中首次出现顺序一致
    const descOrder: string[] = [];
    const descSeen = new Set<string>();

    combined.forEach((item) => {
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
    // 显式标注数组元素类型，避免 spread 丢失 Record<string, any> 索引签名
    const pivoted: (Record<string, any> & { total: number })[] = Array.from(rowMap.values()).map(
      (row) => {
        const sum = descOrder.reduce(
          (acc, desc) => acc + (typeof row[desc] === 'number' ? row[desc] : 0),
          0,
        );
        return { ...row, total: sum };
      },
    );

    // 横向滚动宽度 = 账单日期(110) + 业务列数 × 130 + 总计(130)
    const scrollX = 240 + 130 * descOrder.length;

    return {
      pivotedJd1Data: pivoted,
      jd1BusinessDescList: descOrder,
      jd1ScrollX: scrollX,
    };
  }, [jd1Data, lastMonthJd1CalculateStat]);

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

  // 当月最后一天（如 2026-07-31）：用于排除总计行
  // 6/30 不会和 7/31 冲突，所以 lastMonthJd1CalculateStat 那行仍会进总计行
  const lastDayOfCurrentMonth = useMemo(
    () =>
      currentYearMonth ? dayjs(`${currentYearMonth}-01`).endOf('month').format('YYYY-MM-DD') : '',
    [currentYearMonth],
  );

  // "总计行"：每列 = 所有数据（pivotedJd1Data）的列总和，不受分页影响
  // 排除当月最后一天（如 7/31），但保留上月末日（6/30）
  const jd1SummaryRow = useMemo(() => {
    const filtered = lastDayOfCurrentMonth
      ? pivotedJd1Data.filter((r) => r.billDate !== lastDayOfCurrentMonth)
      : pivotedJd1Data;
    const sums: Record<string, number> = {};
    jd1BusinessDescList.forEach((desc) => {
      sums[desc] = filtered.reduce(
        (acc, row) => acc + (typeof row[desc] === 'number' ? row[desc] : 0),
        0,
      );
    });
    // 总计列的总和 = 过滤后所有行"总计"列的累加
    sums.total = filtered.reduce(
      (acc, row) => acc + (typeof row.total === 'number' ? row.total : 0),
      0,
    );
    return sums;
  }, [pivotedJd1Data, jd1BusinessDescList, lastDayOfCurrentMonth]);

  // 京东余额对账
  // 本月入账 = 京东账单收支计算列表(总计行的总计)
  //         - 京东钱包支出分类统计的几个扣减项之和
  // 扣减项：提现、京东联盟、违约金、其他、价保、直赔代扣、售后、先行赔付、挽单补偿险、逆向价保险
  // TODO: 这 10 项写死，等后端补"哪些分类需要扣"配置后改用配置
  const DEDUCT_CATEGORIES = [
    '提现',
    '京东联盟',
    '违约金',
    '其他',
    '价保',
    '直赔代扣',
    '售后',
    '先行赔付',
    '挽单补偿险',
    '逆向价保险',
    '运营服务费',
  ];

  // 收款 = A − 直赔代扣 − 违约金 − 价保 − 售后 − 先行赔付
  // A = 京东账单收支计算列表(总计行)里 7 个业务描述的合计
  // 扣减项里 "直赔代扣/违约金/价保/售后/先行赔付" 来自京东钱包支出分类统计
  // 注："价保扣款" 当前后端 jd1CalculateStat 还没返回，写在这等后续补上后自动生效
  const COLLECTION_A_CATEGORIES = [
    '代收配送费',
    '货款',
    '价保扣款',
    '平台券价保补贴',
    '平台券价保补贴佣金',
    '售后卖家赔付费',
    '综合违约金',
  ];
  const COLLECTION_DEDUCT_CATEGORIES = ['直赔代扣', '违约金', '价保', '售后', '先行赔付'];

  // 本期费用 = (代收白条网络推广技术服务费 + 交易服务费 + 随单送的京豆
  //           + 运费保险服务费 + 价保返佣 + 佣金 + 直营服务费) − 京东联盟
  // 前 7 项是 jd1（账单收支）"总计行"对应列的纵向合计，
  // "京东联盟"末尾没有"总计的"前缀，按现有约定取 jd2 钱包支出分类里的单值
  const EXPENSE_JD1_CATEGORIES = [
    '代收白条网络推广技术服务费',
    '交易服务费',
    '随单送的京豆',
    '运费保险服务费',
    '价保返佣',
    '佣金',
    '直营服务费',
  ];
  const EXPENSE_JD2_CATEGORIES = ['京东联盟', '运营服务费'];

  const jdBalanceSummary = useMemo(() => {
    // 取 jd2 透视后那 1 行（pivotedJd2Data[0]），从中拿 5 个扣减项的金额
    const jd2Row = pivotedJd2Data[0] || {};
    const deductSum = DEDUCT_CATEGORIES.reduce(
      (sum, cat) => sum + (typeof jd2Row[cat] === 'number' ? jd2Row[cat] : 0),
      0,
    );
    // 本月入账 = jd1 总计行的总计 - 扣减项之和
    const currentMonthIn = (jd1SummaryRow.total || 0) - deductSum;

    // 收款 = A − 直赔代扣 − 违约金 − 价保 − 售后 − 先行赔付
    // A 来自 jd1 总计行各列；扣减项来自 jd2 钱包支出分类
    const collectionA = COLLECTION_A_CATEGORIES.reduce(
      (sum, desc) => sum + (typeof jd1SummaryRow[desc] === 'number' ? jd1SummaryRow[desc] : 0),
      0,
    );
    const collectionDeduct = COLLECTION_DEDUCT_CATEGORIES.reduce(
      (sum, cat) => sum + (typeof jd2Row[cat] === 'number' ? jd2Row[cat] : 0),
      0,
    );
    const collection = collectionA - collectionDeduct;

    // 本期费用 = 6 项 jd1 总计列之和 - jd2 京东联盟
    const expenseJd1Sum = EXPENSE_JD1_CATEGORIES.reduce(
      (sum, desc) => sum + (typeof jd1SummaryRow[desc] === 'number' ? jd1SummaryRow[desc] : 0),
      0,
    );
    const expenseJd2Value = EXPENSE_JD2_CATEGORIES.reduce(
      (sum, cat) => sum + (typeof jd2Row[cat] === 'number' ? jd2Row[cat] : 0),
      0,
    );
    const currentPeriodExpense = expenseJd1Sum - expenseJd2Value;

    // 上月余额 = API 的 lastMonthEndingBalance（即"上月末"余额）
    // 期末余额 = 上月余额 + 本月入账
    // API 的 lastMonthBeginningBalance 不再使用
    const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
    const lastMonthBalanceValue = lastMonthEndingBalance;
    const endingBalanceValue = safeNum(lastMonthEndingBalance) + currentMonthIn;
    const withdrawValue = typeof jd2Row['提现'] === 'number' ? jd2Row['提现'] : 0;

    // 校验 = 期末余额 − （上月余额 + 本期费用 + 收款 − 提现）
    // 提现取自 jd2 钱包支出分类统计里的「提现」分类金额
    // 样式与拼多多一致：|值| < 0.001 显示绿色 0.00，否则红色实际值，12px 加粗
    const checkSum =
      safeNum(endingBalanceValue) -
      (safeNum(lastMonthBalanceValue) + currentPeriodExpense + collection - safeNum(withdrawValue));

    return [
      {
        lastMonthBalance: lastMonthBalanceValue,
        endingBalance: endingBalanceValue,
        currentMonthIn,
        currentPeriodExpense,
        collection,
        checkSum,
      },
    ];
  }, [pivotedJd2Data, jd1SummaryRow, lastMonthEndingBalance]);

  // 校验列渲染：参考拼多多，|值| < 0.001 绿色 0.00，否则红色实际值
  const renderCheckSum = (value: number) => {
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
  };

  const jdBalanceColumns = useMemo(
    () => [
      {
        title: '上月余额',
        dataIndex: 'lastMonthBalance',
        key: 'lastMonthBalance',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
      {
        title: '期末余额',
        dataIndex: 'endingBalance',
        key: 'endingBalance',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
      {
        title: '本月入账',
        dataIndex: 'currentMonthIn',
        key: 'currentMonthIn',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
      {
        title: '本期费用',
        dataIndex: 'currentPeriodExpense',
        key: 'currentPeriodExpense',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
      {
        title: '收款',
        dataIndex: 'collection',
        key: 'collection',
        width: 130,
        align: 'left' as const,
        render: renderAmount,
      },
      {
        title: '校验',
        dataIndex: 'checkSum',
        key: 'checkSum',
        width: 130,
        align: 'left' as const,
        render: renderCheckSum,
      },
    ],
    [],
  );

  return (
    <>
      <ChannelExtendCostBase
        channel="京东"
        onCustomStatClick={handleCustomStatClick}
        onYearMonthChange={setExportYearMonth}
        extraActions={<JdBatchExportButton yearMonth={exportYearMonth} />}
      />

      <Modal
        title={
          currentShopName ? `${currentShopName} ${currentYearMonth} 京东费用统计` : '京东费用统计'
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
          /* 不参与总计行计算的数据行（如本月最后一天）：背景灰色标识 */
          .jd1-table-small tr.jd1-excluded-row > td {
            background: #f5f5f5 !important;
          }
          .jd1-table-small tr.jd1-excluded-row:hover > td {
            background: #ebebeb !important;
          }
        `}</style>

        {/* 计算逻辑说明：3 段表格的数据来源 + 本月入账的公式 */}
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
                  <strong>京东余额对账：</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div><strong>上月余额</strong> = 京东接口返回的上月末账户余额（lastMonthEndingBalance）</div>
                    <div><strong>期末余额</strong> = 上月余额 + 本月入账</div>
                    <div>
                      <strong>本月入账</strong> = 京东账单收支计算列表的合计 −
                      {DEDUCT_CATEGORIES.map((c) => c).join('、')}共
                      {DEDUCT_CATEGORIES.length} 项
                    </div>
                    <div>
                      <strong>本期费用</strong> = {EXPENSE_JD1_CATEGORIES.map((c) => `总计的${c}`).join(' + ')}
                      − {EXPENSE_JD2_CATEGORIES.join(' − ')}
                      <div style={{ marginLeft: 16 }}>
                        （前 {EXPENSE_JD1_CATEGORIES.length} 项取自账单收支计算列表「总计行」对应列的纵向合计；
                        {EXPENSE_JD2_CATEGORIES.join('、')}取自钱包支出分类统计）
                      </div>
                    </div>
                    <div>
                      <strong>收款</strong> = A − 直赔代扣 − 违约金 − 价保 − 售后 − 先行赔付
                    </div>
                    <div style={{ marginLeft: 16 }}>
                      A = {COLLECTION_A_CATEGORIES.map((c) => `账单收支总计行的${c}`).join(' + ')}；
                      扣减项取自钱包支出分类统计
                    </div>
                    <div>
                      <strong>校验</strong> = 期末余额 − （上月余额 + 本期费用 + 收款 − 提现），
                      提现取自钱包支出分类统计；|值| &lt; 0.001 显示绿色 0.00，否则红色显示实际差异
                    </div>
                  </div>
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong>京东钱包支出分类统计：</strong>
                  按钱包扣款的备注分类（提现、京东联盟、违约金等）展示每类本月共支出多少。
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong>京东账单收支计算列表：</strong>
                  按账单日期倒序展示本月的每一笔收支明细，每行是某一天的总览，每列是当天的某一类业务（如货款、佣金、交易服务费等）金额。
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong>表格最后一行：</strong>
                  是上个月最后一天（例 6 月 30 日）的结转凭证，把它也纳入对账便于和上月余额衔接。
                </li>
                <li style={{ marginBottom: 2 }}>
                  <strong>「总计行」：</strong>
                  所有日期的纵向合计，但会排除本月最后一天（例 7 月 31
                  日）；上月末日（6/30）正常参与合计。
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* 京东余额对账 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>京东余额对账</div>
        <Table
          columns={jdBalanceColumns}
          dataSource={jdBalanceSummary}
          rowKey={() => 'jd-balance'}
          loading={modalLoading}
          size="small"
          className="jd1-table-small"
          pagination={false}
          scroll={{ x: 130 * 6 }}
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
          {(jd1Data.length > 0 || lastMonthJd1CalculateStat.length > 0) && (
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
              （{pivotedJd1Data.length} 个日期 / {jd1Data.length + lastMonthJd1CalculateStat.length}{' '}
              条）
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
          // 第一行 = 本月最后一天（如 2026-07-31），已从总计行排除，背景标灰
          rowClassName={(record) =>
            record.billDate === lastDayOfCurrentMonth ? 'jd1-excluded-row' : ''
          }
          summary={
            pivotedJd1Data.length > 0
              ? () => (
                  <Table.Summary.Row style={{ background: '#fafafa' }} className="jd1-summary-row">
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
                    <Table.Summary.Cell index={jd1BusinessDescList.length + 1} align="left">
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
