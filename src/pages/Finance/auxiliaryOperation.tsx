import FinanceApi from '@/services/financeApi';
import { ShopOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Flex,
  Form,
  FormInstance,
  FormProps,
  Input,
  message,
  Modal,
  Space,
} from 'antd';
import React, { useRef, useState } from 'react';

const { Meta } = Card;

type OBAShopNewFieldType = {
  shopId: string;
  shopName: string;
};

const AuxiliaryOperation: React.FC = () => {
  const [isOBAShopNewModalOpen, setIsOBAShopNewModalOpen] = useState(false);
  const obaShopNewFormRef = useRef<FormInstance<OBAShopNewFieldType>>(null);
  const handleObaShopNewSubmit: () => void = async () => {
    // 先校验表单
    const values = await obaShopNewFormRef.current?.validateFields();
    if (!values) {
      return;
    }
    try {
      await FinanceApi.postObaCustomerNew(values);
      message.success('客户代码信息维护成功');
      handleObaShopNewCancel();
    } catch (error) {
      message.error('客户代码信息维护失败' + error);
    }
  };
  const handleObaShopNewCancel: () => void = () => {
    obaShopNewFormRef.current?.resetFields();
    setIsOBAShopNewModalOpen(false);
  };

  return (
    <>
      <div>
        <Space>
          <Card
            hoverable
            style={{ width: 180, borderColor: '#e8e8e8' }}
            onClick={() => setIsOBAShopNewModalOpen(true)}
          >
            <Flex align="center" justify="center" style={{ height: 80 }}>
              <ShopOutlined style={{ fontSize: 50 }} />
            </Flex>
            <Meta title="客户代码信息维护" style={{ textAlign: 'center' }} />
          </Card>
        </Space>
      </div>

      {/* 客户代码信息维护 */}
      <Modal
        title="客户代码信息维护"
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isOBAShopNewModalOpen}
        onOk={() => handleObaShopNewSubmit()}
        onCancel={() => handleObaShopNewCancel()}
      >
        <Form
          ref={obaShopNewFormRef}
          name="obaShopNewForm"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 600 }}
          initialValues={{ shopId: '', shopName: '' }}
          autoComplete="off"
        >
          <Form.Item<OBAShopNewFieldType>
            label="客户ID"
            name="shopId"
            rules={[{ required: true, message: '请输入客户ID' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<OBAShopNewFieldType>
            label="客户名称"
            name="shopName"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AuxiliaryOperation;
