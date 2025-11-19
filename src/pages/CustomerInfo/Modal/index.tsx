import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Checkbox, Form, Modal, Select } from 'antd';
import type { CheckboxChangeEvent, FormProps } from 'antd';
import { Input } from 'antd';
import type { InvoiceCustomer } from '@/services/invoiceApi';

export interface CustomerInfoModalRef {
  showModal: () => void;
  handleCancel: () => void;
}

interface CustomerInfoModalProps {
  onOk: (data: InvoiceCustomer) => void;
}

type FieldType = {
  name?: string;
  channel?: string;
  // invoiceRequirement?: string;
  invoiceType?: string;
  taxNumber?: string;
};

const CustomerInfoModal = (
  props: CustomerInfoModalProps,
  ref: React.Ref<CustomerInfoModalRef> | undefined,
) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [isPersonal, setIsPersonal] = useState(false);

  const handleIsPersonalChange = (checked: CheckboxChangeEvent) => {
    // console.log('isPersonal', checked.target.checked);
    setIsPersonal(checked.target.checked);
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    // 校验表单
    form
      .validateFields()
      .then((values) => {
        // setIsModalOpen(false);
        // console.log('提交成功', values);
        props.onOk({
          channel: values.channel,
          customerName: values.name,
          tax: values.taxNumber,
          type: values.invoiceType,
        });
      })
      .catch((err) => console.log('校验失败', err));
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  useImperativeHandle(ref, () => ({
    showModal,
    handleCancel,
  }));

  // 弹窗关闭后重置表单
  const handleAfterClose = () => {
    setIsPersonal(false);
    form.resetFields();
  };
  return (
    <Modal
      title="新增客户信息"
      closable={{ 'aria-label': 'Custom Close Button' }}
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认添加"
      afterClose={handleAfterClose}
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
        initialValues={{
          name: '',
          channel: '线上',
          invoiceType: 'pc',
          taxNumber: '',
        }}
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
            style={{ width: 200 }}
            options={[
              { value: '线上', label: '线上' },
              { value: '线下', label: '线下' },
            ]}
          />
        </Form.Item>
        <Form.Item<FieldType> label="发票种类" name="invoiceType">
          <Select
            style={{ width: 200 }}
            options={[
              { value: 'pc', label: '数电普票（电子）' },
              { value: 'bs', label: '数电专票（电子）' },
            ]}
          />
        </Form.Item>
        <Form.Item<FieldType>
          label="税号/身份证号"
          name="taxNumber"
          dependencies={['name']}
          // 如果购买方名称为"个人",则税号不用必填 用dependencies联动name实现
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                // // 包含"个人"时,税号可以为空
                // if (getFieldValue('name')?.includes('个人')) {
                //   return Promise.resolve();
                // }
                // if (value && value.trim() !== '') {
                //   return Promise.resolve();
                // }
                // return Promise.reject(new Error('请输入税号'));

                if (value && value.trim() !== '') {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('请输入税号或身份证号'));
              },
            }),
          ]}
        >
          <Checkbox onChange={handleIsPersonalChange}>个人（个人需要填写身份证号）</Checkbox>
          <Input
            placeholder={isPersonal ? '请输入身份证号' : '请输入税号'}
            style={{ marginTop: 12 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ... existing code ...
export default React.forwardRef<CustomerInfoModalRef, CustomerInfoModalProps>(CustomerInfoModal);
