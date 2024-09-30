import {
    ProFormDateTimePicker,
    ProFormDatePicker,
    DatePicker,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    StepsForm,
  } from '@ant-design/pro-components';
  import { FormattedMessage, useIntl } from '@umijs/max';
  import { Modal } from 'antd';
  import React from 'react';
  
  export type FormValueType = {
    id?: string;
    code?: string;
    name?: string;
    province?: string;
    city?: string;
    district?: string;
    address?: string;
    contact?: string;
    telephone?: string;
    status?: string;
    brand?: string;
    attribute?: string;
    invoiceType?: string;
    invoiceTitle?: string;
    invoiceTitleTin?: string;
    invoiceTitleAddress?: string;
    invoiceTitleBank?: string;
    invoiceTitleBankAccount?: string;
    invoiceTitleTelephone?: string;
    invoiceReceiver?: string;
    invoiceReceiverTel?: string;
    invoiceReceiverAddress?: string;
    invoiceReceiverEmail?: string;
    remark?: string;
  } & Partial<API.CustomerListItem>;
  
  export type UpdateFormProps = {
    onCancel: (flag?: boolean, formVals?: FormValueType) => void;
    onSubmit: (values: FormValueType) => Promise<void>;
    updateModalOpen: boolean;
    values: Partial<API.CustomerListItem>;
  };
  
  const UpdateForm: React.FC<UpdateFormProps> = (props) => {
    const intl = useIntl();
    return (
      <StepsForm
        stepsProps={{
          size: 'small',
        }}
        stepsFormRender={(dom, submitter) => {
          return (
            <Modal
              width={640}
              styles={{
                body: {
                  padding: '32px 40px 48px',
                },
              }}
              destroyOnClose
              title={intl.formatMessage({
                id: 'pages.searchcustomer.updateForm.editInfo',
                defaultMessage: '编辑信息',
              })}
              open={props.updateModalOpen}
              footer={submitter}
              onCancel={() => {
                props.onCancel();
              }}
            >
              {dom}
            </Modal>
          );
        }}
        onFinish={props.onSubmit}
      >
        <StepsForm.StepForm
          initialValues={{
            id: props.values.id,
            code: props.values.code,
            name: props.values.name,
            province: props.values.province,
            city: props.values.city,
            district: props.values.district,
          }}
          title={intl.formatMessage({
            id: 'pages.searchcustomer.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="id"
            // readonly
            disabled
            hidden={true}
            label={intl.formatMessage({
              id: 'pages.searchcustomer.id',
              defaultMessage: 'ID',
              
            })}
            width="md"
          />
          <ProFormText
            name="code"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.code',
              defaultMessage: '编码',
            })}
            width="md"
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.code"
                    defaultMessage="请输入编码！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="name"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.name',
              defaultMessage: '名称',
            })}
            width="md"
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.name"
                    defaultMessage="请输入名称！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="province"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.province',
              defaultMessage: '省',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.province"
                    defaultMessage="请输入省！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="city"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.city',
              defaultMessage: '市',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.city"
                    defaultMessage="请输入市！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="district"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.district',
              defaultMessage: '区',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.district"
                    defaultMessage="请输入区！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            address: props.values.address,
            contact: props.values.contact,
            telephone: props.values.telephone,
            status: props.values.status,
            brand: props.values.brand,
          }}
          title={intl.formatMessage({
            id: 'pages.searchcustomer.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="address"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.address',
              defaultMessage: '地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.address"
                    defaultMessage="请输入地址！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="contact"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.contact',
              defaultMessage: '联系人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.contact"
                    defaultMessage="请输入联系人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="telephone"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.telephone',
              defaultMessage: '联系电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.telephone"
                    defaultMessage="请输入联系电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="status"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.status',
              defaultMessage: '状态',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.status"
                    defaultMessage="请输入状态！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="brand"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.brand',
              defaultMessage: '品牌',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.brand"
                    defaultMessage="请输入品牌！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            attribute: props.values.attribute,
            invoiceType: props.values.invoiceType,
            invoiceTitle: props.values.invoiceTitle,
            invoiceTitleTin: props.values.invoiceTitleTin,
            invoiceTitleAddress: props.values.invoiceTitleAddress,
          }}
          title={intl.formatMessage({
            id: 'pages.searchcustomer.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="attribute"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.attribute',
              defaultMessage: '联系人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.attribute"
                    defaultMessage="请输入联系人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceType"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceType',
              defaultMessage: '发票类型',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceType"
                    defaultMessage="请输入发票类型！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitle"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitle',
              defaultMessage: '发票抬头',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitle"
                    defaultMessage="请输入发票抬头！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleTin"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleTin',
              defaultMessage: '纳税人识别号',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleTin"
                    defaultMessage="请输入纳税人识别号！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleAddress"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleAddress',
              defaultMessage: '发票地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleAddress"
                    defaultMessage="请输入发票地址！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            invoiceTitleBank: props.values.invoiceTitleBank,
            invoiceTitleBankAccount: props.values.invoiceTitleBankAccount,
            invoiceTitleTelephone: props.values.invoiceTitleTelephone,
            invoiceReceiver: props.values.invoiceReceiver,
            invoiceReceiverTel: props.values.invoiceReceiverTel,
          }}
          title={intl.formatMessage({
            id: 'pages.searchcustomer.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="invoiceTitleBank"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleBank',
              defaultMessage: '开户行',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleBank"
                    defaultMessage="请输入开户行！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleBankAccount"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleBankAccount',
              defaultMessage: '银行账号',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleBankAccount"
                    defaultMessage="请输入银行账号！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceTitleTelephone"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceTitleTelephone',
              defaultMessage: '发票电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceTitleTelephone"
                    defaultMessage="请输入发票电话！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiver"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiver',
              defaultMessage: '收票人',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiver"
                    defaultMessage="请输入收票人！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiverTel"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverTel',
              defaultMessage: '收票人联系电话',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverTel"
                    defaultMessage="请输入收票人联系电话！"
                  />
                ),
              },
            ]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
          initialValues={{
            invoiceReceiverAddress: props.values.invoiceReceiverAddress,
            invoiceReceiverEmail: props.values.invoiceReceiverEmail,
            remark: props.values.remark,
          }}
          title={intl.formatMessage({
            id: 'pages.searchcustomer.updateForm.basicConfig',
            defaultMessage: '基本信息',
          })}
        >
          <ProFormText
            name="invoiceReceiverAddress"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverAddress',
              defaultMessage: '收票地址',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverAddress"
                    defaultMessage="请输入收票地址！"
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="invoiceReceiverEmail"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.invoiceReceiverEmail',
              defaultMessage: '收票人邮箱',
            })}
            width="md"
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.invoiceReceiverEmail"
                    defaultMessage="请输入收票人邮箱！"
                  />
                ),
              },
            ]}
          />
          <ProFormTextArea
            name="remark"
            width="md"
            label={intl.formatMessage({
              id: 'pages.searchcustomer.remark',
              defaultMessage: '备注',
            })}
            // placeholder={intl.formatMessage({
            //   id: 'pages.searchcustomer.updateForm.remark',
            //   defaultMessage: '请输入备注！',
            // })}
            rules={[
              {
                // required: true,
                message: (
                  <FormattedMessage
                    id="pages.searchcustomer.remark"
                    defaultMessage="请输入备注！"
                  />
                ),
                // min: 5,
              },
            ]}
          />
        </StepsForm.StepForm>
      </StepsForm>
    );
  };
  
  export default UpdateForm;
  