import React from 'react';
import { Button, Modal } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import StatModalTheme from './StatModalTheme';

export interface ModalTitleWithLogicProps {
  /** 弹窗原标题（如「店铺 月份 费用统计」） */
  title: React.ReactNode;
  /** 点击「计算逻辑说明」 */
  onOpenLogic: () => void;
}

/**
 * 费用统计弹窗标题：右侧放「计算逻辑说明」按钮，位置在弹窗关闭按钮左侧。
 * 通过 paddingRight 给右上角的关闭按钮留出空间，避免遮挡。
 */
export const ModalTitleWithLogic: React.FC<ModalTitleWithLogicProps> = ({ title, onOpenLogic }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingRight: 32,
    }}
  >
    <StatModalTheme />
    <span
      style={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </span>
    <Button
      size="small"
      icon={<InfoCircleOutlined style={{ fontSize: 12 }} />}
      style={{ fontSize: 12, height: 24, padding: '0 8px' }}
      onClick={onOpenLogic}
    >
      计算逻辑说明
    </Button>
  </div>
);

export interface LogicInfoModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}

/**
 * 「计算逻辑说明」弹窗（嵌套在费用统计弹窗内）。
 *
 * 各渠道说明内容仍是各自维护，这里只统一排版：
 * - 去掉原来内嵌 Collapse 的灰色底/紧凑字号，改为白底、13px、1.9 行高
 * - 一级条目之间加虚线分隔，嵌套列表缩进统一
 * - code / strong / 表格做轻量样式，长时间阅读不那么累
 * （原内容里写死的 background/padding/fontSize/lineHeight 用 !important 覆盖）
 */
export const LogicInfoModal: React.FC<LogicInfoModalProps> = ({
  open,
  onClose,
  title = '计算逻辑说明',
  width = 1100,
  children,
}) => (
  <Modal
    title={title}
    open={open}
    onCancel={onClose}
    footer={null}
    width={width}
    destroyOnClose
    styles={{ body: { padding: '16px 20px', maxHeight: '72vh', overflow: 'auto' } }}
  >
    <style>{`
      .logic-info-content {
        font-size: 13px;
        line-height: 1.9;
        color: #333;
      }
      .logic-info-content > div {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        font-size: 13px !important;
        line-height: 1.9 !important;
      }
      .logic-info-content ul {
        margin: 6px 0 !important;
        padding-left: 20px !important;
      }
      .logic-info-content li {
        margin-bottom: 8px !important;
      }
      .logic-info-content li > ul {
        margin: 4px 0 !important;
      }
      .logic-info-content > div > ul > li {
        padding-bottom: 10px;
        border-bottom: 1px dashed #f0f0f0;
      }
      .logic-info-content > div > ul > li:last-child {
        padding-bottom: 0;
        border-bottom: none;
      }
      .logic-info-content strong {
        color: #1f1f1f;
        font-weight: 600;
      }
      .logic-info-content code {
        background: #f5f5f5;
        border: 1px solid #eee;
        border-radius: 3px;
        padding: 1px 5px;
        color: #c41d7f;
        font-size: 12px;
      }
      .logic-info-content .ant-table {
        font-size: 12px;
        margin-top: 6px;
        margin-bottom: 6px;
      }
      .logic-info-content .ant-table-thead > tr > th {
        background: #fafafa;
      }
    `}</style>
    <div className="logic-info-content">{children}</div>
  </Modal>
);
