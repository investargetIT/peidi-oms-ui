import { Button, Card, Flex, Input, Modal } from 'antd';
import React, { useState } from 'react';

export type InvoiceModalRef = {
  showModal: (type: 'reject' | 'approve') => void;
};

const InvoiceAuditModal = React.forwardRef((props, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 卡片类型
  const [cardType, setCardType] = useState('reject');

  // 卡片详情内容 标签-值 响应式
  const [cardDetail, setCardDetail] = useState([
    {
      label: '申请编号',
      value: 'APP001',
    },
    {
      label: '开票客户',
      value: '北京火星',
    },
    {
      label: '订单数量',
      value: '3个',
    },
    {
      label: '合计金额',
      value: '￥146.00',
    },
  ]);

  const showModal = (type: 'reject' | 'approve') => {
    setCardType(type);
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  React.useImperativeHandle(ref, () => ({
    showModal,
  }));

  return (
    <Modal
      title={cardType === 'reject' ? '审核驳回' : '审核通过'}
      closable={{ 'aria-label': 'Custom Close Button' }}
      open={isModalOpen}
      footer={[
        <Button onClick={handleCancel}>取消</Button>,
        cardType === 'reject' ? (
          <Button type="primary" danger>
            确认驳回
          </Button>
        ) : (
          <></>
        ),
        cardType === 'approve' ? <Button type="primary">确认通过</Button> : <></>,
      ]}
    >
      <div style={{ color: '#737373', marginBottom: '24px' }}>
        {cardType === 'reject' ? '确认驳回此开票申请吗？请填写驳回原因。' : ''}
        {cardType === 'approve' ? '确认通过此开票申请吗？' : ''}
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

      {cardType === 'reject' ? (
        <div>
          <div style={{ color: '#0a0a0a', fontSize: '14px', fontWeight: 'bold' }}>驳回原因</div>
          <Input.TextArea
            placeholder="请输入驳回原因..."
            style={{
              width: '100%',
              height: '120px',
            }}
          />
        </div>
      ) : (
        <></>
      )}
    </Modal>
  );
});

export default InvoiceAuditModal;
