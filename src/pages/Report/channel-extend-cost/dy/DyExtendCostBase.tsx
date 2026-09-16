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
  Tooltip,
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
import { dyBizDescOf, dyColumnMetaOf, sortDyRowsByCategory } from './dyFeeMapping';

/**
 * 可省略的业务描述单元格：
 * 文字超出单元格宽度时显示省略号；始终用 Tooltip 包裹，鼠标悬停展示完整内容。
 * （不做溢出测量，避免因表格布局/时机导致 Tooltip 不触发，保证稳定生效。）
 */
const EllipsisTooltipCell: React.FC<{ title?: string }> = ({ title }) => {
  const content = title || '-';
  return (
    <Tooltip title={title || '-'} mouseEnterDelay={0.2}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 'bold',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {content}
      </span>
    </Tooltip>
  );
};

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
  const [channelPagination, setChannelPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
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
  const [searchYearMonth, setSearchYearMonth] = useState<Dayjs | null>(
    dayjs().subtract(1, 'month'),
  );

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
    // 明细表最右侧已有「收入金额（入账）」「支出金额（出账）」固定两列，
    // 后端返回的明细项「动账金额」「收入金额」「支出金额」与之重复/冗余，这里过滤掉不再单独展示。
    const collect = (detailName: string | undefined) => {
      if (!detailName) return;
      if (detailName === '动账金额' || detailName === '收入金额' || detailName === '支出金额')
        return;
      if (!seen.has(detailName)) {
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

  // 每个分类的“纯收支”元信息（业务描述（分类别）除 小额打款 / 提现 外判断）：
  //   pure = 除「收入金额（入账）/ 支出金额（出账）」外，其余明细列（含 订单净收入 及各费用列）均为 0，
  //          （“收入金额 / 支出金额 / 动账金额”明细项已被列名集过滤，不参与判断）
  //   orderNetIncome = 该分类在「订单净收入」列展示 / 汇总的有效值：
  //       小额打款 → 首层 value；
  //       纯收支分类 → 收入金额（入账）＝首层 value 为正的部分；
  //       其余（含 提现）→ details 里「订单净收入」原值。
  const dyCategoryMeta = useMemo(() => {
    const map = new Map<string, { pure: boolean; orderNetIncome: number }>();
    const detailValue = (cat: FinanceDyCostStatVo, name: string) => {
      const d = (cat.details || []).find((x) => x.name === name);
      return d && typeof d.value === 'number' ? d.value : 0;
    };
    dyStatData.forEach((cat) => {
      const name = cat.name || '';
      if (name === '小额打款') {
        map.set(name, {
          pure: false,
          orderNetIncome: typeof cat.value === 'number' ? cat.value : 0,
        });
        return;
      }
      if (name === '提现') {
        map.set(name, { pure: false, orderNetIncome: detailValue(cat, '订单净收入') });
        return;
      }
      const pure = dyDetailColumnNames.every((col) => Math.abs(detailValue(cat, col)) < 1e-9);
      const incomeAmount = typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
      map.set(name, {
        pure,
        orderNetIncome: pure ? incomeAmount : detailValue(cat, '订单净收入'),
      });
    });
    return map;
  }, [dyStatData, dyDetailColumnNames]);

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
        // 小额打款：订单净收入取首层 value（注意非 details 里的「订单净收入」值）
        if (detailName === '订单净收入' && record.name === '小额打款') {
          const v = typeof record.value === 'number' ? record.value : 0;
          return <span style={{ fontSize: 12 }}>{v.toFixed(2)}</span>;
        }
        // 纯收支分类（除 小额打款 / 提现，其余明细列均为 0）：订单净收入 = 收入金额（入账）
        if (detailName === '订单净收入' && record.name && dyCategoryMeta.get(record.name)?.pure) {
          const v = typeof record.value === 'number' && record.value > 0 ? record.value : 0;
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
          const v = typeof record.value === 'number' ? record.value : 0;
          return <span style={{ fontSize: 12 }}>{v < 0 ? v.toFixed(2) : '0.00'}</span>;
        },
      },
    );
    return cols;
  }, [dyDetailColumnNames, dyCategoryMeta]);

  // 动态明细列按「费用分类」分组，形成 2 层表头：费用分类 → 列名。
  // 「管报名称」不再单独占一层表头：当前映射下它与列名相同（或与费用分类相同，如 订单净收入），
  // 无额外信息；dyFeeMapping 仍保留 mgmtName 字段，将来若出现不同值可恢复该层。
  // 相邻同费用分类的列合并为一个组头；映射之外的新列不显示组头（留空）。
  const dyFeeColumnGroups = useMemo(() => {
    const groups: { feeType: string; cols: any[] }[] = [];
    dyFeeColumns.forEach((col: any) => {
      const meta = dyColumnMetaOf(col.title as string);
      const last = groups[groups.length - 1];
      if (last && last.feeType === meta.feeType) {
        last.cols.push(col);
      } else {
        groups.push({ feeType: meta.feeType, cols: [col] });
      }
    });
    return groups.map((g) => ({
      title: g.feeType,
      key: `fee-type-${g.feeType}-${g.cols[0].key}`,
      align: 'center' as const,
      children: g.cols,
    }));
  }, [dyFeeColumns]);

  // 明细行按「分类」分组排序（推广费用 → 平台费用 → 其他，组内保持接口原序），
  // 使相同 分类/管报名称 的行相邻，仅影响展示顺序，不影响合计 / 余额对账等求和口径
  const dyDetailRows = useMemo(() => sortDyRowsByCategory(dyStatData), [dyStatData]);

  // 「分类 / 管报名称」rowSpan 元信息：排序后按相邻同值分段，
  // 段首行 rowSpan = 段长、其余行 rowSpan = 0（隐藏）。
  // 管报名称的分段额外要求分类相同，避免合并单元格跨分类。
  const dyRowSpans = useMemo(() => {
    const buildSpans = (getVal: (r: FinanceDyCostStatVo) => string) => {
      const spans: number[] = dyDetailRows.map(() => 0);
      let start = 0;
      while (start < dyDetailRows.length) {
        let end = start + 1;
        while (
          end < dyDetailRows.length &&
          getVal(dyDetailRows[end]) === getVal(dyDetailRows[start])
        )
          end++;
        spans[start] = end - start;
        start = end;
      }
      return spans;
    };
    return {
      category: buildSpans((r) => dyBizDescOf(r.name).category),
      mgmtName: buildSpans((r) => {
        const meta = dyBizDescOf(r.name);
        return `${meta.category}|${meta.mgmtName}`;
      }),
    };
  }, [dyDetailRows]);

  // 抖音费用统计各明细列纵向合计（每列 = 所有分类该列金额之和），
  // 作为表格的合计行展示，便于核对"汇总各费用项"。
  const dyStatSummaryRow = useMemo(() => {
    const acc: Record<string, number> = {};
    let incomeSum = 0;
    let expenseSum = 0;
    dyStatData.forEach((cat) => {
      (cat.details || []).forEach((d) => {
        // 「动账金额」「收入金额」「支出金额」明细项与最右侧固定列重复，不计入列合计
        if (d.name === '动账金额' || d.name === '收入金额' || d.name === '支出金额') return;
        if (d.name && typeof d.value === 'number') {
          // 订单净收入特殊口径：
          //   小额打款 → 取首层 value；
          //   纯收支分类 → 收入金额（入账）＝首层 value 为正的部分；
          //   其余 → details 原值
          let detailValue = d.value;
          if (d.name === '订单净收入' && cat.name === '小额打款') {
            detailValue = typeof cat.value === 'number' ? cat.value : 0;
          } else if (d.name === '订单净收入' && cat.name && dyCategoryMeta.get(cat.name)?.pure) {
            detailValue = typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
          }
          acc[d.name] = (acc[d.name] || 0) + detailValue;
        }
      });
      const v = typeof cat.value === 'number' ? cat.value : 0;
      if (v > 0) incomeSum += v;
      if (v < 0) expenseSum += v;
    });
    // 右端两列合计
    acc['收入金额'] = incomeSum;
    acc['支出金额'] = expenseSum;
    return acc;
  }, [dyStatData, dyCategoryMeta]);

  // 汇总费用表（只取 平台费用 / 推广费用 两类）：
  // 行两类来源，行的数据取支出金额、列的数据取当列总计：
  //   1) 首层分类（业务描述（分类别））映射后属于 平台费用 / 推广费用：
  //      支出金额 = 该分类「支出金额（出账）」= 首层 value 为负的部分（保留负号），非负计 0
  //   2) 动态明细费用列中费用分类（列维度映射）为 平台费用 / 推广费用：
  //      支出金额 = 该列的纵向合计（当列总计，即合计行对应列的值）
  // 排序：平台费用 → 推广费用（组间固定顺序）；组内先首层分类行、后费用列行，保持出现顺序。
  const dyExpenseSummaryRows = useMemo(() => {
    const rows: {
      key: string;
      category: string;
      mgmtName: string;
      desc: string;
      amount: number;
    }[] = [];
    // 1) 首层分类行：行的数据取支出金额（出账）
    dyStatData.forEach((cat) => {
      const name = cat.name || '';
      if (!name) return;
      const meta = dyBizDescOf(name);
      if (meta.category !== '平台费用' && meta.category !== '推广费用') return;
      const v = typeof cat.value === 'number' ? cat.value : 0;
      rows.push({
        key: `biz-${name}`,
        category: meta.category,
        mgmtName: meta.mgmtName,
        desc: name,
        amount: v < 0 ? v : 0,
      });
    });
    // 2) 费用列行：列的数据取当列总计
    dyDetailColumnNames.forEach((col) => {
      const meta = dyColumnMetaOf(col);
      if (meta.feeType !== '平台费用' && meta.feeType !== '推广费用') return;
      rows.push({
        key: `col-${col}`,
        category: meta.feeType,
        mgmtName: meta.mgmtName,
        desc: col,
        amount: typeof dyStatSummaryRow[col] === 'number' ? dyStatSummaryRow[col] : 0,
      });
    });
    // 组间排序：平台费用 → 推广费用（sort 为稳定排序，组内顺序不变）
    const categoryOrder: Record<string, number> = { 平台费用: 0, 推广费用: 1 };
    return rows.sort((a, b) => (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9));
  }, [dyStatData, dyDetailColumnNames, dyStatSummaryRow]);

  // 汇总费用表「分类 / 管报名称」rowSpan 元信息（相邻同值分段，段首 rowSpan = 段长，其余 0）
  const dyExpenseRowSpans = useMemo(() => {
    const buildSpans = (getVal: (r: (typeof dyExpenseSummaryRows)[number]) => string) => {
      const spans: number[] = dyExpenseSummaryRows.map(() => 0);
      let start = 0;
      while (start < dyExpenseSummaryRows.length) {
        let end = start + 1;
        while (
          end < dyExpenseSummaryRows.length &&
          getVal(dyExpenseSummaryRows[end]) === getVal(dyExpenseSummaryRows[start])
        )
          end++;
        spans[start] = end - start;
        start = end;
      }
      return spans;
    };
    return {
      category: buildSpans((r) => r.category),
      mgmtName: buildSpans((r) => `${r.category}|${r.mgmtName}`),
    };
  }, [dyExpenseSummaryRows]);

  // 抖音余额对账（最上面的汇总表）：
  //   本期收款 = 订单净收入（details 中「订单净收入」项）各分类之和（订单净收入合计）
  //   本期费用 = 合计的平台服务费 + 合计的佣金 + 合计的服务商佣金 + 合计的招商服务费
  //             + 合计的站外推广费（均保留负号）
  //             + 除 小额打款 / 提现 外的各「纯收支」分类（其余明细列均为 0）的
  //               支出金额（出账，首层 value 为负的部分，保留负号）
  //   期末余额 / 上月余额 = 老接口 cost-category-stat 内联余额项（无则回退 queryEndingBalance）
  //   提现 = 业务描述（分类别）为「提现」那一行的支出金额（出账）；结息 = 默认 0
  //   计算余额 = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
  //   校验     = 计算余额 - 期末余额
  const dySummary = useMemo(() => {
    // 本期收款 = 订单净收入合计（所有分类 details 中「订单净收入」项之和）
    //   小额打款 → 取首层 value；
    //   纯收支分类 → 收入金额（入账）＝首层 value 为正的部分；
    //   其余 → details 原值
    let incomeTotal = 0;
    dyStatData.forEach((cat) => {
      if (cat.name === '小额打款') {
        if (typeof cat.value === 'number') {
          incomeTotal += cat.value;
        }
        return;
      }
      if (cat.name && dyCategoryMeta.get(cat.name)?.pure) {
        incomeTotal += typeof cat.value === 'number' && cat.value > 0 ? cat.value : 0;
        return;
      }
      const net = (cat.details || []).find((d) => d.name === '订单净收入');
      if (net && typeof net.value === 'number') {
        incomeTotal += net.value;
      }
    });

    // 本期费用：
    //   1) 五项费用列的纵向合计，均保留负号（平台服务费 / 佣金 / 服务商佣金 / 招商服务费 / 站外推广费）
    //   2) 一般规则：除 小额打款 / 提现 外，「纯收支」分类（其余明细列均为 0）的
    //      支出金额（出账）＝首层 value 为负的部分（保留负号）计入本期费用
    const asNegative = (n: number | undefined) => {
      if (typeof n !== 'number') return 0;
      return n < 0 ? n : -n;
    };
    let expenseTotal = 0;
    ['平台服务费', '佣金', '服务商佣金', '招商服务费', '站外推广费'].forEach((key) => {
      expenseTotal += asNegative(dyStatSummaryRow[key]);
    });
    const outgoOf = (cat: FinanceDyCostStatVo | undefined) =>
      cat && typeof cat.value === 'number' && cat.value < 0 ? cat.value : 0;
    dyStatData.forEach((cat) => {
      if (!cat.name || cat.name === '小额打款' || cat.name === '提现') return;
      if (dyCategoryMeta.get(cat.name)?.pure) {
        expenseTotal += outgoOf(cat);
      }
    });
    //   3) 兼容：上门取件 / 退换货运费险 / 充值基础保证金 / 消费者赔付
    //      若未命中「纯收支」（罕见），仍单独把支出金额（出账）计入本期费用
    ['上门取件-支付快递费', '退换货运费险', '充值基础保证金', '消费者赔付'].forEach(
      (categoryName) => {
        const cat = dyStatData.find((c) => c.name === categoryName);
        const meta = cat ? dyCategoryMeta.get(categoryName) : undefined;
        if (cat && !(meta && meta.pure)) {
          expenseTotal += outgoOf(cat);
        }
      },
    );

    const safeNum = (n: number | null | undefined) => (typeof n === 'number' ? n : 0);
    const lastMonthBalance = safeNum(beginningBalance);
    const endBalance = safeNum(endingBalance);
    const currentCollection = incomeTotal;
    const currentExpense = expenseTotal; // 本期费用 = 五费用列合计 + 各纯收支分类的支出金额（出账）
    // 提现 = 业务描述（分类别）为「提现」那一行的支出金额（出账）：
    //   即该分类动账金额（首层 value）为负的部分（保留负号），非负则计 0
    const withdrawCat = dyStatData.find((c) => c.name === '提现');
    const withdrawValue = typeof withdrawCat?.value === 'number' ? withdrawCat.value : 0;
    const withdraw = withdrawCat ? (withdrawValue < 0 ? withdrawValue : 0) : 0;
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
  }, [
    dyStatData,
    currentYearMonth,
    currentShopName,
    beginningBalance,
    endingBalance,
    dyCategoryMeta,
    dyStatSummaryRow,
  ]);

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
          /* 抖音费用明细表：加深边框（默认 #f0f0f0 太浅，合并单元格多时看不清行列） */
          .dy-detail-table .ant-table-cell {
            border-color: #bfbfbf !important;
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
                {/* 一、数据来源 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>一、数据来源（两个接口）</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      ① 明细表 / 余额对账明细 = 新接口 <code>GET /dy-cost-stat</code>（返回
                      <code>
                        name / value / details[{'{'}name,value{'}'}]
                      </code>
                      ）；
                    </div>
                    <div>
                      ② 余额（上月余额 / 期末余额）= 老接口 <code>GET /cost-category-stat</code>
                      ，只取
                      <code>PDD_LAST_BALANCE</code>（上月/期初）和 <code>PDD_BALANCE</code>
                      （本月期末）两条的
                      <code>totalIncome</code>；接口未返回时回退 <code>queryEndingBalance</code>。
                    </div>
                  </div>
                </li>

                {/* 二、明细表列结构与归类映射 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>二、明细表列结构与归类映射</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      固定 3 列：<strong>分类、管报名称、业务描述（分类别）</strong>
                      ＝接口首层 name。其中 分类 / 管报名称
                      按下方【行维度映射】由业务描述（分类别）归类， 映射硬编码在{' '}
                      <code>dy/dyFeeMapping.ts</code>（弹窗与批量导出共用，改映射只改这一处）。
                    </div>
                    <div style={{ margin: '4px 0' }}>
                      <strong>【行维度映射】业务描述（分类别）→ 分类 / 管报名称</strong>
                      <table
                        style={{
                          borderCollapse: 'collapse',
                          marginLeft: 16,
                          fontSize: 12,
                          background: '#fff',
                        }}
                      >
                        <thead>
                          <tr>
                            {['业务描述（分类别）', '分类', '管报名称'].map((h) => (
                              <th
                                key={h}
                                style={{ border: '1px solid #d9d9d9', padding: '2px 8px' }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['上门取件-支付快递费', '平台费用', '运费争议赔付'],
                            ['消费者赔付', '平台费用', '赔付'],
                            ['退换货运费险', '平台费用', '运费险'],
                            ['评价有礼', '推广费用', '评价有礼'],
                            ['其他所有业务描述（兜底）', '其他', '其他'],
                          ].map((r) => (
                            <tr key={r[0]}>
                              {r.map((c, i) => (
                                <td
                                  key={i}
                                  style={{ border: '1px solid #d9d9d9', padding: '2px 8px' }}
                                >
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <strong>行序与合并</strong>：明细行按分类分组排序（推广费用 → 平台费用 →
                      其他，组内保持接口原序）；相同 分类 / 管报名称
                      的相邻单元格合并展示（管报名称的合并不跨分类）。排序仅影响展示顺序，
                      不影响各列合计与余额对账等求和口径。
                    </div>
                    <div>
                      后接【动态明细列】：取所有分类 details 的 name 去重并集，
                      <code>订单净收入</code> 固定为第一个 （即整体第 4
                      列），其余按出现顺序；值取该分类 details 里对应项的值，
                      列宽超出显示省略号（悬停 Tooltip 看全称）。
                    </div>
                    <div style={{ margin: '4px 0' }}>
                      <strong>【列维度映射】动态明细列 → 费用分类（表头上方组头）</strong>
                      <table
                        style={{
                          borderCollapse: 'collapse',
                          marginLeft: 16,
                          fontSize: 12,
                          background: '#fff',
                        }}
                      >
                        <thead>
                          <tr>
                            {['动态明细列', '费用分类组头'].map((h) => (
                              <th
                                key={h}
                                style={{ border: '1px solid #d9d9d9', padding: '2px 8px' }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['订单净收入', '其他'],
                            ['平台服务费', '平台费用'],
                            ['佣金 / 服务商佣金 / 招商服务费 / 站外推广费', '推广费用'],
                            ['映射之外的新列（后端 details 出现新费用项）', '不显示组头（留空）'],
                          ].map((r) => (
                            <tr key={r[0]}>
                              {r.map((c, i) => (
                                <td
                                  key={i}
                                  style={{ border: '1px solid #d9d9d9', padding: '2px 8px' }}
                                >
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      注：列维度映射中还维护了「管报名称」字段，当前它与列名相同（订单净收入的与其费用分类相同），
                      无额外信息，因此表头只保留费用分类一层组头；将来若出现不同值，可在该层之下恢复管报名称层。
                    </div>
                    <div>
                      最右侧固定 2 列：收入金额（入账）、支出金额（出账）。 后端 details
                      中的「动账金额」「收入金额」「支出金额」三项明细已从列名中滤除（与最右侧两列含义重复）。
                    </div>
                  </div>
                </li>

                {/* 三、列取值口径 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>三、列取值口径</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      <strong>收入金额（入账）</strong> = 该分类首层 value &gt; 0 的部分，否则 0
                    </div>
                    <div>
                      <strong>支出金额（出账）</strong> = 该分类首层 value &lt; 0
                      的部分（保留负号），否则 0
                    </div>
                    <div>
                      <strong>订单净收入</strong>（分三种情况，须先判断分类名）：
                      <div style={{ marginLeft: 16 }}>
                        <div>
                          · <strong>小额打款</strong>：订单净收入 = 首层 value（注意：非 details
                          里的值）；
                        </div>
                        <div>
                          · <strong>纯收支分类</strong>（见第五点，除 小额打款 / 提现
                          外）：订单净收入 = 收入金额（入账）；
                        </div>
                        <div>
                          · <strong>其余分类（含 提现）</strong>：订单净收入 = details
                          里「订单净收入」原值。
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                {/* 四、合计行 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>四、合计行</strong>＝每列所有分类的纵向相加。
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>· 订单净收入合计：按第三点“订单净收入”的分情况口径汇总；</div>
                    <div>
                      · 收入金额（入账）合计 = 各分类首层 value 正数之和； 支出金额（出账）合计 =
                      各分类首层 value 负数之和。
                    </div>
                  </div>
                </li>

                {/* 五、纯收支分类 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>五、纯收支分类（除 小额打款 / 提现）</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      定义：某分类除「收入金额（入账）/ 支出金额（出账）」外，其余明细列 （含
                      订单净收入 及全部费用列）均为 0，即后端未给出任何费用拆分。
                    </div>
                    <div>
                      规则：<strong>订单净收入 = 收入金额（入账）</strong>（首层 value
                      为正的部分，否则 0）； 且该分类的<strong>支出金额（出账）</strong>（首层 value
                      为负的部分，保留负号） 计入<strong>本期费用</strong>。
                    </div>
                    <div>
                      典型如：上门取件-支付快递费 / 退换货运费险 / 充值基础保证金 / 消费者赔付
                      等纯支出项。
                    </div>
                  </div>
                </li>

                {/* 六、余额对账 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>六、余额对账表（顶部汇总表）字段</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      <strong>本期收款</strong> = 订单净收入合计（同一口径：小额打款取首层 value、
                      纯收支分类取收入金额（入账）、其余取 details 原值）。
                    </div>
                    <div>
                      <strong>本期费用</strong> = 平台服务费 + 佣金 + 服务商佣金 + 招商服务费 +
                      站外推广费（五列的合计，保留负号）+ 除 小额打款 / 提现
                      外各「纯收支」分类的支出金额（出账）。
                    </div>
                    <div>
                      <strong>上月余额</strong> = PDD_LAST_BALANCE.totalIncome；
                      <strong>期末余额</strong> = PDD_BALANCE.totalIncome（无则回退
                      queryEndingBalance）。
                    </div>
                    <div>
                      <strong>提现</strong> = 「提现」分类行的支出金额（出账）；
                      <strong>结息</strong>：默认 0。
                    </div>
                  </div>
                </li>

                {/* 七、计算余额 / 校验 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>七、计算余额与校验</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      <strong>计算余额</strong> = 上月余额 + 本期收款 + 本期费用 + 提现 + 结息
                    </div>
                    <div>
                      <strong>校验</strong> = 计算余额 - 期末余额；|值| &lt; 0.001 显示绿色
                      0.00，否则红色实际差异
                    </div>
                  </div>
                </li>

                {/* 八、汇总费用表 */}
                <li style={{ marginBottom: 6 }}>
                  <strong>八、汇总费用表（平台费用 + 推广费用）</strong>
                  <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
                    <div>
                      仅取 分类 为<strong>平台费用 / 推广费用</strong>
                      的数据，行分两类来源（行的数据取支出金额，列的数据取当列总计）：
                    </div>
                    <div>
                      · <strong>首层分类行</strong>（业务描述（分类别）映射后属于平台费用 /
                      推广费用）：支出金额 = 该分类「支出金额（出账）」＝ 首层 value
                      为负的部分（保留负号）；
                    </div>
                    <div>
                      · <strong>费用列行</strong>（动态明细列的费用分类属于平台费用 /
                      推广费用，如 平台服务费 / 佣金 / 服务商佣金 / 招商服务费 / 站外推广费）：
                      支出金额 = 该列的纵向合计（当列总计）。
                    </div>
                    <div>
                      行序：平台费用 → 推广费用；组内先首层分类行、后费用列行（保持出现顺序）；
                      相同 分类 / 管报名称 的相邻单元格合并。
                    </div>
                    <div>
                      <strong>合计</strong> = 本表各行支出金额之和（只含 平台费用 / 推广费用，
                      不含 提现 等其他分类，与明细表「支出金额（出账）」列总计不同）。
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* 汇总费用：只取 平台费用 / 推广费用；行取支出金额（出账）/ 费用列当列总计，合计 = 本表各行支出金额之和 */}
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          汇总费用
          <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal', marginLeft: 8 }}>
            （仅含 平台费用 / 推广费用；首层分类行取「支出金额（出账）」，费用列行取「当列总计」；
            合计 = 本表各行支出金额之和）
          </span>
        </div>
        <Table
          columns={[
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 90,
              render: (_: any, record: any, index: number) => ({
                children: (
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>{record.category}</span>
                ),
                props: { rowSpan: dyExpenseRowSpans.category[index] },
              }),
            },
            {
              title: '管报名称',
              dataIndex: 'mgmtName',
              key: 'mgmtName',
              width: 110,
              render: (_: any, record: any, index: number) => ({
                children: <span style={{ fontSize: 12 }}>{record.mgmtName}</span>,
                props: { rowSpan: dyExpenseRowSpans.mgmtName[index] },
              }),
            },
            {
              title: '业务描述（分类别）',
              dataIndex: 'desc',
              key: 'desc',
              width: 180,
              render: (text: string) => <EllipsisTooltipCell title={text} />,
            },
            {
              title: '支出金额',
              dataIndex: 'amount',
              key: 'amount',
              align: 'left' as const,
              render: (value: number) => (
                <span style={{ fontSize: 12 }}>
                  {typeof value === 'number' ? value.toFixed(2) : '0.00'}
                </span>
              ),
            },
          ]}
          dataSource={statModalVisible ? dyExpenseSummaryRows : []}
          rowKey="key"
          loading={statLoading}
          size="small"
          bordered
          className="stat-table-small dy-detail-table"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          summary={
            dyExpenseSummaryRows.length > 0
              ? () => (
                  <Table.Summary.Row className="dy-stat-summary-row">
                    {/* 合计：跨「分类 + 管报名称 + 业务描述（分类别）」三列；支出金额 = 本表各行支出金额之和 */}
                    <Table.Summary.Cell index={0} align="left" colSpan={3}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>合计</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="left">
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {dyExpenseSummaryRows
                          .reduce((acc, r) => acc + (typeof r.amount === 'number' ? r.amount : 0), 0)
                          .toFixed(2)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              : undefined
          }
        />

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
            // 分类、管报名称：按 dyFeeMapping 的硬编码映射由「业务描述（分类别）」归类，
            // 未映射的业务描述兜底为 其他/其他；明细行已按分类分组排序，
            // 相同 分类/管报名称 的相邻行通过 rowSpan 合并展示
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 90,
              fixed: 'left' as const,
              render: (_: any, record: FinanceDyCostStatVo, index: number) => ({
                children: (
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                    {dyBizDescOf(record.name).category}
                  </span>
                ),
                props: { rowSpan: dyRowSpans.category[index] },
              }),
            },
            {
              title: '管报名称',
              dataIndex: 'mgmtReportName',
              key: 'mgmtReportName',
              width: 110,
              fixed: 'left' as const,
              render: (_: any, record: FinanceDyCostStatVo, index: number) => ({
                children: <span style={{ fontSize: 12 }}>{dyBizDescOf(record.name).mgmtName}</span>,
                props: { rowSpan: dyRowSpans.mgmtName[index] },
              }),
            },
            {
              title: '业务描述（分类别）',
              dataIndex: 'name',
              key: 'name',
              width: 180,
              fixed: 'left' as const,
              render: (text: string) => <EllipsisTooltipCell title={text} />,
            },
            ...dyFeeColumnGroups,
          ]}
          dataSource={statModalVisible ? dyDetailRows : []}
          rowKey={(record, index) => `${record.name}-${index}`}
          loading={statLoading}
          size="small"
          bordered
          className="stat-table-small dy-detail-table"
          style={{ fontSize: 12, marginBottom: 16 }}
          pagination={false}
          scroll={{ x: 420 + dyDetailColumnNames.length * 120 + 200 }}
          summary={
            dyStatData.length > 0
              ? () => (
                  <Table.Summary.Row className="dy-stat-summary-row">
                    {/*
                      注意：Table.Summary.Cell 的 index 必须传「真实列下标」，
                      rc-table 会按列定义自动给合计行单元格应用 fixed-left/right 的 sticky 偏移。
                      首格 colSpan={3} 占了 分类/管报名称/业务描述（分类别） 3 列，
                      因此后续单元格 index 要从 3 开始，最后两列才能正确命中 fixed-right。
                    */}
                    {/* 合计：跨「分类 + 管报名称 + 业务描述（分类别）」三列 */}
                    <Table.Summary.Cell index={0} align="left" colSpan={3}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>合计</span>
                    </Table.Summary.Cell>
                    {dyDetailColumnNames.map((detailName, idx) => (
                      <Table.Summary.Cell key={detailName} index={idx + 3} align="right">
                        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                          {dyStatSummaryRow[detailName] !== undefined
                            ? dyStatSummaryRow[detailName].toFixed(2)
                            : '0.00'}
                        </span>
                      </Table.Summary.Cell>
                    ))}
                    <Table.Summary.Cell
                      key="收入金额"
                      index={dyDetailColumnNames.length + 3}
                      align="right"
                    >
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {dyStatSummaryRow['收入金额']?.toFixed(2) ?? '0.00'}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell
                      key="支出金额"
                      index={dyDetailColumnNames.length + 4}
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
