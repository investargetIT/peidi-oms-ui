import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Card, Flex, Modal } from 'antd';
import React, { useEffect, useImperativeHandle, useState } from 'react';
import type { DataType } from '../index';

export interface InvoiceModalRef {
  showModal: () => void;
}

interface InvoiceModalProps {
  selectedRows: DataType[];
}

const InvoiceModal = React.forwardRef<InvoiceModalRef, InvoiceModalProps>(
  (props: InvoiceModalProps, ref: React.Ref<InvoiceModalRef> | undefined) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 卡片详情内容 标签-值 响应式
    const [cardDetail, setCardDetail] = useState([
      {
        label: '订单数量',
        value: '3个',
      },
      {
        label: '合计金额',
        value: '￥146.00',
      },
      {
        label: '开票客户',
        value: '北京火星',
      },
    ]);

    useEffect(() => {
      setCardDetail([
        {
          label: '订单数量',
          value: `${props.selectedRows.length}个`,
        },
        {
          label: '合计金额',
          value: `￥${
            props.selectedRows.length > 0
              ? props.selectedRows
                  .reduce((acc, cur) => acc + Number(cur.totalPrice.replace('¥', '')), 0)
                  .toFixed(2)
              : '0.00'
          }`,
        },
        {
          label: '开票客户',
          value: props.selectedRows[0]?.custom,
        },
      ]);
    }, [props.selectedRows]);

    const showModal = () => {
      setIsModalOpen(true);
    };

    const handleOk = () => {
      setIsModalOpen(false);
    };

    const handleCancel = () => {
      setIsModalOpen(false);
    };

    useImperativeHandle(ref, () => ({
      showModal,
    }));

    return (
      <Modal
        title="确认开票信息"
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="确认提交"
      >
        <div style={{ color: '#737373' }}>请确认以下订单信息，确认后将提交开票申请</div>

        <div
          style={{
            color: '#737373',
            border: '1px solid #73737350',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '24px',
          }}
        >
          <ExclamationCircleOutlined style={{ marginRight: 8, color: '#000000' }} />
          所有选中的订单必须属于同一客户才能开票
        </div>

        <div style={{ marginTop: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          已选择订单
        </div>

        <Card
          style={{
            marginBottom: '36px',
          }}
          styles={{
            body: {
              padding: '12px',
            },
          }}
        >
          {cardDetail.map((item) => (
            <Flex
              key={item.label}
              align="center"
              justify="space-between"
              style={{ marginBottom: '6px' }}
            >
              <div style={{ color: '#737373' }}>{item.label}:</div>
              <div
                style={{
                  fontSize: item.label === '开票客户' ? '18px' : '16px',
                  fontWeight: 'bold',
                }}
              >
                {item.value}
              </div>
            </Flex>
          ))}
        </Card>
      </Modal>
    );
  },
);

export default InvoiceModal;
