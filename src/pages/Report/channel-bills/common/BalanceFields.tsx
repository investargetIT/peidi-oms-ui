import React from 'react';
import { InputNumber } from 'antd';

interface BalanceFieldsProps {
  /** 期初余额（元），null 表示未填 */
  beginningBalance: number | null;
  /** 期末余额（元），null 表示未填 */
  endingBalance: number | null;
  onBeginningBalanceChange: (value: number | null) => void;
  onEndingBalanceChange: (value: number | null) => void;
}

/**
 * 上传账单时的期初 / 期末余额输入（均为选填）。
 * 规则与后端一致：
 * - 填了（非空）-> 用传入值，覆盖库里已有余额；
 * - 不填 -> 不传该字段，后端沿用该「配置＋月份＋平台」已有余额（首次新建且未传记 0）；
 * - 想把余额改成 0，需显式填 0（不要留空）。
 */
const BalanceFields: React.FC<BalanceFieldsProps> = ({
  beginningBalance,
  endingBalance,
  onBeginningBalanceChange,
  onEndingBalanceChange,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: '#666' }}>期初余额（元）</span>
        <InputNumber
          style={{ width: '100%' }}
          value={beginningBalance}
          onChange={(v) => onBeginningBalanceChange(typeof v === 'number' ? v : null)}
          placeholder="选填，不填沿用已有余额"
          step={0.01}
          precision={2}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: '#666' }}>期末余额（元）</span>
        <InputNumber
          style={{ width: '100%' }}
          value={endingBalance}
          onChange={(v) => onEndingBalanceChange(typeof v === 'number' ? v : null)}
          placeholder="选填，不填沿用已有余额"
          step={0.01}
          precision={2}
        />
      </div>
    </div>
    <span style={{ fontSize: 12, color: '#999' }}>
      选填。不填即不传该字段，沿用库中已有余额（首次上传不填记 0）；填 0 会把余额覆盖成 0。
    </span>
  </div>
);

export default BalanceFields;
