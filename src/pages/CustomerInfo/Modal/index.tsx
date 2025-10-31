import React, { useImperativeHandle, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import type { FormProps } from 'antd';
import { Input } from 'antd';

export interface CustomerInfoModalRef {
  showModal: () => void;
}

type FieldType = {
  name?: string;
  channel?: string;
  invoiceRequirement?: string;
  invoiceType?: string;
  taxNumber?: string;
};

const CustomerInfoModal = (props: any, ref: React.Ref<CustomerInfoModalRef> | undefined) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    // 校验表单
    form
      .validateFields()
      .then((values) => {
        setIsModalOpen(false);
        console.log('提交成功', values);
      })
      .catch((err) => console.log('校验失败', err));
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  useImperativeHandle(ref, () => ({
    showModal,
  }));

  return (
    <Modal
      title="新增客户信息"
      closable={{ 'aria-label': 'Custom Close Button' }}
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认添加"
      afterClose={() => form.resetFields()}
    >
      <Form
        form={form}
        name="customerInfoForm"
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
        style={{ maxWidth: 600, marginTop: 24 }}
        labelCol={{ span: 8, style: { fontWeight: 'bold' } }}
        wrapperCol={{ span: 16 }}
      >
        <Form.Item<FieldType>
          label="购买方名称"
          name="name"
          rules={[{ required: true, message: '请输入购买方名称' }]}
        >
          <Input placeholder="请输入购买方名称" />
        </Form.Item>
        <Form.Item<FieldType> label="渠道" name="channel">
          <Select
            defaultValue="线上"
            style={{ width: 150 }}
            options={[
              { value: '线上', label: '线上' },
              { value: '线下', label: '线下' },
            ]}
          />
        </Form.Item>
        <Form.Item<FieldType> label="发票要求" name="invoiceRequirement">
          <Select
            defaultValue="数电发票（普通发票）"
            style={{ width: 200 }}
            options={[{ value: '数电发票（普通发票）', label: '数电发票（普通发票）' }]}
          />
        </Form.Item>
        <Form.Item<FieldType> label="发票种类" name="invoiceType">
          <Select
            defaultValue="普票"
            style={{ width: 150 }}
            options={[
              { value: '普票', label: '普票' },
              { value: '专票', label: '专票' },
            ]}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="税号"
          name="taxNumber"
          rules={[{ required: true, message: '请输入税号' }]}
        >
          <Input placeholder="请输入税号" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default React.forwardRef<CustomerInfoModalRef>(CustomerInfoModal);
