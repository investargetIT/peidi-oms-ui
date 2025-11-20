import { Button, Card, Flex, Input, Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import { InvoiceAuditItem } from '../PendingReview';

export type InvoiceModalRef = {
  showModal: (type: 'reject' | 'approve') => void;
  initData: (dataSource: InvoiceAuditItem) => void;
  handleCancel: () => void;
};

// props 定义
export type InvoiceAuditModalProps = {
  postInvoiceApp: (data: any[], status: number) => void;
};

const InvoiceAuditModal = React.forwardRef(
  (props: InvoiceAuditModalProps, ref: React.Ref<InvoiceModalRef>) => {
    // 存放当前选中的卡片数据
    const [currentDataSource, setCurrentDataSource] = useState<InvoiceAuditItem>();

    const [isModalOpen, setIsModalOpen] = useState(false);
    // 卡片类型
    const [cardType, setCardType] = useState('reject');

    // 卡片详情内容 标签-值 响应式
    const [cardDetail, setCardDetail] = useState([
      {
        label: '申请编号',
        value: '',
      },
      {
        label: '开票客户',
        value: '',
      },
      {
        label: '订单数量',
        value: '',
      },
      {
        label: '不含税合计',
        value: '',
      },
      {
        label: '价税合计',
        value: '',
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

    // 初始化数据方法
    const initData = (dataSource: InvoiceAuditItem) => {
      console.log('currentDataSource', currentDataSource);
      setCurrentDataSource(dataSource);
    };

    // 监听 currentDataSource 变化，更新卡片详情
    useEffect(() => {
      if (currentDataSource) {
        setCardDetail([
          {
            label: '申请编号',
            value: currentDataSource.appNo || '',
          },
          {
            label: '开票客户',
            value: currentDataSource.customerCode || '',
          },
          {
            label: '订单数量',
            value: `${currentDataSource.recordList?.length || 0}个`,
          },
          {
            label: '不含税合计',
            value: `￥${currentDataSource.recordList
              ?.reduce((acc, cur) => acc + cur.taxExcludedAmount, 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
          {
            label: '价税合计',
            value: `￥${currentDataSource.recordList
              ?.reduce((acc, cur) => acc + cur.totalTaxAmount, 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        ]);
      }
    }, [currentDataSource]);

    // 审核驳回
    const handleReject = () => {
      if (currentDataSource) {
        props.postInvoiceApp(currentDataSource.recordList, 0);
      }
    };
    // 审核通过
    const handleApprove = () => {
      if (currentDataSource) {
        props.postInvoiceApp(currentDataSource.recordList, 2);
      }
    };

    React.useImperativeHandle(ref, () => ({
      showModal,
      initData,
      handleCancel,
    }));

    return (
      <Modal
        title={cardType === 'reject' ? '审核驳回' : '审核通过'}
        closable
        onCancel={handleCancel}
        open={isModalOpen}
        footer={[
          <Button onClick={handleCancel}>取消</Button>,
          cardType === 'reject' ? (
            <Button type="primary" danger onClick={handleReject}>
              确认驳回
            </Button>
          ) : (
            <></>
          ),
          cardType === 'approve' ? (
            <Button type="primary" onClick={handleApprove}>
              确认通过
            </Button>
          ) : (
            <></>
          ),
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

        {/* {cardType === 'reject' ? (
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
        )} */}
      </Modal>
    );
  },
);

export default InvoiceAuditModal;
