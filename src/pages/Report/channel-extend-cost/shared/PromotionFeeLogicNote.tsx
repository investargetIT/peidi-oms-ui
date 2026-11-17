import React from 'react';

export interface PromotionFeeLogicNoteProps {
  /** 「站内推广费用名称」的平台口径说明 */
  promotionName: string;
  /** 平台额外说明（可选） */
  extra?: React.ReactNode;
}

/**
 * 「计算逻辑说明」中的推广费口径（各渠道费用统计共用，放在各自说明的 <ul> 内）。
 *
 * ⚠️ 这里把 infoName 强匹配规则写进说明面板，避免后续维护者误以为可以按数组下标取数。
 */
const PromotionFeeLogicNote: React.FC<PromotionFeeLogicNoteProps> = ({ promotionName, extra }) => (
  <li style={{ marginBottom: 2 }}>
    <strong>推广费：</strong>取 cost-category-stat 返回中 infoName 不为 null 的推广费行，按 infoName
    强匹配标准字段、按 accountName 分组展示；该月无数据时显示空态。
    <div style={{ marginLeft: 16, lineHeight: 1.8 }}>
      <div>· 站内推广费用名称：{promotionName}。</div>
      <div>
        · <strong>数据来源：</strong>cost-category-stat 中 infoName 不为 null 的行；原有费用分类行
        infoName 为 null，不参与推广费。
      </div>
      <div>
        · <strong>强匹配（重要，勿按数组顺序取数）：</strong>
        推广费字段一律按 infoName 精确匹配标准字段，接口返回顺序 /
        条数不固定；匹配时只做别名归一和全角冒号 「：」→ 半角「:」归一，别名对应关系如下：
      </div>
      <ul style={{ margin: '2px 0', paddingLeft: 18 }}>
        <li>
          <code>上月余额</code> ← 上月余额 / 期初余额
        </li>
        <li>
          <code>本月收入:充值金额</code> ← 本月收入:充值金额 / 本期充值 / 充值金额 / 推广费-充值金额
        </li>
        <li>
          <code>本月支出:推广费合计</code> ← 本月支出:推广费合计 / 本月支出:消耗金额 / 本期消耗 /
          推广费合计 / 推广费-非赠款消耗
        </li>
        <li>
          <code>期末余额</code> ← 期末余额
        </li>
      </ul>
      <div>
        · 匹配不到的 infoName 会原样追加到末尾（不丢字段）；只有 infoName 缺失时才用 businessCode
        兜底，且必须排除 PDD_BALANCE / PDD_LAST_BALANCE —— 这两个历史余额行的 businessDesc
        同样是「期末余额」，不能用 businessDesc 或这两行判定推广费。
      </div>
      <div>
        · 列顺序：上月余额 → 期末余额 → 本月收入 → 本月支出 → 计算余额 → 校验；「本月收入 /
        本月支出」列名按平台口径展示：拼多多/京东 = 本月收入:充值金额 / 本月支出：消耗金额，天猫 =
        本期充值 / 本期消耗，抖音 = 推广费-充值金额 / 推广费-非赠款消耗。
      </div>
      <div>
        · 计算余额 = 上月余额 + 本月收入:充值金额 - 本月支出:推广费合计；校验 = 计算余额 -
        期末余额（|值| &lt; 0.001 显示绿色 0.00，否则红色实际差异）。
      </div>
      <div>
        · 天猫多账户按接口 accountName 分组（为 null 视为单账户）；「账号名称」列仅 天猫 /
        天猫支付宝展示，取店铺名称，其它平台没有该列。缺失字段按 0
        参与计算，期末余额缺失时校验显示「-」。
      </div>
      {extra ? <div>· {extra}</div> : null}
    </div>
  </li>
);

export default PromotionFeeLogicNote;
