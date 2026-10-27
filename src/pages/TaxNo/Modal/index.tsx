import React, { useImperativeHandle, useState } from 'react';
import { Form, Modal, Input, Select } from 'antd';
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
  taxRate?: string;
};

// 税收编码 -> 税率 的对应关系
const TAX_NO_TO_TAX_RATE = [
  { taxNo: '103010401', taxRate: '9' },
  { taxNo: '106051304', taxRate: '13' },
  { taxNo: '107030501', taxRate: '13' },
  { taxNo: '103010402', taxRate: '13' },
];

/**
 * 根据税收编码获取对应税率
 * 未匹配到映射时，保留传入的原值（避免把历史数据直接清空）
 */
const getTaxRateByTaxNo = (
  taxNo?: string,
  originTaxRate?: string | number | null,
): string | null => {
  const matched = TAX_NO_TO_TAX_RATE.find((item) => item.taxNo === taxNo);
  if (matched) {
    return matched.taxRate;
  }
  if (originTaxRate === undefined || originTaxRate === null || originTaxRate === '') {
    return null;
  }
  return `${originTaxRate}`;
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
        // 提交时按税收编码重新计算税率：
        // 即使本次选择的税收编码与原来相同（表单值未变化、不会触发 onChange），
        // 只要点击了「确认修改」，也会按映射关系把税率纠正后重新提交，
        // 用于修复历史数据中税收编码与税率不一致的情况（如编码对应 9%，但库里存的是 13%）
        const taxRate = getTaxRateByTaxNo(values.taxNo, values.taxRate);
        // 调用新增或修改方法
        if (modalType === 'add') {
          props.onOk({
            id: 0, // 新增时ID为0，后端会自动生成
            goodsName: values.goodsName,
            u9No: values.u9No,
            taxNo: values.taxNo,
            taxRate,
          });
        } else {
          props.onEdit({
            id: values.id, // 修改时需要传递ID
            goodsName: values.goodsName,
            u9No: values.u9No,
            taxNo: values.taxNo,
            taxRate,
          });
        }
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

  // 选择税收编码后带出对应税率（选择相同编码时也会执行，用于纠正不一致的税率）
  const handleTaxNoChange = (value?: string) => {
    form.setFieldValue('taxRate', getTaxRateByTaxNo(value));
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
        <Form.Item<FieldType>
          label="商品名称"
          name="goodsName"
          rules={[{ required: false, message: '请输入商品名称' }]}
        >
          <Input placeholder="请输入商品名称" disabled />
        </Form.Item>
        <Form.Item<FieldType>
          label="U9编号"
          name="u9No"
          rules={[{ required: false, message: '请输入U9编号' }]}
        >
          <Input placeholder="请输入U9编号" disabled />
        </Form.Item>
        <Form.Item<FieldType> label="税收编码" name="taxNo">
          {/* 使用 onSelect 而不是只依赖 onChange：
              重新选择与原来相同的税收编码时表单值不变，onChange 不会触发，
              这里用 onSelect 保证税率也能重新联动，
              以便重新提交来修正历史数据中税收编码与税率不一致的问题 */}
          <Select
            placeholder="请选择税收编码"
            onChange={handleTaxNoChange}
            onSelect={handleTaxNoChange}
            options={TAX_NO_TO_TAX_RATE.map((item) => ({
              value: item.taxNo,
              label: `${item.taxNo} (${item.taxRate})`,
            }))}
          />
        </Form.Item>
        <Form.Item<FieldType> label="税率" name="taxRate">
          <Input placeholder="" disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default React.forwardRef<TaxNoModalRef, TaxNoModalProps>(TaxNoModal);
