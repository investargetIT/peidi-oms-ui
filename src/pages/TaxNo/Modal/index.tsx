import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Form, Modal, Input, InputNumber } from 'antd';
import type { TaxNoItem } from '../index';
import type { InvoiceTaxNo } from '@/services/invoiceApi';

export interface TaxNoModalRef {
  showModal: (type: 'add' | 'edit', record?: InvoiceTaxNo) => void;
  handleCancel: () => void;
}

interface TaxNoModalProps {
  onOk: (data: InvoiceTaxNo) => void;
  onEdit: (record: InvoiceTaxNo) => void;
}

type FieldType = {
  id?: number;
  goodsName?: string;
  u9No?: string;
  taxNo?: string;
  taxRate?: number;
};

const TaxNoModal = (props: TaxNoModalProps, ref: React.Ref<TaxNoModalRef> | undefined) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 判断表单类型，新增或修改
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [form] = Form.useForm();

  const showModal = (type: 'add' | 'edit', record?: InvoiceTaxNo) => {
    setModalType(type);
    setIsModalOpen(true);
    // 如果是修改，设置初始值
    if (type === 'edit' && record) {
      //   console.log('修改税收编码', record);
      form.setFieldsValue(record);
    }
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        // 调用新增或修改方法
        modalType === 'add'
          ? props.onOk({
              id: 0, // 新增时ID为0，后端会自动生成
              goodsName: values.goodsName,
              u9No: values.u9No,
              taxNo: values.taxNo,
              taxRate: values.taxRate || null,
            })
          : props.onEdit({
              id: values.id, // 修改时需要传递ID
              goodsName: values.goodsName,
              u9No: values.u9No,
              taxNo: values.taxNo,
              taxRate: values.taxRate || null,
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

  const handleAfterClose = () => {
    form.resetFields();
  };

  return (
    <Modal
      title={modalType === 'add' ? '新增税收编码' : '修改税收编码'}
      closable={{ 'aria-label': 'Custom Close Button' }}
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={modalType === 'add' ? '确认添加' : '确认修改'}
      afterClose={handleAfterClose}
    >
      <Form
        form={form}
        name="taxNoForm"
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
        style={{ maxWidth: 600, marginTop: 24 }}
        labelCol={{ span: 24, style: { fontWeight: 'bold' } }}
        wrapperCol={{ span: 16 }}
        initialValues={{
          id: undefined,
          goodsName: '',
          u9No: '',
          taxNo: '',
          taxRate: undefined,
        }}
      >
        <Form.Item<FieldType> name="id" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item<FieldType> name="taxRate" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item<FieldType>
          label="商品名称"
          name="goodsName"
          rules={[{ required: false, message: '请输入商品名称' }]}
        >
          <Input placeholder="请输入商品名称" disabled/>
        </Form.Item>
        <Form.Item<FieldType>
          label="U9编号"
          name="u9No"
          rules={[{ required: false, message: '请输入U9编号' }]}
        >
          <Input placeholder="请输入U9编号" disabled/>
        </Form.Item>
        <Form.Item<FieldType>
          label="税收编码"
          name="taxNo"
          rules={[{ required: true, message: '请输入税收编码' }]}
        >
          <Input placeholder="请输入税收编码" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default React.forwardRef<TaxNoModalRef, TaxNoModalProps>(TaxNoModal);
