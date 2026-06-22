import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Checkbox, Form, Modal, Select, Tag, Row, Col } from 'antd';
import type { CheckboxChangeEvent, FormProps } from 'antd';
import { Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { InvoiceCustomer } from '@/services/invoiceApi';

export interface CustomerInfoModalRef {
  showModal: (record?: DataType) => void;
  handleCancel: () => void;
}

export interface DataType {
  id: number;
  channel: string;
  customerName: string;
  tax: string;
  type: string;
  validationStatus: number;
  validationMessage: string | null;
}

interface CustomerInfoModalProps {
  onOk: (data: InvoiceCustomer, id?: number) => void;
}

type FieldType = {
  name?: string;
  channel?: string;
  // invoiceRequirement?: string;
  invoiceType?: string;
  taxNumber?: string;
  validationStatus?: number;
  validationMessageTax?: string;
  validationMessageType?: string;
};

const CustomerInfoModal = (
  props: CustomerInfoModalProps,
  ref: React.Ref<CustomerInfoModalRef> | undefined,
) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [isPersonal, setIsPersonal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataType | null>(null);

  const handleIsPersonalChange = (checked: CheckboxChangeEvent) => {
    // console.log('isPersonal', checked.target.checked);
    setIsPersonal(checked.target.checked);
  };

  const showModal = (record?: DataType) => {
    setEditingRecord(record || null);
    if (record) {
      let validationMessageTax = '';
      let validationMessageType = '';

      if (record.validationMessage) {
        try {
          const parsedMsg = typeof record.validationMessage === 'string'
            ? JSON.parse(record.validationMessage)
            : record.validationMessage;
          validationMessageTax = parsedMsg.taxNumber !== undefined ? parsedMsg.taxNumber : '';
          validationMessageType = parsedMsg.invoiceType !== undefined ? parsedMsg.invoiceType : '';
        } catch (e) {
          // 解析失败则不设置
        }
      }

      form.setFieldsValue({
        name: record.customerName,
        channel: record.channel,
        invoiceType: record.type,
        taxNumber: record.tax,
        validationStatus: record.validationStatus,
        validationMessageTax,
        validationMessageType,
      });
    } else {
      form.setFieldsValue({
        name: '',
        channel: '线上',
        invoiceType: 'pc',
        taxNumber: '',
        validationStatus: 0,
        validationMessageTax: '',
        validationMessageType: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOk = () => {
    // 校验表单
    form
      .validateFields()
      .then((values) => {
        // 构建 validationMessage，都为空时传空字符串
        let validationMessage = '';
        const hasTax = values.validationMessageTax && values.validationMessageTax.trim() !== '';
        const hasType = values.validationMessageType && values.validationMessageType.trim() !== '';

        if (hasTax || hasType) {
          const msgObj: any = {};
          msgObj.taxNumber = values.validationMessageTax || '';
          msgObj.invoiceType = values.validationMessageType || '';
          validationMessage = JSON.stringify(msgObj);
        }

        // setIsModalOpen(false);
        // console.log('提交成功', values);
        props.onOk(
          {
            channel: values.channel,
            customerName: values.name,
            tax: values.taxNumber,
            type: values.invoiceType,
            validationStatus: values.validationStatus || 0,
            validationMessage,
          },
          editingRecord?.id
        );
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
      title={editingRecord ? "编辑客户信息" : "新增客户信息"}
      closable={{ 'aria-label': 'Custom Close Button' }}
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={editingRecord ? "确认修改" : "确认添加"}
      afterClose={handleAfterClose}
    >
      <Form
        form={form}
        name="customerInfoForm"
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
        style={{ maxWidth: 600, marginTop: 24 }}
        labelCol={{ span: 24, style: { fontWeight: 'bold' } }}
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
        {/* <Checkbox style={{ marginTop: 8, marginBottom: 8 }} onChange={handleIsPersonalChange}>
          个人（个人需要填写身份证号）
        </Checkbox> */}
        <Form.Item<FieldType>
          label="税号/身份证号（个人需要填写身份证号）"
          name="taxNumber"
          // dependencies={['name']}
          // 如果购买方名称为"个人",则税号不用必填 用dependencies联动name实现
          rules={[
            // ({ getFieldValue }) => ({
            //   validator(_, value) {
            //     // // 包含"个人"时,税号可以为空
            //     // if (getFieldValue('name')?.includes('个人')) {
            //     //   return Promise.resolve();
            //     // }
            //     // if (value && value.trim() !== '') {
            //     //   return Promise.resolve();
            //     // }
            //     // return Promise.reject(new Error('请输入税号'));

            //     if (value && value.trim() !== '') {
            //       return Promise.resolve();
            //     }
            //     return Promise.reject(new Error('请输入税号或身份证号'));
            //   },
            // }),
            { required: true, message: '请输入税号或身份证号' },
          ]}
        >
          <Input placeholder={'请输入税号或身份证号'} style={{ marginTop: 12 }} />
        </Form.Item>

        <Form.Item<FieldType> label="验证状态" name="validationStatus">
          <Select
            style={{ width: 200 }}
            options={[
              { value: 0, label: '未校验' },
              { value: 1, label: '校验通过' },
              { value: 2, label: '校验失败' },
            ]}
          />
        </Form.Item>

        <Form.Item<FieldType> label="备注 - 税号/身份证号" name="validationMessageTax">
          <Input.TextArea placeholder="请输入正确的税号/身份证号" rows={2} />
        </Form.Item>

        <Form.Item<FieldType> label="备注 - 发票种类" name="validationMessageType">
          <Input.TextArea placeholder="请输入正确的发票种类" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ... existing code ...
export default React.forwardRef<CustomerInfoModalRef, CustomerInfoModalProps>(CustomerInfoModal);
