import FinanceApi from '@/services/financeApi';
import { PlusOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Drawer,
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
import ShopInfo from './auxComponents/shopInfo';

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
      const res = await FinanceApi.postObaCustomerNew(values);
      if (res.code !== 200) {
        message.error('U9客户代码维护失败: ' + res.msg);
        return;
      }
      message.success('U9客户代码维护成功');
      handleObaShopNewCancel();
    } catch (error) {
      message.error('U9客户代码维护失败: ' + error);
    }
  };
  const handleObaShopNewCancel: () => void = () => {
    obaShopNewFormRef.current?.resetFields();
    setIsOBAShopNewModalOpen(false);
  };

  const [isShopInfoDrawerOpen, setIsShopInfoDrawerOpen] = useState(false);
  const shopInfoRef = useRef<any>(null);

  return (
    <>
      <div>
        <Space size={24}>
          <Card
            hoverable
            style={{ width: 180, height: 200, borderColor: '#e8e8e8' }}
            onClick={() => setIsOBAShopNewModalOpen(true)}
          >
            <Flex align="center" justify="center" style={{ height: 80 }}>
              <UserOutlined style={{ fontSize: 50 }} />
            </Flex>
            <Meta
              title="U9客户代码维护"
              style={{ textAlign: 'center' }}
              description="U9的客户代码，新增的客户就在这里维护"
            />
          </Card>

          <Card
            hoverable
            style={{ width: 180, height: 200, borderColor: '#e8e8e8' }}
            onClick={() => {
              setIsShopInfoDrawerOpen(true);
              shopInfoRef.current?.fetchShopPage();
            }}
          >
            <Flex align="center" justify="center" style={{ height: 80 }}>
              <ShopOutlined style={{ fontSize: 50 }} />
            </Flex>
            <Meta
              title="店铺信息维护"
              style={{ textAlign: 'center' }}
              description="订货客户不存在时在此新增店铺信息"
            />
          </Card>
        </Space>
      </div>

      {/* 客户代码信息维护 */}
      <Modal
        title="U9客户代码维护"
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isOBAShopNewModalOpen}
        onOk={() => handleObaShopNewSubmit()}
        onCancel={() => handleObaShopNewCancel()}
      >
        <Form
          ref={obaShopNewFormRef}
          name="obaShopNewForm"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          style={{ maxWidth: 600 }}
          initialValues={{ shopId: '', shopName: '' }}
          autoComplete="off"
        >
          <Form.Item<OBAShopNewFieldType>
            label="U9客户ID"
            name="shopId"
            rules={[{ required: true, message: '请输入U9客户ID' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<OBAShopNewFieldType>
            label="U9客户名称"
            name="shopName"
            rules={[{ required: true, message: '请输入U9客户名称' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单店铺维护 */}
      <Drawer
        title="店铺信息维护"
        closable={{ 'aria-label': 'Close Button' }}
        onClose={() => setIsShopInfoDrawerOpen(false)}
        open={isShopInfoDrawerOpen}
        maskClosable={false}
        width={'90vw'}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => shopInfoRef.current?.handleShopInfoAdd()}
            >
              新增店铺
            </Button>
          </Space>
        }
      >
        <ShopInfo ref={shopInfoRef} />
      </Drawer>
    </>
  );
};

export default AuxiliaryOperation;
