import React from 'react';
import { Table } from 'antd';
import {
  PROMOTION_FIELD_ORDER,
  computePromotionBalance,
  getPromotionDisplayName,
  getPromotionFieldNames,
  hasPromotionData,
  type PromotionFeeGroup,
} from '../common/promotionFee';

export interface PromotionFeeBlockProps {
  /** 按 accountName 分组后的推广费数据 */
  groups: PromotionFeeGroup[];
  /** 账单月份 yyyy-MM（表格「月份」列） */
  yearMonth?: string;
  /** 平台（表格「平台」列，如 拼多多 / 天猫 / 抖音 / 京东） */
  platform?: string;
  /** 区块标题，默认「推广费」 */
  title?: string;
  /** 加载中 */
  loading?: boolean;
  /** 透传给表格的 className（复用各弹窗的紧凑样式） */
  className?: string;
  style?: React.CSSProperties;
  /** 无数据时的空态文案 */
  emptyText?: React.ReactNode;
}

/** 金额展示：0 也要正常展示为 0.00，缺失才显示 - */
function formatAmount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '-';
}

/**
 * 「各平台推广费」展示区块（弹窗 / 各渠道费用统计共用）
 *
 * - **始终渲染**：即使该月接口没有返回推广费行，也保留区块位置 + 表头，
 *   用空态文案说明「本月无推广费数据」，避免使用者不知道有这个栏目。
 * - 表格前置 4 列：月份 / 平台 / 站内推广费用名称 / 账号名称。
 *   站内推广费用名称按平台强匹配（拼多多=推广费、抖音=巨量千川服务费、京东=京准通），
 *   天猫/支付宝由接口返回（accountName），不强匹配。
 * - 列按 infoName 动态生成，不假设固定条数：统一字段按固定顺序在前，
 *   未知字段按首次出现顺序追加；无数据时展示统一字段的表头。
 * - 末尾固定追加「计算余额 / 校验」两列：
 *   计算余额 = 上月余额 + 本月收入:充值金额 - 本月支出:推广费合计；
 *   校验 = 计算余额 - 期末余额，|差异| < 0.001 显示绿色 0.00，否则红色。
 * - 天猫多账户按 accountName 分组；accountName 为 null 视为单账户。
 */
const PromotionFeeBlock: React.FC<PromotionFeeBlockProps> = ({
  groups,
  yearMonth = '',
  platform = '',
  title = '推广费',
  loading = false,
  className,
  style,
  emptyText = '本月无推广费数据',
}) => {
  const hasData = hasPromotionData(groups);
  // 无数据时也展示统一字段的表头，让使用者一眼知道这个栏目有哪些口径
  const fields = hasData ? getPromotionFieldNames(groups) : [...PROMOTION_FIELD_ORDER];
  const columns = [
    {
      title: '月份',
      key: 'billMonth',
      width: 80,
      render: () => <span style={{ fontSize: 12, fontWeight: 'bold' }}>{yearMonth || '-'}</span>,
    },
    {
      title: '平台',
      key: 'platform',
      width: 80,
      render: () => <span style={{ fontSize: 12, fontWeight: 'bold' }}>{platform || '-'}</span>,
    },
    {
      // 拼多多/抖音/京东按平台强匹配；天猫/支付宝取接口返回的 accountName
      title: '站内推广费用名称',
      key: 'promotionName',
      width: 170,
      render: (_: unknown, group: PromotionFeeGroup) => (
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
          {getPromotionDisplayName(platform, group.accountName) || '-'}
        </span>
      ),
    },
    {
      title: '账号名称',
      key: 'accountName',
      width: 150,
      render: (_: unknown, group: PromotionFeeGroup) => (
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>{group.accountName ?? '单账户'}</span>
      ),
    },
    ...fields.map((field) => ({
      title: field,
      key: field,
      width: 160,
      align: 'left' as const,
      render: (_: unknown, group: PromotionFeeGroup) => (
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
          {formatAmount(group.values[field])}
        </span>
      ),
    })),
    {
      // 计算余额 = 上月余额 + 本月收入:充值金额 - 本月支出:推广费合计
      title: '计算余额',
      key: 'calculatedBalance',
      width: 130,
      align: 'left' as const,
      render: (_: unknown, group: PromotionFeeGroup) => (
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
          {formatAmount(computePromotionBalance(group.values).calculatedBalance)}
        </span>
      ),
    },
    {
      // 校验 = 计算余额 - 期末余额；|差异| < 0.001 视为平衡（绿 0.00）
      title: '校验',
      key: 'checkDiff',
      width: 100,
      align: 'left' as const,
      render: (_: unknown, group: PromotionFeeGroup) => {
        const { checkDiff } = computePromotionBalance(group.values);
        if (checkDiff === null) {
          return <span style={{ fontSize: 12, fontWeight: 'bold' }}>-</span>;
        }
        const isBalanced = Math.abs(checkDiff) < 0.001;
        return (
          <span
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: isBalanced ? 'green' : 'red',
            }}
          >
            {isBalanced ? '0.00' : checkDiff.toFixed(2)}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ marginBottom: 16, ...style }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {title}
        {!loading && !hasData && (
          <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>（本月无数据）</span>
        )}
      </div>
      <Table
        className={className}
        columns={columns}
        dataSource={hasData ? groups : []}
        rowKey="key"
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: 'max-content' }}
        style={{ fontSize: 12 }}
        locale={{ emptyText }}
      />
    </div>
  );
};

export default PromotionFeeBlock;
